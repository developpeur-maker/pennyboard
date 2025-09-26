-- Script de nettoyage de la base de données Neon
-- Supprime les colonnes liées aux fonctionnalités DSO et impayés

-- 1. Supprimer la colonne creances_clients_breakdown de monthly_data
ALTER TABLE monthly_data DROP COLUMN IF EXISTS creances_clients_breakdown;

-- 2. Nettoyer les données existantes en supprimant les champs DSO/impayés des KPIs
UPDATE monthly_data 
SET kpis = kpis - 'creances_clients' - 'dso' - 'pourcentage_impayes'
WHERE kpis ? 'creances_clients' OR kpis ? 'dso' OR kpis ? 'pourcentage_impayes';

-- 3. Vérifier le résultat
SELECT 
  month,
  jsonb_pretty(kpis) as kpis_cleaned
FROM monthly_data 
ORDER BY month DESC 
LIMIT 3;
