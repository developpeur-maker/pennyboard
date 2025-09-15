const fetch = require('node-fetch')

const API_KEY = process.env.VITE_PENNYLANE_API_KEY
const BASE_URL = 'https://app.pennylane.com/api/external/v1'

async function testMonthComparison() {
  console.log('🔍 Test de comparaison entre deux mois...\n')
  
  const months = [
    { name: 'Juin 2025', start: '2025-06-01', end: '2025-06-30' },
    { name: 'Juillet 2025', start: '2025-07-01', end: '2025-07-31' },
    { name: 'Août 2025', start: '2025-08-01', end: '2025-08-31' },
    { name: 'Septembre 2025', start: '2025-09-01', end: '2025-09-30' }
  ]

  const results = {}

  for (const month of months) {
    try {
      console.log(`📅 Test du mois ${month.name} (${month.start} à ${month.end})...`)
      
      const response = await fetch(`${BASE_URL}/trial_balance?period_start=${month.start}&period_end=${month.end}&page=1&per_page=1000`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.log(`❌ Erreur ${response.status} pour ${month.name}`)
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
        
        // Vérifier quelques comptes spécifiques
        const compte706 = data.items.find(account => account.number === '706')
        const compte622 = data.items.find(account => account.number === '622')
        
        const result = {
          month: month.name,
          totalAccounts: data.items.length,
          totalCharges,
          totalProduits,
          resultat: totalProduits - totalCharges,
          compte706: compte706 ? {
            credits: parseFloat(compte706.credits) || 0,
            debits: parseFloat(compte706.debits) || 0,
            solde: (parseFloat(compte706.credits) || 0) - (parseFloat(compte706.debits) || 0)
          } : null,
          compte622: compte622 ? {
            credits: parseFloat(compte622.credits) || 0,
            debits: parseFloat(compte622.debits) || 0,
            solde: (parseFloat(compte622.debits) || 0) - (parseFloat(compte622.credits) || 0)
          } : null
        }
        
        results[month.name] = result
        
        console.log(`   ✅ ${data.items.length} comptes trouvés`)
        console.log(`   📊 Total Charges: ${totalCharges.toFixed(2)}€`)
        console.log(`   📊 Total Produits: ${totalProduits.toFixed(2)}€`)
        console.log(`   💰 Résultat: ${(totalProduits - totalCharges).toFixed(2)}€`)
        
        if (compte706) {
          console.log(`   🎯 Compte 706: ${result.compte706.solde.toFixed(2)}€`)
        }
        
        if (compte622) {
          console.log(`   🎯 Compte 622: ${result.compte622.solde.toFixed(2)}€`)
        }
        
      } else {
        console.log(`   ⚠️ Aucune donnée pour ${month.name}`)
        results[month.name] = { month: month.name, error: 'Aucune donnée' }
      }
      
    } catch (error) {
      console.log(`   ❌ Erreur pour ${month.name}: ${error.message}`)
      results[month.name] = { month: month.name, error: error.message }
    }
    
    console.log('') // Ligne vide pour la lisibilité
  }

  // Comparaison des résultats
  console.log('📊 COMPARAISON DES RÉSULTATS:')
  console.log('=' * 50)
  
  const monthsList = Object.keys(results)
  for (let i = 0; i < monthsList.length - 1; i++) {
    const currentMonth = monthsList[i]
    const nextMonth = monthsList[i + 1]
    
    if (results[currentMonth].error || results[nextMonth].error) {
      continue
    }
    
    console.log(`\n🔄 ${currentMonth} vs ${nextMonth}:`)
    console.log(`   Charges: ${results[currentMonth].totalCharges.toFixed(2)}€ → ${results[nextMonth].totalCharges.toFixed(2)}€ (${(results[nextMonth].totalCharges - results[currentMonth].totalCharges).toFixed(2)}€)`)
    console.log(`   Produits: ${results[currentMonth].totalProduits.toFixed(2)}€ → ${results[nextMonth].totalProduits.toFixed(2)}€ (${(results[nextMonth].totalProduits - results[currentMonth].totalProduits).toFixed(2)}€)`)
    console.log(`   Résultat: ${results[currentMonth].resultat.toFixed(2)}€ → ${results[nextMonth].resultat.toFixed(2)}€ (${(results[nextMonth].resultat - results[currentMonth].resultat).toFixed(2)}€)`)
    
    // Vérifier si les données sont identiques
    if (results[currentMonth].totalCharges === results[nextMonth].totalCharges && 
        results[currentMonth].totalProduits === results[nextMonth].totalProduits) {
      console.log(`   ⚠️ ATTENTION: Les données sont identiques entre ${currentMonth} et ${nextMonth}!`)
    }
  }
}

testMonthComparison().catch(console.error)
