-- Table pour stocker les jours travaillés (vouchersCount) par collaborateur et par mois
-- Source: API Payfit "List all Collaborators Meal Vouchers FR"
-- Scope API requis: collaborators:meal-vouchers:read

CREATE TABLE IF NOT EXISTS payfit_meal_vouchers (
  id SERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL,           -- Format: 2025-01
  collaborator_id VARCHAR(255) NOT NULL,
  vouchers_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(month, collaborator_id)
);

CREATE INDEX IF NOT EXISTS idx_payfit_meal_vouchers_month ON payfit_meal_vouchers(month);
CREATE INDEX IF NOT EXISTS idx_payfit_meal_vouchers_collaborator ON payfit_meal_vouchers(collaborator_id);

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
  EXECUTE FUNCTION update_payfit_meal_vouchers_updated_at();
