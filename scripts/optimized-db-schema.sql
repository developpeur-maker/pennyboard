-- Structure de base de données optimisée pour Pennylane
-- Basée sur l'analyse des interfaces TypeScript existantes

-- Table principale pour les données mensuelles
CREATE TABLE IF NOT EXISTS monthly_data (
  id SERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL UNIQUE, -- Format: 2025-09
  year INTEGER NOT NULL,            -- Année pour faciliter les requêtes
  month_number INTEGER NOT NULL,   -- Mois (1-12) pour faciliter les requêtes
  
  -- KPIs principaux (colonnes dédiées pour les requêtes rapides)
  ventes_706 DECIMAL(15,2),         -- Ventes compte 706
  chiffre_affaires DECIMAL(15,2),   -- CA Net
  total_produits_exploitation DECIMAL(15,2), -- Total produits
  charges DECIMAL(15,2),            -- Total charges
  resultat_net DECIMAL(15,2),       -- Résultat net
  tresorerie_calculee DECIMAL(15,2), -- Trésorerie calculée
  
  -- Données détaillées (JSONB pour la flexibilité)
  kpis JSONB,                       -- KPIs complets avec projections
  trial_balance JSONB,              -- Trial balance complet
  charges_breakdown JSONB,          -- Détail des charges par classe
  revenus_breakdown JSONB,          -- Détail des revenus par classe
  tresorerie_breakdown JSONB,       -- Détail de la trésorerie par compte
  
  -- Métadonnées
  currency VARCHAR(3) DEFAULT 'EUR',
  data_source VARCHAR(50) DEFAULT 'pennylane',
  is_current_month BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour les logs de synchronisation
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL,   -- 'monthly', 'yearly', 'full'
  status VARCHAR(20) NOT NULL,      -- 'success', 'error', 'pending'
  message TEXT,
  data_size INTEGER,                -- Nombre d'éléments synchronisés
  duration_ms INTEGER,              -- Durée de la synchronisation
  month VARCHAR(7),                 -- Mois synchronisé (si applicable)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour les comptes comptables (cache)
CREATE TABLE IF NOT EXISTS accounts_cache (
  id SERIAL PRIMARY KEY,
  account_number VARCHAR(20) NOT NULL,
  account_label VARCHAR(255),
  account_class VARCHAR(10),         -- Classe comptable (60, 70, 512, etc.)
  account_type VARCHAR(50),         -- Type de compte
  is_active BOOLEAN DEFAULT TRUE,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(account_number)
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_monthly_data_month ON monthly_data(month);
CREATE INDEX IF NOT EXISTS idx_monthly_data_year ON monthly_data(year);
CREATE INDEX IF NOT EXISTS idx_monthly_data_month_number ON monthly_data(month_number);
CREATE INDEX IF NOT EXISTS idx_monthly_data_updated_at ON monthly_data(updated_at);
CREATE INDEX IF NOT EXISTS idx_monthly_data_is_current ON monthly_data(is_current_month);

CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_accounts_number ON accounts_cache(account_number);
CREATE INDEX IF NOT EXISTS idx_accounts_class ON accounts_cache(account_class);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts_cache(account_type);

-- Index GIN pour les colonnes JSONB (recherche rapide dans les données JSON)
CREATE INDEX IF NOT EXISTS idx_monthly_data_kpis_gin ON monthly_data USING GIN (kpis);
CREATE INDEX IF NOT EXISTS idx_monthly_data_trial_balance_gin ON monthly_data USING GIN (trial_balance);
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

-- Trigger pour monthly_data
CREATE TRIGGER update_monthly_data_updated_at 
  BEFORE UPDATE ON monthly_data 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Vue pour les KPIs actuels (facilite les requêtes)
CREATE OR REPLACE VIEW current_kpis AS
SELECT 
  month,
  ventes_706,
  chiffre_affaires,
  total_produits_exploitation,
  charges,
  resultat_net,
  tresorerie_calculee,
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
  ventes_706,
  chiffre_affaires,
  total_produits_exploitation,
  charges,
  resultat_net,
  tresorerie_calculee,
  updated_at
FROM monthly_data 
ORDER BY year DESC, month_number DESC;
