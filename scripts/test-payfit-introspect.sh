#!/bin/bash

# Script pour récupérer le Company ID Payfit
# Remplacez YOUR-API-KEY par votre vraie clé API

echo "🔍 Récupération du Company ID Payfit..."
echo ""

# Remplacez YOUR-API-KEY par votre vraie clé API
API_KEY="YOUR-API-KEY"

if [ "$API_KEY" = "YOUR-API-KEY" ]; then
    echo "❌ Veuillez remplacer YOUR-API-KEY par votre vraie clé API dans ce script"
    echo "💡 Éditez le fichier scripts/test-payfit-introspect.sh"
    exit 1
fi

echo "📡 Envoi de la requête à l'endpoint d'introspection..."
echo ""

curl -X POST \
https://oauth.payfit.com/introspect \
-H "Authorization: Bearer $API_KEY" \
-H "Content-Type: application/json" \
-d "{ \"token\": \"$API_KEY\" }" \
| jq '.' 2>/dev/null || cat

echo ""
echo "🎉 Si la requête a réussi, vous devriez voir votre company_id dans la réponse !"
