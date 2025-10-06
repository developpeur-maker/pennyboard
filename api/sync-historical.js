// API de synchronisation historique (2021-2024)
const { Pool } = require('pg')

module.exports = async function handler(req, res) {
  // Accepter GET (pour cron) et POST (pour synchronisation manuelle)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Vérifier la clé API
  const apiKey = req.headers['x-api-key']
  if (apiKey !== process.env.API_KEY) {
    console.log('❌ Clé API invalide:', apiKey ? 'Fournie' : 'Manquante')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const startTime = Date.now()
  let apiCallsCount = 0
  let recordsProcessed = 0

  try {
    console.log('🔄 Début de la synchronisation historique Pennylane (2021-2024)...')

    // Connexion à la base de données
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: {
        rejectUnauthorized: false
      }
    })

    const client = await pool.connect()
    
    try {
      // Récupérer TOUS les mois des années 2021-2024
      const monthsToSync = []
      const historicalYears = [2021, 2022, 2023, 2024]
      
      console.log(`📅 Synchronisation des années historiques: ${historicalYears.join(', ')}`)
      
      // Synchroniser tous les mois des années historiques (1-12 pour chaque année)
      for (const year of historicalYears) {
        for (let monthNumber = 1; monthNumber <= 12; monthNumber++) {
          const monthFormatted = monthNumber.toString().padStart(2, '0')
          const month = `${year}-${monthFormatted}`
          
          monthsToSync.push({ month, year, monthNumber })
          console.log(`📊 Ajout de ${month} à la synchronisation historique`)
        }
      }

      console.log(`📅 Synchronisation de ${monthsToSync.length} mois historiques:`, monthsToSync.map(m => m.month))

      // Synchroniser chaque mois
      for (const { month, year, monthNumber } of monthsToSync) {
        try {
          console.log(`🔄 Synchronisation de ${month}...`)
          
          // Dates pour la période
          const startDate = `${year}-${monthNumber.toString().padStart(2, '0')}-01`
          const endDate = new Date(year, monthNumber, 0).toISOString().split('T')[0]
          
          // Récupérer les données Pennylane
          const trialBalance = await getTrialBalanceFromPennylane(startDate, endDate)
          apiCallsCount++
          
          // Calculer les KPIs
          const kpis = calculateKPIsFromTrialBalance(trialBalance, month)
          
          // Calculer les breakdowns
          const chargesBreakdown = calculateChargesBreakdown(trialBalance)
          const chargesSalarialesBreakdown = calculateChargesSalarialesBreakdown(trialBalance)
          const revenusBreakdown = calculateRevenusBreakdown(trialBalance)
          const tresorerieBreakdown = calculateTresorerieBreakdown(trialBalance)
          
          // Déterminer si c'est le mois actuel (probablement false pour historique)
          const currentDate = new Date()
          const isCurrentMonth = month === currentDate.toISOString().slice(0, 7)
          
          // Stocker dans la base de données (ÉCRASER les données existantes)
          const insertResult = await client.query(`
            INSERT INTO monthly_data (
              month, year, month_number, trial_balance, kpis, 
              charges_breakdown, charges_salariales_breakdown, revenus_breakdown, tresorerie_breakdown,
              is_current_month, sync_version
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)
            ON CONFLICT (month) DO UPDATE SET
              trial_balance = EXCLUDED.trial_balance,
              kpis = EXCLUDED.kpis,
              charges_breakdown = EXCLUDED.charges_breakdown,
              charges_salariales_breakdown = EXCLUDED.charges_salariales_breakdown,
              revenus_breakdown = EXCLUDED.revenus_breakdown,
              tresorerie_breakdown = EXCLUDED.tresorerie_breakdown,
              is_current_month = EXCLUDED.is_current_month,
              sync_version = monthly_data.sync_version + 1,
              updated_at = CURRENT_TIMESTAMP
          `, [
            month, year, monthNumber,
            JSON.stringify(trialBalance),
            JSON.stringify(kpis),
            JSON.stringify(chargesBreakdown),
            JSON.stringify(chargesSalarialesBreakdown),
            JSON.stringify(revenusBreakdown),
            JSON.stringify(tresorerieBreakdown),
            isCurrentMonth
          ])
          
          recordsProcessed++
          console.log(`✅ ${month} synchronisé avec succès`)
          
          // Pause pour éviter le rate limit
          await new Promise(resolve => setTimeout(resolve, 1000))
          
        } catch (monthError) {
          console.error(`❌ Erreur pour le mois ${month}:`, monthError)
        }
      }

      // Enregistrer le succès dans les logs
      const duration = Date.now() - startTime
      await client.query(`
        INSERT INTO sync_logs (sync_type, status, message, duration_ms, api_calls_count)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'historical',
        'success',
        `Synchronisation historique réussie de ${recordsProcessed} mois`,
        duration,
        apiCallsCount
      ])

      console.log(`✅ Synchronisation historique terminée: ${recordsProcessed} mois, ${apiCallsCount} appels API, ${duration}ms`)
      res.status(200).json({ 
        message: 'Synchronisation historique réussie',
        monthsSynced: recordsProcessed,
        apiCalls: apiCallsCount,
        duration: duration
      })
      
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation historique:', error)
    console.error('❌ Stack trace:', error.stack)
    
    // Enregistrer l'erreur dans les logs
    try {
      const pool = new Pool({
        connectionString: process.env.POSTGRES_URL,
        ssl: {
          rejectUnauthorized: false
        }
      })
      const client = await pool.connect()
      await client.query(`
        INSERT INTO sync_logs (sync_type, status, message, duration_ms, api_calls_count)
        VALUES ($1, $2, $3, $4, $5)
      `, ['historical', 'error', `${error.message} | Stack: ${error.stack}`, Date.now() - startTime, apiCallsCount])
      client.release()
    } catch (logError) {
      console.error('❌ Erreur lors de l\'enregistrement du log:', logError)
    }
    
    res.status(500).json({ 
      error: 'Échec de la synchronisation historique',
      details: error.message,
      type: error.name
    })
  }
}

// Fonction pour récupérer les données Pennylane directement (copiée de api/sync.js)
async function getTrialBalanceFromPennylane(startDate, endDate) {
  try {
    const url = `https://app.pennylane.com/api/external/v2/trial_balance?period_start=${startDate}&period_end=${endDate}&is_auxiliary=false&page=1&per_page=1000`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.VITE_PENNYLANE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Erreur API Pennylane: ${response.status} - ${response.statusText} - ${errorText}`)
    }
    
    const responseData = await response.json()
    
    if (!responseData.items || responseData.items.length === 0) {
      throw new Error('Aucune donnée disponible dans Pennylane pour cette période')
    }
    
    return responseData
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des données Pennylane:', error)
    throw error
  }
}

