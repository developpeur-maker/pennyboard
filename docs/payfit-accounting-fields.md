# Champs retournés par l'API Payfit accounting-v2

## Structure complète d'une opération comptable

Chaque ligne (opération) retournée par l'API Payfit `/companies/{companyId}/accounting-v2` contient les champs suivants :

### Champs obligatoires (toujours présents)

1. **`debit`** (number | null)
   - Type : `number` ou `null`
   - Description : Montant au débit de l'opération comptable
   - Peut être `null` si l'opération est uniquement au crédit

2. **`credit`** (number | null)
   - Type : `number` ou `null`
   - Description : Montant au crédit de l'opération comptable
   - Peut être `null` si l'opération est uniquement au débit

3. **`operationDate`** (string)
   - Type : `string`
   - Format : `"YYYY-MM-DD"` (ex: `"2025-12-31"`)
   - Description : Date de l'opération comptable

4. **`accountId`** (string)
   - Type : `string`
   - Description : Code du compte comptable
   - Exemples : `"421"`, `"6252000"`, `"645"`, `"647"`, `"641"`

5. **`accountName`** (string)
   - Type : `string`
   - Description : Libellé du compte comptable
   - Exemples : `"Notes de frais"`, `"Rémunérations nettes"`, `"Charges sociales"`

### Champs conditionnels (peuvent être null)

6. **`employeeFullName`** (string | null)
   - Type : `string` ou `null`
   - Description : Nom complet du collaborateur associé à l'opération
   - Peut être `null` si l'opération n'est pas liée à un collaborateur spécifique

7. **`contractId`** (string | null)
   - Type : `string` ou `null`
   - Description : Identifiant unique du contrat du collaborateur
   - Peut être `null` si l'opération n'est pas liée à un contrat spécifique

### Champs optionnels (peuvent être absents)

8. **`analyticCodes`** (Array | undefined)
   - Type : `Array<AnalyticCode>` ou `undefined`
   - Description : Tableau de codes analytiques associés à l'opération
   - Structure de chaque élément `AnalyticCode` :
     - **`type`** (string) : Type du code analytique (ex: `"Équipe"`, `"Projet"`, `"Centre de coût"`)
     - **`value`** (string | null) : Valeur du code analytique
     - **`code`** (string | null) : Code du code analytique
   - Peut être `undefined` si aucun code analytique n'est associé

## Résumé des champs

| Champ | Type | Obligatoire | Peut être null | Description |
|-------|------|-------------|----------------|-------------|
| `debit` | number \| null | ✅ | ✅ | Montant au débit |
| `credit` | number \| null | ✅ | ✅ | Montant au crédit |
| `operationDate` | string | ✅ | ❌ | Date de l'opération (format YYYY-MM-DD) |
| `accountId` | string | ✅ | ❌ | Code du compte comptable |
| `accountName` | string | ✅ | ❌ | Libellé du compte comptable |
| `employeeFullName` | string \| null | ✅ | ✅ | Nom complet du collaborateur |
| `contractId` | string \| null | ✅ | ✅ | ID du contrat |
| `analyticCodes` | Array \| undefined | ❌ | ❌ | Codes analytiques (optionnel) |

## Structure complète TypeScript

```typescript
interface PayfitAccountingOperation {
  // Champs obligatoires
  debit: number | null
  credit: number | null
  operationDate: string
  accountId: string
  accountName: string
  
  // Champs conditionnels (peuvent être null)
  employeeFullName: string | null
  contractId: string | null
  
  // Champs optionnels (peuvent être absents)
  analyticCodes?: Array<{
    type: string
    value: string | null
    code: string | null
  }>
}
```

## Notes importantes

- **Tous les champs listés ci-dessus sont stockés** dans la base de données dans le champ `raw_accounting_data` (JSONB)
- **Seuls les champs listés sont actuellement utilisés** dans le traitement des données
- Les opérations sont **filtrées** pour ne garder que celles liées aux salaires et cotisations (comptes 421, 641, 645, 647)
- Toutes les opérations d'un collaborateur sont stockées dans `employee.operations[]` dans le champ `employees_data` (JSONB)

