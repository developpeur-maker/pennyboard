// Script de test pour l'API de synchronisation
const fetch = require('node-fetch')

async function testSyncAPI() {
  console.log('🔄 Test de l\'API de synchronisation...')
  
  const API_URL = 'http://localhost:3000/api/sync'
  const API_KEY = 'pennyboard_secret_key_2025'
  
  try {
    console.log(`📡 Appel de ${API_URL}...`)
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`📊 Status: ${response.status}`)
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ Synchronisation réussie:')
      console.log(JSON.stringify(result, null, 2))
    } else {
      const error = await response.text()
      console.error('❌ Erreur de synchronisation:')
      console.error(error)
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message)
    console.log('💡 Assurez-vous que le serveur est démarré avec: npm run dev')
  }
}

testSyncAPI()
