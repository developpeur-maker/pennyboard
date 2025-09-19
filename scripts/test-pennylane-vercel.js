// Script pour tester l'API Pennylane depuis Vercel
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

async function testPennylaneVercel() {
  console.log('🔍 Test de l\'API Pennylane depuis Vercel...')
  
  // Charger les variables d'environnement
  const fs = require('fs')
  const path = require('path')
  
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim()
          process.env[key.trim()] = value
        }
      }
    })
    console.log('📁 Variables d\'environnement chargées')
  }
  
  const apiKey = process.env.VITE_PENNYLANE_API_KEY
  console.log(`🔑 Clé API: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NON TROUVÉE'}`)
  
  if (!apiKey) {
    console.error('❌ Clé API Pennylane non trouvée dans les variables d\'environnement')
    return
  }
  
  try {
    // Test avec l'URL de Vercel
    const currentDate = new Date()
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]
    
    console.log(`📊 Test trial balance pour ${startDateStr} à ${endDateStr}...`)
    
    // Test via l'endpoint Vercel
    const vercelUrl = 'https://pennyboard.vercel.app/api/trial-balance'
    console.log(`🔗 URL Vercel: ${vercelUrl}`)
    
    const response = await fetch(`${vercelUrl}?start_date=${startDateStr}&end_date=${endDateStr}`, {
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
      
      if (data.items && data.items.length > 0) {
        console.log('📊 Premiers comptes:')
        data.items.slice(0, 10).forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.number} - ${item.label}`)
          console.log(`     Débit: ${item.debit || item.debits || '0'}, Crédit: ${item.credit || item.credits || '0'}`)
        })
        
        // Vérifier les comptes spécifiques
        const compte706 = data.items.find(item => item.number === '706000' || item.number.startsWith('706'))
        const compte512 = data.items.find(item => item.number === '512000' || item.number.startsWith('512'))
        const compte601 = data.items.find(item => item.number === '601000' || item.number.startsWith('601'))
        
        console.log('\n🎯 Comptes spécifiques:')
        if (compte706) {
          console.log(`  - 706 (Ventes): ${compte706.credit || compte706.credits || '0'}`)
        } else {
          console.log('  - 706 (Ventes): NON TROUVÉ')
        }
        if (compte512) {
          console.log(`  - 512 (Banque): ${compte512.debit || compte512.debits || '0'}`)
        } else {
          console.log('  - 512 (Banque): NON TROUVÉ')
        }
        if (compte601) {
          console.log(`  - 601 (Achats): ${compte601.debit || compte601.debits || '0'}`)
        } else {
          console.log('  - 601 (Achats): NON TROUVÉ')
        }
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

testPennylaneVercel()
