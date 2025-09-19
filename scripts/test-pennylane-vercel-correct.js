// Script pour tester l'API Pennylane depuis Vercel avec la syntaxe correcte
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

async function testPennylaneVercelCorrect() {
  console.log('🔍 Test de l\'API Pennylane depuis Vercel avec la syntaxe correcte...')
  
  try {
    // Test avec l'URL de Vercel et la syntaxe correcte
    const currentDate = new Date()
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]
    
    console.log(`📊 Test trial balance pour ${startDateStr} à ${endDateStr}...`)
    
    // Test via l'endpoint Vercel avec la syntaxe correcte
    const vercelUrl = 'https://pennyboard.vercel.app/api/trial-balance'
    console.log(`🔗 URL Vercel: ${vercelUrl}`)
    
    const response = await fetch(`${vercelUrl}?period_start=${startDateStr}&period_end=${endDateStr}&is_auxiliary=false&page=1&per_page=1000`, {
      headers: {
        'x-api-key': 'pennyboard_secret_key_2025',
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`📡 Statut de la réponse: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Données récupérées avec succès via Vercel!')
      console.log(`📋 Nombre d'éléments: ${data.items?.length || 0}`)
      console.log(`📄 Pages totales: ${data.total_pages || 'N/A'}`)
      console.log(`📊 Total d'éléments: ${data.total_items || 'N/A'}`)
      
      if (data.items && data.items.length > 0) {
        console.log('📊 Premiers comptes:')
        data.items.slice(0, 10).forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.number} - ${item.label}`)
          console.log(`     Débits: ${item.debits || '0'}, Crédits: ${item.credits || '0'}`)
        })
        
        // Vérifier les comptes spécifiques
        const compte706 = data.items.find(item => item.number === '706000' || item.number.startsWith('706'))
        const compte512 = data.items.find(item => item.number === '512000' || item.number.startsWith('512'))
        const compte601 = data.items.find(item => item.number === '601000' || item.number.startsWith('601'))
        
        console.log('\n🎯 Comptes spécifiques:')
        if (compte706) {
          console.log(`  - 706 (Ventes): ${compte706.credits || '0'}`)
        } else {
          console.log('  - 706 (Ventes): NON TROUVÉ')
        }
        if (compte512) {
          console.log(`  - 512 (Banque): ${compte512.debits || '0'}`)
        } else {
          console.log('  - 512 (Banque): NON TROUVÉ')
        }
        if (compte601) {
          console.log(`  - 601 (Achats): ${compte601.debits || '0'}`)
        } else {
          console.log('  - 601 (Achats): NON TROUVÉ')
        }
      } else {
        console.log('⚠️ Aucune donnée retournée par l\'API')
      }
    } else {
      const errorText = await response.text()
      console.error('❌ Erreur API Vercel:')
      console.error(`   Statut: ${response.status}`)
      console.error(`   Message: ${errorText}`)
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message)
    console.error('   Type d\'erreur:', error.code)
    console.error('   Détails:', error)
  }
}

testPennylaneVercelCorrect()
