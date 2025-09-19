// Script pour vérifier les données via l'API
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

async function checkApiData() {
  console.log('🔍 Vérification des données via l\'API...')
  
  const API_URL = 'https://pennyboard.vercel.app/api/data'
  const API_KEY = 'pennyboard_secret_key_2025'
  
  try {
    // Tester l'API de données pour le mois actuel
    const currentMonth = new Date().toISOString().slice(0, 7) // Format YYYY-MM
    console.log(`📊 Récupération des données pour ${currentMonth}...`)
    
    const response = await fetch(`${API_URL}?month=${currentMonth}`, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Données récupérées via l\'API:')
      console.log(`  - Mois: ${data.month}`)
      console.log(`  - Année: ${data.year}`)
      console.log(`  - Mois actuel: ${data.is_current_month}`)
      console.log(`  - Mis à jour: ${data.updated_at}`)
      
      if (data.kpis) {
        console.log('\n📊 KPIs:')
        console.log(`  - Ventes 706: ${data.kpis.ventes_706 || 'N/A'}`)
        console.log(`  - Chiffre d'affaires: ${data.kpis.chiffre_affaires || 'N/A'}`)
        console.log(`  - Charges: ${data.kpis.charges || 'N/A'}`)
        console.log(`  - Résultat net: ${data.kpis.resultat_net || 'N/A'}`)
        console.log(`  - Trésorerie: ${data.kpis.tresorerie || 'N/A'}`)
        console.log(`  - Période: ${data.kpis.period || 'N/A'}`)
      }
      
      if (data.trial_balance && data.trial_balance.items) {
        console.log(`\n📋 Trial Balance: ${data.trial_balance.items.length} comptes`)
        console.log('  - Premiers comptes:')
        data.trial_balance.items.slice(0, 5).forEach((item, index) => {
          console.log(`    ${index + 1}. ${item.number} - ${item.label}`)
          console.log(`       Débit: ${item.debit || item.debits || '0'}, Crédit: ${item.credit || item.credits || '0'}`)
        })
      }
      
      if (data.charges_breakdown) {
        console.log('\n💰 Breakdown des charges:')
        Object.entries(data.charges_breakdown).forEach(([code, data]) => {
          if (data && data.total > 0) {
            console.log(`  - ${code}: ${data.total}€ (${data.accounts?.length || 0} comptes)`)
          }
        })
      }
      
    } else {
      const error = await response.text()
      console.error('❌ Erreur API:', response.status, error)
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message)
  }
}

checkApiData()
