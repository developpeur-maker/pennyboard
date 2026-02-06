-- Migration Neon : tout ce qu'il faut pour que la synchro Payfit fonctionne
-- À exécuter dans l'éditeur SQL Neon si la synchro Payfit échoue (tables ou colonnes manquantes)

-- ========== 1. Table payfit_salaries (si pas déjà créée) ==========
CREATE TABLE IF NOT EXISTS payfit_salaries (
  id SERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL,
  year INTEGER NOT NULL,
  month_number INTEGER NOT NULL,
  raw_accounting_data JSONB NOT NULL,
  employees_data JSONB NOT NULL,
  total_salaries DECIMAL(15, 2) DEFAULT 0,
  total_contributions DECIMAL(15, 2) DEFAULT 0,
  total_cost DECIMAL(15, 2) DEFAULT 0,
  employees_count INTEGER DEFAULT 0,
  sync_version INTEGER DEFAULT 1,
  is_current_month BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(month)
);

CREATE INDEX IF NOT EXISTS idx_payfit_salaries_month ON payfit_salaries(month);
CREATE INDEX IF NOT EXISTS idx_payfit_salaries_year ON payfit_salaries(year);
CREATE INDEX IF NOT EXISTS idx_payfit_salaries_current ON payfit_salaries(is_current_month);
CREATE INDEX IF NOT EXISTS idx_payfit_salaries_updated_at ON payfit_salaries(updated_at);
CREATE INDEX IF NOT EXISTS idx_payfit_salaries_raw_data_gin ON payfit_salaries USING GIN (raw_accounting_data);
CREATE INDEX IF NOT EXISTS idx_payfit_salaries_employees_gin ON payfit_salaries USING GIN (employees_data);

CREATE OR REPLACE FUNCTION update_payfit_salaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payfit_salaries_updated_at ON payfit_salaries;
CREATE TRIGGER update_payfit_salaries_updated_at
  BEFORE UPDATE ON payfit_salaries
  FOR EACH ROW
  EXECUTE PROCEDURE update_payfit_salaries_updated_at();


-- ========== 2. Table payfit_meal_vouchers (meal vouchers API - tous les champs) ==========
CREATE TABLE IF NOT EXISTS payfit_meal_vouchers (
  id SERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL,
  collaborator_id VARCHAR(255) NOT NULL,
  vouchers_count INTEGER NOT NULL DEFAULT 0,
  voucher_amount DECIMAL(10, 2),
  day_off_eligibility BOOLEAN,
  voucher_company_part_amount DECIMAL(10, 2),
  voucher_employee_part_amount DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(month, collaborator_id)
);

CREATE INDEX IF NOT EXISTS idx_payfit_meal_vouchers_month ON payfit_meal_vouchers(month);
CREATE INDEX IF NOT EXISTS idx_payfit_meal_vouchers_collaborator ON payfit_meal_vouchers(collaborator_id);

-- Colonnes supplémentaires si la table existait déjà avec l'ancien schéma
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'payfit_meal_vouchers' AND column_name = 'voucher_amount') THEN
    ALTER TABLE payfit_meal_vouchers ADD COLUMN voucher_amount DECIMAL(10, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'payfit_meal_vouchers' AND column_name = 'day_off_eligibility') THEN
    ALTER TABLE payfit_meal_vouchers ADD COLUMN day_off_eligibility BOOLEAN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'payfit_meal_vouchers' AND column_name = 'voucher_company_part_amount') THEN
    ALTER TABLE payfit_meal_vouchers ADD COLUMN voucher_company_part_amount DECIMAL(10, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'payfit_meal_vouchers' AND column_name = 'voucher_employee_part_amount') THEN
    ALTER TABLE payfit_meal_vouchers ADD COLUMN voucher_employee_part_amount DECIMAL(10, 2);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_payfit_meal_vouchers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payfit_meal_vouchers_updated_at ON payfit_meal_vouchers;
CREATE TRIGGER update_payfit_meal_vouchers_updated_at
  BEFORE UPDATE ON payfit_meal_vouchers
  FOR EACH ROW
  EXECUTE PROCEDURE update_payfit_meal_vouchers_updated_at();


-- ========== 3. Table sync_logs (création ou colonnes manquantes) ==========
-- Créer la table si elle n'existe pas (avec toutes les colonnes attendues par sync-payfit)
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  message TEXT,
  months_synced TEXT[],
  records_processed INTEGER,
  duration_ms INTEGER,
  api_calls_count INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ajouter les colonnes manquantes si la table existait déjà (ex. créée par init-db)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'sync_logs' AND column_name = 'months_synced') THEN
    ALTER TABLE sync_logs ADD COLUMN months_synced TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'sync_logs' AND column_name = 'records_processed') THEN
    ALTER TABLE sync_logs ADD COLUMN records_processed INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'sync_logs' AND column_name = 'api_calls_count') THEN
    ALTER TABLE sync_logs ADD COLUMN api_calls_count INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'sync_logs' AND column_name = 'duration_ms') THEN
    ALTER TABLE sync_logs ADD COLUMN duration_ms INTEGER;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at);
