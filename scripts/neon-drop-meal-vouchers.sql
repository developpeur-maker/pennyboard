-- Suppression de la table meal vouchers devenue inutile (données Payfit non à jour)
-- À exécuter dans l'éditeur SQL Neon

DROP TABLE IF EXISTS payfit_meal_vouchers;
