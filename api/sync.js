// API de synchronisation simplifiée
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
    console.log('🔄 Début de la synchronisation Pennylane...')

    // Connexion à la base de données
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: {
        rejectUnauthorized: false
      }
    })

    const client = await pool.connect()
    
    try {
      // Nettoyer les données de test existantes
      console.log('🧹 Nettoyage des données de test...')
      await client.query('DELETE FROM monthly_data WHERE kpis->>\'ventes_706\' = \'10000\'')
      await client.query('DELETE FROM sync_logs WHERE message LIKE \'%test%\' OR message LIKE \'%fallback%\'')
      console.log('✅ Données de test supprimées')

      // Récupérer TOUS les mois de l'année en cours (janvier à décembre) + décembre de l'année précédente
      const monthsToSync = []
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const previousYear = currentYear - 1
      
      console.log(`📅 Synchronisation de l'année en cours: ${currentYear} + décembre ${previousYear}`)
      
      // Ajouter décembre de l'année précédente
      const previousYearDecember = `${previousYear}-12`
      monthsToSync.push({ month: previousYearDecember, year: previousYear, monthNumber: 12 })
      console.log(`📊 Ajout de ${previousYearDecember} (décembre de l'année précédente) à la synchronisation`)
      
      // Synchroniser TOUS les mois de l'année en cours (1-12)
      for (let monthNumber = 1; monthNumber <= 12; monthNumber++) {
        const monthFormatted = monthNumber.toString().padStart(2, '0')
        const month = `${currentYear}-${monthFormatted}`
        const year = currentYear
        
        monthsToSync.push({ month, year, monthNumber })
        console.log(`📊 Ajout de ${month} à la synchronisation`)
      }

      console.log(`📅 Synchronisation de ${monthsToSync.length} mois:`, monthsToSync.map(m => m.month))

      // Synchroniser chaque mois
      for (const { month, year, monthNumber } of monthsToSync) {
        console.log(`🔄 Synchronisation du mois ${month}...`)
        
        try {
          // Calculer les dates de début et fin du mois
          const startDate = new Date(year, monthNumber - 1, 1).toISOString().split('T')[0]
          const endDate = new Date(year, monthNumber, 0).toISOString().split('T')[0]
          
          // Récupérer les vraies données Pennylane
          const trialBalance = await getTrialBalanceFromPennylane(startDate, endDate)
          
          // Calculer les KPIs à partir du trial balance
          const kpis = calculateKPIsFromTrialBalance(trialBalance, month)
          const chargesBreakdown = calculateChargesBreakdown(trialBalance)
          const chargesSalarialesBreakdown = calculateChargesSalarialesBreakdown(trialBalance)
          const revenusBreakdown = calculateRevenusBreakdown(trialBalance)
          const tresorerieBreakdown = calculateTresorerieBreakdown(trialBalance)
          
          // Déterminer si c'est le mois actuel
          const isCurrentMonth = month === currentDate.toISOString().slice(0, 7)
          
          // Stocker dans la base de données
          // Pour l'année en cours + décembre de l'année précédente : toujours écraser les données précédentes et recalculer les KPIs
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
              year = EXCLUDED.year,
              month_number = EXCLUDED.month_number,
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
          
        } catch (monthError) {
          console.error(`❌ Erreur pour le mois ${month}:`, monthError)
          // Continuer avec les autres mois même si un échoue
        }
      }

      // Recalculer la trésorerie cumulée pour tous les mois synchronisés
      console.log('💰 Recalcul de la trésorerie cumulée...')
      for (const monthData of monthsToSync) {
        const month = monthData.month
        const cumulativeTreasury = await calculateCumulativeTreasury(client, month)
        
        // Mettre à jour la trésorerie dans les KPIs
        await client.query(`
          UPDATE monthly_data 
          SET kpis = jsonb_set(kpis, '{tresorerie}', $1::text::jsonb)
          WHERE month = $2
        `, [cumulativeTreasury.toString(), month])
        
      }

      // Enregistrer le log de synchronisation
      const duration = Date.now() - startTime
      await client.query(`
        INSERT INTO sync_logs (sync_type, status, message, months_synced, records_processed, duration_ms, api_calls_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        'full',
        'success',
        `Synchronisation réussie de ${recordsProcessed} mois`,
        monthsToSync.map(m => m.month),
        recordsProcessed,
        duration,
        apiCallsCount
      ])

      console.log(`✅ Synchronisation terminée: ${recordsProcessed} mois, ${apiCallsCount} appels API, ${duration}ms`)
      res.status(200).json({ 
        message: 'Synchronisation réussie',
        monthsSynced: recordsProcessed,
        apiCalls: apiCallsCount,
        duration: duration
      })
      
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error)
    console.error('❌ Stack trace:', error.stack)
    console.error('❌ Détails de l\'erreur:', {
      message: error.message,
      name: error.name,
      code: error.code
    })
    
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
      `, ['full', 'error', `${error.message} | Stack: ${error.stack}`, Date.now() - startTime, apiCallsCount])
      client.release()
    } catch (logError) {
      console.error('❌ Erreur lors de l\'enregistrement du log:', logError)
    }
    
    res.status(500).json({ 
      error: 'Échec de la synchronisation',
      details: error.message,
      type: error.name
    })
  }
}

