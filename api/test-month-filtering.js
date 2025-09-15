const fetch = require('node-fetch')

const API_KEY = process.env.VITE_PENNYLANE_API_KEY
const BASE_URL = 'https://app.pennylane.com/api/external/v1'

async function testMonthFiltering() {
  console.log('🔍 Test du filtrage par mois...\n')
  
  const months = [
    { month: '2025-01', start: '2025-01-01', end: '2025-01-31' },
    { month: '2025-02', start: '2025-02-01', end: '2025-02-28' },
    { month: '2025-03', start: '2025-03-01', end: '2025-03-31' },
    { month: '2025-04', start: '2025-04-01', end: '2025-04-30' },
    { month: '2025-05', start: '2025-05-01', end: '2025-05-31' },
    { month: '2025-06', start: '2025-06-01', end: '2025-06-30' },
    { month: '2025-07', start: '2025-07-01', end: '2025-07-31' },
    { month: '2025-08', start: '2025-08-01', end: '2025-08-31' },
    { month: '2025-09', start: '2025-09-01', end: '2025-09-30' },
    { month: '2025-10', start: '2025-10-01', end: '2025-10-31' },
    { month: '2025-11', start: '2025-11-01', end: '2025-11-30' },
    { month: '2025-12', start: '2025-12-01', end: '2025-12-31' }
  ]

  for (const { month, start, end } of months) {
    try {
      console.log(`📅 Test du mois ${month} (${start} à ${end})...`)
      
      const response = await fetch(`${BASE_URL}/trial_balance?period_start=${start}&period_end=${end}&page=1&per_page=1000`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.log(`❌ Erreur ${response.status} pour ${month}`)
        continue
      }

      const data = await response.json()
      
      if (data.items && data.items.length > 0) {
        // Analyser les comptes 6 et 7 (charges et produits)
        const comptes6 = data.items.filter(account => account.number.startsWith('6'))
        const comptes7 = data.items.filter(account => account.number.startsWith('7'))
        
        // Calculer les totaux
        const totalCharges = comptes6.reduce((total, account) => {
          const credits = parseFloat(account.credits) || 0
          const debits = parseFloat(account.debits) || 0
          return total + debits - credits
        }, 0)
        
        const totalProduits = comptes7.reduce((total, account) => {
          const credits = parseFloat(account.credits) || 0
          const debits = parseFloat(account.debits) || 0
          return total + credits - debits
        }, 0)
        
        console.log(`   ✅ ${data.items.length} comptes trouvés`)
        console.log(`   📊 Comptes 6 (charges): ${comptes6.length} comptes, total: ${totalCharges.toFixed(2)}€`)
        console.log(`   📊 Comptes 7 (produits): ${comptes7.length} comptes, total: ${totalProduits.toFixed(2)}€`)
        console.log(`   💰 Résultat: ${(totalProduits - totalCharges).toFixed(2)}€`)
        
        // Vérifier quelques comptes spécifiques
        const compte706 = data.items.find(account => account.number === '706')
        const compte622 = data.items.find(account => account.number === '622')
        
        if (compte706) {
          const credits = parseFloat(compte706.credits) || 0
          const debits = parseFloat(compte706.debits) || 0
          console.log(`   🎯 Compte 706 (Prestations services): ${(credits - debits).toFixed(2)}€`)
        }
        
        if (compte622) {
          const credits = parseFloat(compte622.credits) || 0
          const debits = parseFloat(compte622.debits) || 0
          console.log(`   🎯 Compte 622 (Charges externes): ${(debits - credits).toFixed(2)}€`)
        }
        
      } else {
        console.log(`   ⚠️ Aucune donnée pour ${month}`)
      }
      
    } catch (error) {
      console.log(`   ❌ Erreur pour ${month}: ${error.message}`)
    }
    
    console.log('') // Ligne vide pour la lisibilité
  }
}

testMonthFiltering().catch(console.error)
