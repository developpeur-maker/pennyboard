-- Structure hybride : Données brutes + KPIs calculés
-- Meilleur des deux mondes

-- Table pour les données brutes de Pennylane
CREATE TABLE IF NOT EXISTS raw_pennylane_data (
  id SERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL,
  year INTEGER NOT NULL,
  month_number INTEGER NOT NULL,
  data_type VARCHAR(50) NOT NULL, -- 'trial_balance', 'accounts', 'ledger_entries'
  raw_data JSONB NOT NULL,        -- Données brutes de l'API
  data_size INTEGER,              -- Nombre d'éléments
  api_endpoint VARCHAR(255),      -- Endpoint appelé
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(month, data_type)
);

-- Table pour les KPIs calculés (cache pour performance)
CREATE TABLE IF NOT EXISTS calculated_kpis (
  id SERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL UNIQUE,
  year INTEGER NOT NULL,
  month_number INTEGER NOT NULL,
  
  -- KPIs principaux (colonnes dédiées pour performance)
  ventes_706 DECIMAL(15,2),
  chiffre_affaires DECIMAL(15,2),
  total_produits_exploitation DECIMAL(15,2),
  charges DECIMAL(15,2),
  resultat_net DECIMAL(15,2),
  tresorerie_calculee DECIMAL(15,2),
  
  -- KPIs secondaires (JSONB pour flexibilité)
  detailed_kpis JSONB,            -- KPIs détaillés et projections
  breakdowns JSONB,               -- Détails par classe comptable
  
  -- Métadonnées
  calculation_version VARCHAR(20) DEFAULT '1.0',
  is_current_month BOOLEAN DEFAULT FALSE,
  currency VARCHAR(3) DEFAULT 'EUR',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour les logs de synchronisation
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  message TEXT,
  data_sources TEXT[],            -- Types de données synchronisées
  records_processed INTEGER,
  duration_ms INTEGER,
  month VARCHAR(7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour le cache des comptes comptables
CREATE TABLE IF NOT EXISTS accounts_cache (
  id SERIAL PRIMARY KEY,
  account_number VARCHAR(20) NOT NULL UNIQUE,
  account_label VARCHAR(255),
  account_class VARCHAR(10),
  account_type VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  last_seen_month VARCHAR(7),     -- Dernier mois où le compte a été vu
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_raw_data_month ON raw_pennylane_data(month);
CREATE INDEX IF NOT EXISTS idx_raw_data_type ON raw_pennylane_data(data_type);
CREATE INDEX IF NOT EXISTS idx_raw_data_created_at ON raw_pennylane_data(created_at);

CREATE INDEX IF NOT EXISTS idx_kpis_month ON calculated_kpis(month);
CREATE INDEX IF NOT EXISTS idx_kpis_year ON calculated_kpis(year);
CREATE INDEX IF NOT EXISTS idx_kpis_current ON calculated_kpis(is_current_month);

CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);

CREATE INDEX IF NOT EXISTS idx_accounts_number ON accounts_cache(account_number);
CREATE INDEX IF NOT EXISTS idx_accounts_class ON accounts_cache(account_class);

-- Index GIN pour les colonnes JSONB
CREATE INDEX IF NOT EXISTS idx_raw_data_gin ON raw_pennylane_data USING GIN (raw_data);
CREATE INDEX IF NOT EXISTS idx_kpis_detailed_gin ON calculated_kpis USING GIN (detailed_kpis);
CREATE INDEX IF NOT EXISTS idx_kpis_breakdowns_gin ON calculated_kpis USING GIN (breakdowns);

-- Fonction pour recalculer les KPIs depuis les données brutes
CREATE OR REPLACE FUNCTION recalculate_kpis(target_month VARCHAR(7))
RETURNS VOID AS $$
BEGIN
  -- Supprimer les KPIs existants pour ce mois
  DELETE FROM calculated_kpis WHERE month = target_month;
  
  -- Recalculer depuis les données brutes
  -- (Logique de calcul à implémenter)
  
  -- Insérer les nouveaux KPIs calculés
  -- (Insertion à implémenter)
END;
$$ LANGUAGE plpgsql;

-- Vue pour les KPIs actuels
CREATE OR REPLACE VIEW current_kpis AS
SELECT 
  month,
  ventes_706,
  chiffre_affaires,
  total_produits_exploitation,
  charges,
  resultat_net,
  tresorerie_calculee,
  detailed_kpis,
  updated_at
FROM calculated_kpis 
WHERE is_current_month = TRUE
ORDER BY updated_at DESC 
LIMIT 1;

-- Vue pour l'historique des KPIs
CREATE OR REPLACE VIEW kpis_history AS
SELECT 
  month,
  year,
  month_number,
  ventes_706,
  chiffre_affaires,
  total_produits_exploitation,
  charges,
  resultat_net,
  tresorerie_calculee,
  updated_at
FROM calculated_kpis 
ORDER BY year DESC, month_number DESC;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_calculated_kpis_updated_at 
  BEFORE UPDATE ON calculated_kpis 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_cache_updated_at 
  BEFORE UPDATE ON accounts_cache 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
