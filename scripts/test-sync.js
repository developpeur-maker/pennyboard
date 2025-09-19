// Script de test pour la synchronisation
const fetch = require('node-fetch')

async function testSync() {
  console.log('🔄 Test de la synchronisation...')
  
  const API_KEY = process.env.API_KEY || 'pennyboard_secret_key_2025'
  const API_URL = process.env.API_URL || 'http://localhost:3000/api/sync'
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ Synchronisation réussie:', result)
    } else {
      const error = await response.json()
      console.error('❌ Erreur de synchronisation:', error)
    }
  } catch (error) {
    console.error('❌ Erreur lors du test:', error)
  }
}

testSync()
