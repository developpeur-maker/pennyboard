// Script de test pour la synchronisation historique
const https = require('https')

async function testHistoricalSync() {
  console.log('🧪 Test de la synchronisation historique...')
  
  try {
    const postData = JSON.stringify({})
    
    const options = {
      hostname: 'pennyboard.vercel.app',
      port: 443,
      path: '/api/sync-historical',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-api-key': 'pennyboard_secret_key_2025'
      }
    }
    
    const req = https.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        console.log(`📊 Status: ${res.statusCode}`)
        console.log(`📋 Response: ${data}`)
        
        if (res.statusCode === 200) {
          console.log('✅ Test réussi !')
        } else {
          console.log('❌ Test échoué')
        }
      })
    })
    
    req.on('error', (error) => {
      console.error('❌ Erreur:', error.message)
    })
    
    req.write(postData)
    req.end()
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error)
  }
}

// Exécuter le test
if (require.main === module) {
  testHistoricalSync()
}

module.exports = { testHistoricalSync }
