// Script pour capturer la structure des données Pennylane
const fs = require('fs')
const path = require('path')

// Charger les variables d'environnement
function loadEnvFile() {
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
}

loadEnvFile()

async function capturePennylaneStructure() {
  console.log('🔍 Capture de la structure des données Pennylane...')
  
  const baseUrl = 'http://localhost:5173'
  const results = {}
  
  try {
    // 1. Trial Balance
    console.log('\n📊 Capture du trial-balance...')
    const trialBalanceResponse = await fetch(`${baseUrl}/api/trial-balance?period_start=2025-09-01&period_end=2025-09-30&page=1&per_page=1000`)
    if (trialBalanceResponse.ok) {
      const trialBalanceData = await trialBalanceResponse.json()
      results.trial_balance = trialBalanceData
      console.log('✅ Trial balance capturé')
    } else {
      console.log('❌ Erreur trial-balance:', trialBalanceResponse.status)
    }
    
    // 2. Accounts
    console.log('\n📋 Capture des accounts...')
    const accountsResponse = await fetch(`${baseUrl}/api/accounts?page=1&per_page=100`)
    if (accountsResponse.ok) {
      const accountsData = await accountsResponse.json()
      results.accounts = accountsData
      console.log('✅ Accounts capturés')
    } else {
      console.log('❌ Erreur accounts:', accountsResponse.status)
    }
    
    // 3. Ledger Entries
    console.log('\n📝 Capture des ledger-entries...')
    const ledgerResponse = await fetch(`${baseUrl}/api/ledger-entries?page=1&per_page=100`)
    if (ledgerResponse.ok) {
      const ledgerData = await ledgerResponse.json()
      results.ledger_entries = ledgerData
      console.log('✅ Ledger entries capturés')
    } else {
      console.log('❌ Erreur ledger-entries:', ledgerResponse.status)
    }
    
    // Sauvegarder les résultats
    const outputPath = path.join(__dirname, 'pennylane-structure.json')
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
    console.log(`\n💾 Structure sauvegardée dans: ${outputPath}`)
    
    // Analyser la structure
    console.log('\n📋 Analyse de la structure:')
    Object.keys(results).forEach(key => {
      const data = results[key]
      console.log(`\n${key.toUpperCase()}:`)
      console.log(`  - Type: ${typeof data}`)
      console.log(`  - Keys: ${Object.keys(data)}`)
      
      if (data.success && data.raw_data) {
        console.log(`  - Raw data type: ${typeof data.raw_data}`)
        console.log(`  - Raw data keys: ${Object.keys(data.raw_data)}`)
        
        if (data.raw_data.items && Array.isArray(data.raw_data.items)) {
          console.log(`  - Items count: ${data.raw_data.items.length}`)
          if (data.raw_data.items.length > 0) {
            console.log(`  - First item keys: ${Object.keys(data.raw_data.items[0])}`)
          }
        }
      }
    })
    
  } catch (error) {
    console.error('❌ Erreur lors de la capture:', error.message)
    console.log('\n💡 Suggestion: Démarrez le serveur de développement avec "npm run dev"')
  }
}

// Exécuter la capture si le script est appelé directement
if (require.main === module) {
  capturePennylaneStructure()
    .then(() => {
      console.log('\n🎉 Capture terminée')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Erreur fatale:', error)
      process.exit(1)
    })
}

module.exports = capturePennylaneStructure
