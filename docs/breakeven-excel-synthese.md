# Synthèse Excel → Seuil de rentabilité

## Structure retenue

### 1. Onglet Inputs (champs modifiables)
- **Hypothèses globales** : Jours d'ouverture (JO) = 251 ; Objectifs marge = 0%, 3%, 6%, 9%, 12%, 15%, 20%.
- **Feedback 2025** : ETP diag (calculé depuis BDD), Jours dispo/ETP diag 2025, Taux variable v 2025, Autres produits 2025.
- **Hypothèses 2026** : ETP diag, ETP comm (calculés), Jours dispo/ETP diag, Jours dispo/ETP comm, CA cible 2026, Taux variable v 2026, Budget insertions/mois, Budget logiciels/mois, Masse salariale 2026 (calculée Payroll), Direction, Freelances, Autres charges fixes, Autres produits 2026.
- **Upsell amiante** : Activer (0/1), CA amiante/diag/mois HT, Marge amiante/diag/mois HT.

### 2. Calcul ETP depuis la BDD (règle métier)
- **Tech** (tag équipe contient "Tech") : Jours travaillés = **Indemnités et avantages en nature** (comptes 6414, 6417, 64171) ÷ **9,9**.
- **Commercial / autres** : Jours travaillés = **Titres-restaurant – charges salariales** ÷ **3,2**.
- Par mois puis somme sur l’année par personne → total jours par service → **ETP = total jours / 217** (ou 216 selon choix).

**Compte titres-restaurant** : pour les commerciaux (non-tech), on utilise le compte **6476** (Titres-restaurant - charges salariales).

### 3. 2025 – Seuil (données BDD)
- Ventes 706, Autres produits, Charges totales, Insertions (6231), Variables hors insertions, Fixes.
- KPIs : Jours diag vendables, TJM diag réalisé, TJM entreprise, Résultat, Marge.
- Tableau seuils : par marge cible (0%, 3%, … 20%) → CA requis, TJM diag requis, TJM entreprise.

### 4. 2026 – Projection
- Hypothèses liées aux Inputs ; CA total (core + amiante si activé).
- KPIs 2026 : Jours diag vendables, TJM diag, CA/jour commercial, Résultat, Marge.
- Tableau seuils 2026 (même logique).

### 5. Payroll Model (masse salariale 2026)
- MS totale 2025 (base) depuis BDD.
- Coefficient évolution salaires 2026.
- Coût/ETP 2025 par service (Diagnostiqueurs, Commerciaux, HR, etc.) = MS totale × % MS / ETP.
- ETP 2026 par service (saisis ou issus des calculs ETP BDD) → MS 2026 par service → MS 2026 totale → reprise dans Inputs (Masse salariale 2026).

---

Le compte utilisé pour les titres-restaurant (non-tech) est **6476**.
