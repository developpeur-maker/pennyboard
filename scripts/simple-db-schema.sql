-- Structure simplifiée pour synchronisation périodique
-- Données écrasées à chaque synchronisation

-- Table principale pour les données mensuelles (écrasée à chaque sync)
CREATE TABLE IF NOT EXISTS monthly_data (
  id SERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL UNIQUE, -- Format: 2025-09
  year INTEGER NOT NULL,
  month_number INTEGER NOT NULL,
  
  -- Données brutes de Pennylane (écrasées à chaque sync)
  trial_balance JSONB NOT NULL,     -- Trial balance complet
  accounts_data JSONB,              -- Données des comptes
  ledger_entries JSONB,             -- Écritures comptables
  
  -- KPIs calculés (recalculés à chaque sync)
  kpis JSONB NOT NULL,              -- Tous les KPIs calculés
  charges_breakdown JSONB,          -- Détail des charges
  revenus_breakdown JSONB,          -- Détail des revenus
  tresorerie_breakdown JSONB,        -- Détail de la trésorerie
  
  -- Métadonnées
  sync_version INTEGER DEFAULT 1,   -- Version de la synchronisation
  is_current_month BOOLEAN DEFAULT FALSE,
  currency VARCHAR(3) DEFAULT 'EUR',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour les logs de synchronisation (historique des syncs)
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL,   -- 'full', 'monthly', 'incremental'
  status VARCHAR(20) NOT NULL,       -- 'success', 'error', 'pending'
  message TEXT,
  months_synced TEXT[],             -- Mois synchronisés
  records_processed INTEGER,        -- Nombre d'enregistrements traités
  duration_ms INTEGER,              -- Durée de la synchronisation
  api_calls_count INTEGER,          -- Nombre d'appels API
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour le cache des comptes comptables (mis à jour à chaque sync)
CREATE TABLE IF NOT EXISTS accounts_cache (
  id SERIAL PRIMARY KEY,
  account_number VARCHAR(20) NOT NULL UNIQUE,
  account_label VARCHAR(255),
  account_class VARCHAR(10),         -- Classe comptable (60, 70, 512, etc.)
  account_type VARCHAR(50),         -- Type de compte
  is_active BOOLEAN DEFAULT TRUE,
  last_seen_month VARCHAR(7),      -- Dernier mois où le compte a été vu
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_monthly_data_month ON monthly_data(month);
CREATE INDEX IF NOT EXISTS idx_monthly_data_year ON monthly_data(year);
CREATE INDEX IF NOT EXISTS idx_monthly_data_current ON monthly_data(is_current_month);
CREATE INDEX IF NOT EXISTS idx_monthly_data_updated_at ON monthly_data(updated_at);

CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_accounts_number ON accounts_cache(account_number);
CREATE INDEX IF NOT EXISTS idx_accounts_class ON accounts_cache(account_class);

-- Index GIN pour les colonnes JSONB (recherche rapide dans les données JSON)
CREATE INDEX IF NOT EXISTS idx_monthly_data_trial_balance_gin ON monthly_data USING GIN (trial_balance);
CREATE INDEX IF NOT EXISTS idx_monthly_data_kpis_gin ON monthly_data USING GIN (kpis);
CREATE INDEX IF NOT EXISTS idx_monthly_data_charges_breakdown_gin ON monthly_data USING GIN (charges_breakdown);
CREATE INDEX IF NOT EXISTS idx_monthly_data_revenus_breakdown_gin ON monthly_data USING GIN (revenus_breakdown);
CREATE INDEX IF NOT EXISTS idx_monthly_data_tresorerie_breakdown_gin ON monthly_data USING GIN (tresorerie_breakdown);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour mettre à jour updated_at
CREATE TRIGGER update_monthly_data_updated_at 
  BEFORE UPDATE ON monthly_data 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_cache_updated_at 
  BEFORE UPDATE ON accounts_cache 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Vue pour les KPIs actuels (facilite les requêtes)
CREATE OR REPLACE VIEW current_kpis AS
SELECT 
  month,
  year,
  month_number,
  kpis,
  charges_breakdown,
  revenus_breakdown,
  tresorerie_breakdown,
  updated_at
FROM monthly_data 
WHERE is_current_month = TRUE
ORDER BY updated_at DESC 
LIMIT 1;

-- Vue pour l'historique des KPIs
CREATE OR REPLACE VIEW kpis_history AS
SELECT 
  month,
  year,
  month_number,
  kpis,
  updated_at
FROM monthly_data 
ORDER BY year DESC, month_number DESC;

-- Fonction pour nettoyer les anciens logs (garder seulement les 30 derniers jours)
CREATE OR REPLACE FUNCTION cleanup_old_sync_logs()
RETURNS VOID AS $$
BEGIN
  DELETE FROM sync_logs 
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour marquer le mois actuel
CREATE OR REPLACE FUNCTION set_current_month(target_month VARCHAR(7))
RETURNS VOID AS $$
BEGIN
  -- Désactiver tous les mois actuels
  UPDATE monthly_data SET is_current_month = FALSE;
  
  -- Activer le mois ciblé
  UPDATE monthly_data 
  SET is_current_month = TRUE 
  WHERE month = target_month;
END;
$$ LANGUAGE plpgsql;
