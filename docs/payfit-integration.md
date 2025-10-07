# Intégration Payfit

## Configuration

### Variables d'environnement requises

Ajoutez ces variables à votre fichier `.env` :

```bash
# Configuration Payfit
PAYFIT_API_KEY=your_payfit_api_key_here
PAYFIT_COMPANY_ID=your_payfit_company_id_here
```

### Endpoints disponibles

#### GET `/api/payfit`

Récupère les collaborateurs d'une entreprise Payfit.

**Paramètres de requête :**
- `companyId` (requis) : ID de l'entreprise
- `nextPageToken` (optionnel) : Token de pagination
- `maxResults` (optionnel) : Nombre maximum de résultats (max: 50, défaut: 10)
- `includeInProgressContracts` (optionnel) : Inclure les contrats en cours (défaut: false)
- `email` (optionnel) : Filtrer par email

**Exemple de requête :**
```bash
GET /api/payfit?companyId=123&maxResults=20&includeInProgressContracts=true
```

**Réponse :**
```json
{
  "success": true,
  "companyId": "123",
  "collaborators": [...],
  "pagination": {
    "nextPageToken": "...",
    "hasMore": true
  },
  "total": 20,
  "timestamp": "2025-01-XX..."
}
```

## Structure des données

Les collaborateurs retournés contiennent les informations suivantes :
- Informations personnelles
- Contrats
- Données de paie
- Statut d'emploi

## Gestion des erreurs

L'API gère les erreurs suivantes :
- 400 : Paramètres manquants ou invalides
- 401 : Clé API invalide
- 500 : Erreur de configuration ou d'API Payfit
