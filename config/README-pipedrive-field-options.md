# Mapping des champs personnalisés Pipedrive (INTEGER → libellé)

Les **libellés** des champs personnalisés qui renvoient un **INTEGER** (ex. option ID) sont chargés depuis une **URL**. Définis la variable d’environnement **`PIPEDRIVE_FIELD_OPTIONS_URL`** avec l’URL qui retourne le JSON (GET). Le contenu est mis en cache **1 heure**.

## Format attendu (réponse de l’URL)

L’URL doit retourner un JSON au format suivant.

**Option 1 – Clé `customFieldOptions`**  
Chaque clé est l’**ID du champ** Pipedrive, la valeur est un objet **optionId → libellé** :

```json
{
  "customFieldOptions": {
    "7621b26d5149ac69b3d6d411b1caf903ad55b97f": {
      "123": "Diagnostiqueur A",
      "456": "Diagnostiqueur B"
    },
    "f6fd171e5b395779f565b2e36d52a3d137fa197c": {
      "1": "1h",
      "2": "2h"
    }
  }
}
```

**Option 2 – Objet à la racine**  
Sans la clé `customFieldOptions` (les IDs de champs sont directement à la racine) :

```json
{
  "7621b26d5149ac69b3d6d411b1caf903ad55b97f": {
    "123": "Diagnostiqueur A"
  }
}
```

Les champs concernés (INTEGER) sont : **Diagnostiqueur**, **Zone**, **Diagnostics réalisés**.  
**Temps d'intervention**, **Date de RDV** (format YYYY-MM-DD) et **Numéro de facture** sont des STRING, pas de mapping.
