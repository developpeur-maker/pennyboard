// Script pour déclencher la synchronisation historique via l'API Vercel
// Évite les problèmes de variables d'environnement locales

const https = require('https')
const http = require('http')

async function triggerHistoricalSync() {
  const API_BASE_URL = 'https://pennyboard.vercel.app/api'
  const API_KEY = 'pennyboard_secret_key_2025'
  
  console.log('🚀 Déclenchement de la synchronisation historique via Vercel...')
  
  try {
    // Déclencher la synchronisation pour chaque année
    const years = ['2021', '2022', '2023', '2024']
    
    for (const year of years) {
      console.log(`📅 Synchronisation de l'année ${year}...`)
      
      // Synchroniser chaque mois de l'année
      for (let month = 1; month <= 12; month++) {
        const monthFormatted = month.toString().padStart(2, '0')
        const monthKey = `${year}-${monthFormatted}`
        
        console.log(`📊 Synchronisation de ${monthKey}...`)
        
        try {
          const postData = JSON.stringify({
            month: monthKey,
            year: year,
            monthNumber: month
          })
          
          const options = {
            hostname: 'pennyboard.vercel.app',
            port: 443,
            path: '/api/sync',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
              'x-api-key': API_KEY
            }
          }
          
          const req = https.request(options, (res) => {
            let data = ''
            
            res.on('data', (chunk) => {
              data += chunk
            })
            
            res.on('end', () => {
              if (res.statusCode === 200) {
                console.log(`✅ ${monthKey} synchronisé avec succès`)
              } else {
                console.log(`⚠️ Erreur pour ${monthKey}: ${res.statusCode} - ${data}`)
              }
            })
          })
          
          req.on('error', (error) => {
            console.log(`❌ Erreur pour ${monthKey}:`, error.message)
          })
          
          req.write(postData)
          req.end()
          
          // Pause entre les requêtes pour éviter le rate limit
          await new Promise(resolve => setTimeout(resolve, 2000))
          
        } catch (error) {
          console.log(`❌ Erreur pour ${monthKey}:`, error.message)
        }
      }
    }
    
    console.log('🎉 Synchronisation historique terminée !')
    
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error)
  }
}

// Exécuter le script
if (require.main === module) {
  triggerHistoricalSync()
    .then(() => {
      console.log('✅ Script de synchronisation terminé')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erreur:', error)
      process.exit(1)
    })
}

module.exports = { triggerHistoricalSync }