// Fonction pour récupérer les données Pennylane directement
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

// Fonctions de calcul des KPIs (simplifiées pour la synchronisation)
function calculateKPIsFromTrialBalance(trialBalance, month) {
  const items = trialBalance.items || []
  
  // Calculer les KPIs de base
  let ventes_706 = 0
  let revenus_totaux = 0
  let charges = 0
  let charges_salariales = 0
  let tresorerie = 0
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    const debit = parseFloat(item.debits || '0')
    const credit = parseFloat(item.credits || '0')
    
    // Ventes 706 (compte 706 uniquement) - Solde créditeur
    if (accountNumber.startsWith('706')) {
      ventes_706 += (credit - debit)
    }
    
    // Revenus totaux (tous les comptes de la classe 7)
    if (accountNumber.startsWith('7')) {
      revenus_totaux += (credit - debit)
    }
    
    // Charges (classe 6) - Tous les soldes (positifs et négatifs)
    if (accountNumber.startsWith('6')) {
      const solde = debit - credit
      charges += solde // Inclure tous les soldes, même négatifs
    }
    
    // Charges salariales (comptes 64x - Personnel) - Exclure les extournes (soldes négatifs)
    if (accountNumber.startsWith('64')) {
      const solde = debit - credit
      if (solde > 0) { // Seulement les soldes positifs (pas d'extournes)
        charges_salariales += solde
      }
    }
    
    
    // Trésorerie sera calculée séparément avec calculateCumulativeTreasury
    // Pas de calcul ici pour éviter la double comptabilisation
  })
  
  return {
    ventes_706,
    revenus_totaux,
    charges,
    charges_salariales,
    resultat_net: revenus_totaux - charges,
    tresorerie,
    currency: 'EUR',
    period: month
  }
}