// Fonctions de calcul des KPIs (copiées de api/sync.js)
function calculateKPIsFromTrialBalance(trialBalance, month) {
  const items = trialBalance.items || []
  
  let ventes_706 = 0
  let revenus_totaux = 0
  let charges = 0
  let charges_salariales = 0
  let tresorerie = 0
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    const debit = parseFloat(item.debit) || 0
    const credit = parseFloat(item.credit) || 0
    
    // Ventes 706
    if (accountNumber.startsWith('706')) {
      ventes_706 += credit - debit
    }
    
    // Revenus totaux (classe 7)
    if (accountNumber.startsWith('7')) {
      revenus_totaux += credit - debit
    }
    
    // Charges (classe 6)
    if (accountNumber.startsWith('6')) {
      charges += debit - credit
    }
    
    // Charges salariales (classe 64)
    if (accountNumber.startsWith('64')) {
      const solde = debit - credit
      if (solde > 0) {
        charges_salariales += solde
      }
    }
    
    // Trésorerie (comptes 512)
    if (accountNumber.startsWith('512')) {
      tresorerie += debit - credit
    }
  })
  
  const resultat_net = revenus_totaux - charges
  
  return {
    period: month,
    ventes_706: Math.round(ventes_706 * 100) / 100,
    chiffre_affaires: Math.round(ventes_706 * 100) / 100,
    revenus_totaux: Math.round(revenus_totaux * 100) / 100,
    charges: Math.round(charges * 100) / 100,
    charges_salariales: Math.round(charges_salariales * 100) / 100,
    resultat_net: Math.round(resultat_net * 100) / 100,
    solde_tresorerie: Math.round(tresorerie * 100) / 100
  }
}

function calculateChargesBreakdown(trialBalance) {
  const breakdown = {}
  const items = trialBalance.items || []
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    if (accountNumber.startsWith('6')) {
      const debit = parseFloat(item.debit) || 0
      const credit = parseFloat(item.credit) || 0
      const solde = debit - credit
      
      if (solde !== 0) {
        breakdown[accountNumber] = {
          label: item.label || `Compte ${accountNumber}`,
          amount: Math.round(solde * 100) / 100
        }
      }
    }
  })
  
  return breakdown
}

function calculateRevenusBreakdown(trialBalance) {
  const breakdown = {}
  const items = trialBalance.items || []
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    if (accountNumber.startsWith('7')) {
      const debit = parseFloat(item.debit) || 0
      const credit = parseFloat(item.credit) || 0
      const solde = credit - debit
      
      if (solde !== 0) {
        breakdown[accountNumber] = {
          label: item.label || `Compte ${accountNumber}`,
          amount: Math.round(solde * 100) / 100
        }
      }
    }
  })
  
  return breakdown
}

function calculateTresorerieBreakdown(trialBalance) {
  const breakdown = {}
  const items = trialBalance.items || []
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    if (accountNumber.startsWith('512')) {
      const debit = parseFloat(item.debit) || 0
      const credit = parseFloat(item.credit) || 0
      const solde = debit - credit
      
      if (solde !== 0) {
        breakdown[accountNumber] = {
          label: item.label || `Compte ${accountNumber}`,
          amount: Math.round(solde * 100) / 100
        }
      }
    }
  })
  
  return breakdown
}

function calculateChargesSalarialesBreakdown(trialBalance) {
  const breakdown = {}
  const items = trialBalance.items || []
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    if (accountNumber.startsWith('64')) {
      const debit = parseFloat(item.debit) || 0
      const credit = parseFloat(item.credit) || 0
      const solde = debit - credit
      
      if (solde > 0) {
        breakdown[accountNumber] = {
          label: item.label || `Compte ${accountNumber}`,
          amount: Math.round(solde * 100) / 100
        }
      }
    }
  })
  
  return breakdown
}
