-- Structure de table proposée pour les snapshots de ventes
-- À adapter selon les données exactes de Pipedrive

-- Table principale pour stocker les snapshots quotidiens et les CA réels
CREATE TABLE IF NOT EXISTS sales_snapshots (
  id SERIAL PRIMARY KEY,
  
  -- Identification du commercial
  commercial_id VARCHAR(255), -- ID du commercial dans Pipedrive (peut être NULL si on utilise seulement le nom)
  commercial_name VARCHAR(255) NOT NULL, -- Nom du commercial
  
  -- Date du snapshot
  date DATE NOT NULL, -- Date du snapshot (lundi à samedi)
  
  -- Données de CA
  ca_snapshot DECIMAL(15, 2) NOT NULL DEFAULT 0, -- CA snapshot (jamais écrasé, créé une fois)
  ca_reel DECIMAL(15, 2) DEFAULT 0, -- CA réel (mis à jour régulièrement lors des comparaisons)
  
  -- Métadonnées
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Date de création du snapshot (automatique chaque soir)
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Date de dernière mise à jour du CA réel
  
  -- Contrainte d'unicité : un seul snapshot par commercial et par date
  UNIQUE(commercial_name, date)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_sales_snapshots_commercial ON sales_snapshots(commercial_name);
CREATE INDEX IF NOT EXISTS idx_sales_snapshots_date ON sales_snapshots(date);
CREATE INDEX IF NOT EXISTS idx_sales_snapshots_commercial_date ON sales_snapshots(commercial_name, date);

-- Index composite pour les requêtes de période
CREATE INDEX IF NOT EXISTS idx_sales_snapshots_date_range ON sales_snapshots(date DESC);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_sales_snapshots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS trigger_update_sales_snapshots_updated_at ON sales_snapshots;
CREATE TRIGGER trigger_update_sales_snapshots_updated_at
    BEFORE UPDATE ON sales_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_snapshots_updated_at();

-- Commentaires pour la documentation
COMMENT ON TABLE sales_snapshots IS 'Stocke les snapshots quotidiens de CA par commercial et les CA réels mis à jour régulièrement';
COMMENT ON COLUMN sales_snapshots.ca_snapshot IS 'CA snapshot créé automatiquement chaque soir, jamais écrasé';
COMMENT ON COLUMN sales_snapshots.ca_reel IS 'CA réel mis à jour 1-2 fois par semaine lors des comparaisons';