// Fonction pour calculer la trésorerie cumulée depuis le début d'exercice
async function calculateCumulativeTreasury(client, targetMonth) {
  try {
    console.log(`💰 Calcul de la trésorerie cumulée pour ${targetMonth}`)
    
    // Récupérer l'année du mois cible
    const targetYear = targetMonth.split('-')[0]
    
    // Récupérer tous les mois depuis le début d'année jusqu'au mois cible
    const monthsQuery = `
      SELECT month, trial_balance 
      FROM monthly_data 
      WHERE year = $1 AND month <= $2
      ORDER BY month ASC
    `
    
    const monthsResult = await client.query(monthsQuery, [targetYear, targetMonth])
    
    if (monthsResult.rows.length === 0) {
      console.log('⚠️ Aucune donnée trouvée pour le calcul de trésorerie')
      return 0
    }
    
    // Calculer la trésorerie cumulée en additionnant tous les mouvements depuis le début d'exercice
    console.log(`📊 Calcul cumulé pour ${monthsResult.rows.length} mois depuis le début d'exercice`)
    
    let cumulativeTreasury = 0
    
    for (const row of monthsResult.rows) {
      const trialBalance = row.trial_balance
      const items = trialBalance.items || []
      
      // Calculer la trésorerie pour ce mois (mouvements nets)
      let monthlyTreasury = 0
      items.forEach((item) => {
        const accountNumber = item.number || ''
        if (accountNumber.startsWith('512')) {
          const debit = parseFloat(item.debits || '0')
          const credit = parseFloat(item.credits || '0')
          // Mouvement net du mois : débit - crédit
          monthlyTreasury += debit - credit
        }
      })
      
      cumulativeTreasury += monthlyTreasury
      console.log(`  - ${row.month}: ${monthlyTreasury}€ (cumulé: ${cumulativeTreasury}€)`)
    }
    
    console.log(`✅ Trésorerie cumulée calculée: ${cumulativeTreasury}€`)
    return cumulativeTreasury
    
  } catch (error) {
    console.error('❌ Erreur lors du calcul de la trésorerie cumulée:', error)
    return 0
  }
}

function calculateChargesBreakdown(trialBalance) {
  const items = trialBalance.items || []
  const breakdown = {}
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    if (accountNumber.startsWith('6')) {
      const debit = parseFloat(item.debits || '0')
      const credit = parseFloat(item.credits || '0')
      const solde = debit - credit
      
      // Utiliser le vrai libellé du compte depuis l'API Pennylane
      const label = item.label || `Compte ${accountNumber}`
      
      if (!breakdown[accountNumber]) {
        breakdown[accountNumber] = {
          number: accountNumber,
          label: label,
          amount: 0
        }
      }
      
      breakdown[accountNumber].amount += solde
    }
  })
  
  return breakdown
}

function calculateChargesSalarialesBreakdown(trialBalance) {
  const items = trialBalance.items || []
  const breakdown = {}
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    if (accountNumber.startsWith('64')) {
      const debit = parseFloat(item.debits || '0')
      const credit = parseFloat(item.credits || '0')
      const solde = debit - credit
      
      // Pour la masse salariale : seulement les soldes positifs
      if (solde > 0) {
        // Utiliser le vrai libellé du compte depuis l'API Pennylane
        const label = item.label || `Compte ${accountNumber}`
        
        breakdown[accountNumber] = {
        number: accountNumber,
          label: label,
          amount: solde
        }
      }
    }
  })
  
  return breakdown
}


function calculateRevenusBreakdown(trialBalance) {
  const items = trialBalance.items || []
  const breakdown = {}
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    if (accountNumber.startsWith('7')) {
      const debit = parseFloat(item.debits || '0')
      const credit = parseFloat(item.credits || '0')
      const amount = credit - debit
      
      // Utiliser le vrai libellé du compte depuis l'API Pennylane
      const label = item.label || `Compte ${accountNumber}`
      
      if (!breakdown[accountNumber]) {
        breakdown[accountNumber] = {
          number: accountNumber,
          label: label,
          amount: 0
        }
      }
      
      breakdown[accountNumber].amount += amount
    }
  })
  
  return breakdown
}

function calculateTresorerieBreakdown(trialBalance) {
  const items = trialBalance.items || []
  const breakdown = {}
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    if (accountNumber.startsWith('512')) {
      const debit = parseFloat(item.debits || '0')
      const credit = parseFloat(item.credits || '0')
      const balance = debit - credit
      
      if (!breakdown[accountNumber]) {
        breakdown[accountNumber] = {
          number: accountNumber,
          label: item.label || '',
          balance: 0
        }
      }
      
      breakdown[accountNumber].balance += balance
    }
  })
  
  return breakdown
}