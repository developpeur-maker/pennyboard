-- Script SQL pour créer la table payfit_salaries sur Neon
-- À exécuter directement dans l'éditeur SQL de Neon

-- Créer la table payfit_salaries
CREATE TABLE IF NOT EXISTS payfit_salaries (
  id SERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL, -- Format: 2025-01
  year INTEGER NOT NULL,
  month_number INTEGER NOT NULL,
  
  -- Données brutes de Payfit
  raw_accounting_data JSONB NOT NULL, -- Données brutes de l'API accounting-v2
  
  -- Données traitées par collaborateur
  employees_data JSONB NOT NULL, -- Tableau des collaborateurs avec salaires et cotisations
  
  -- Totaux calculés
  total_salaries DECIMAL(15, 2) DEFAULT 0,
  total_contributions DECIMAL(15, 2) DEFAULT 0,
  total_cost DECIMAL(15, 2) DEFAULT 0,
  employees_count INTEGER DEFAULT 0,
  
  -- Métadonnées
  sync_version INTEGER DEFAULT 1,
  is_current_month BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(month)
);

-- Créer les index pour les performances
CREATE INDEX IF NOT EXISTS idx_payfit_salaries_month ON payfit_salaries(month);
CREATE INDEX IF NOT EXISTS idx_payfit_salaries_year ON payfit_salaries(year);
CREATE INDEX IF NOT EXISTS idx_payfit_salaries_current ON payfit_salaries(is_current_month);
CREATE INDEX IF NOT EXISTS idx_payfit_salaries_updated_at ON payfit_salaries(updated_at);

-- Index GIN pour les colonnes JSONB (recherche rapide dans les données JSON)
CREATE INDEX IF NOT EXISTS idx_payfit_salaries_raw_data_gin ON payfit_salaries USING GIN (raw_accounting_data);
CREATE INDEX IF NOT EXISTS idx_payfit_salaries_employees_gin ON payfit_salaries USING GIN (employees_data);

-- Créer une fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_payfit_salaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Créer le trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS update_payfit_salaries_updated_at ON payfit_salaries;
CREATE TRIGGER update_payfit_salaries_updated_at 
  BEFORE UPDATE ON payfit_salaries 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_payfit_salaries_updated_at();

