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

      // Récupérer les 12 derniers mois à synchroniser
      const monthsToSync = []
      const currentDate = new Date()
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const month = date.toISOString().slice(0, 7) // Format YYYY-MM
        const year = date.getFullYear()
        const monthNumber = date.getMonth() + 1
        
        monthsToSync.push({ month, year, monthNumber, date })
      }

      console.log(`📅 Synchronisation de ${monthsToSync.length} mois:`, monthsToSync.map(m => m.month))

      // Synchroniser chaque mois
      for (const { month, year, monthNumber, date } of monthsToSync) {
        console.log(`🔄 Synchronisation du mois ${month}...`)
        
        try {
          // Calculer les dates de début et fin du mois
          const startDate = new Date(year, monthNumber - 1, 1).toISOString().split('T')[0]
          const endDate = new Date(year, monthNumber, 0).toISOString().split('T')[0]
          
          console.log(`📊 Récupération du trial balance pour ${startDate} à ${endDate}`)
          
          // Récupérer les vraies données Pennylane
          const trialBalance = await getTrialBalanceFromPennylane(startDate, endDate)
          console.log(`📊 Trial balance reçu:`, {
            hasItems: !!trialBalance.items,
            itemsLength: trialBalance.items?.length || 0,
            firstItem: trialBalance.items?.[0] || null
          })
          
          // Calculer les KPIs à partir du trial balance
          const kpis = calculateKPIsFromTrialBalance(trialBalance, month)
          const chargesBreakdown = calculateChargesBreakdown(trialBalance)
          const revenusBreakdown = calculateRevenusBreakdown(trialBalance)
          const tresorerieBreakdown = calculateTresorerieBreakdown(trialBalance)
          
          console.log(`📊 KPIs calculés pour ${month}:`, kpis)
          console.log(`📊 Breakdowns calculés:`, {
            charges: Object.keys(chargesBreakdown).length,
            revenus: Object.keys(revenusBreakdown).length,
            tresorerie: Object.keys(tresorerieBreakdown).length
          })
          
          // Déterminer si c'est le mois actuel
          const isCurrentMonth = month === currentDate.toISOString().slice(0, 7)
          
          console.log(`💾 Stockage en base de données pour ${month}...`)
          
          // Stocker dans la base de données
          const insertResult = await client.query(`
            INSERT INTO monthly_data (
              month, year, month_number, trial_balance, kpis, 
              charges_breakdown, revenus_breakdown, tresorerie_breakdown,
              is_current_month, sync_version
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)
            ON CONFLICT (month) DO UPDATE SET
              trial_balance = $4,
              kpis = $5,
              charges_breakdown = $6,
              revenus_breakdown = $7,
              tresorerie_breakdown = $8,
              is_current_month = $9,
              sync_version = monthly_data.sync_version + 1,
              updated_at = CURRENT_TIMESTAMP
          `, [
            month, year, monthNumber,
            JSON.stringify(trialBalance),
            JSON.stringify(kpis),
            JSON.stringify(chargesBreakdown),
            JSON.stringify(revenusBreakdown),
            JSON.stringify(tresorerieBreakdown),
            isCurrentMonth
          ])
          
          console.log(`✅ Résultat de l'insertion:`, {
            command: insertResult.command,
            rowCount: insertResult.rowCount,
            oid: insertResult.oid
          })
          
          recordsProcessed++
          console.log(`✅ Mois ${month} synchronisé avec succès`)
          
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
        
        console.log(`✅ Trésorerie cumulée mise à jour pour ${month}: ${cumulativeTreasury}€`)
      }

      // Vérifier les données stockées
      console.log(`🔍 Vérification des données stockées...`)
      const checkResult = await client.query('SELECT COUNT(*) as count FROM monthly_data')
      console.log(`📊 Nombre d'enregistrements dans monthly_data: ${checkResult.rows[0].count}`)
      
      if (checkResult.rows[0].count > 0) {
        const sampleData = await client.query('SELECT month, kpis FROM monthly_data LIMIT 3')
        console.log(`📊 Échantillon des données:`, sampleData.rows)
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
        duration: duration,
        recordsInDB: checkResult.rows[0].count
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

// Fonction pour récupérer les données Pennylane via l'endpoint Vercel
async function getTrialBalanceFromPennylane(startDate, endDate) {
  try {
    console.log(`📊 Appel de l'API Pennylane via Vercel pour ${startDate} à ${endDate}`)
    
    // Utiliser l'endpoint Vercel qui fonctionne
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://pennyboard.vercel.app'
    
    const url = `${baseUrl}/api/trial-balance?period_start=${startDate}&period_end=${endDate}&is_auxiliary=false&page=1&per_page=1000`
    console.log(`🔗 URL appelée: ${url}`)
    console.log(`🔑 API Key présente: ${process.env.API_KEY ? 'Oui' : 'Non'}`)
    
    const response = await fetch(url, {
      headers: {
        'x-api-key': process.env.API_KEY,
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`📊 Status de la réponse: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Erreur HTTP: ${errorText}`)
      throw new Error(`Erreur API Pennylane: ${response.status} - ${response.statusText} - ${errorText}`)
    }
    
    const responseData = await response.json()
    console.log(`✅ Réponse API reçue:`, JSON.stringify(responseData, null, 2))
    
    // Extraire les vraies données depuis la structure de réponse
    const data = responseData.raw_data || responseData
    console.log(`✅ Données Pennylane extraites: ${data.items?.length || 0} comptes`)
    console.log(`📊 Structure des données:`, {
      hasRawData: !!responseData.raw_data,
      hasItems: !!data.items,
      itemsLength: data.items?.length || 0,
      firstItem: data.items?.[0] || null
    })
    
    // Si aucune donnée, lancer une erreur
    if (!data.items || data.items.length === 0) {
      console.log('⚠️ Aucune donnée Pennylane disponible')
      throw new Error('Aucune donnée disponible dans Pennylane pour cette période')
    }
    
    return data
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des données Pennylane:', error)
    console.error('❌ Stack trace:', error.stack)
    // Ne plus utiliser de données de test - propager l'erreur
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
  let tresorerie = 0
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    const debit = parseFloat(item.debits || '0')
    const credit = parseFloat(item.credits || '0')
    
    // Ventes 706 (compte 706 uniquement)
    if (accountNumber.startsWith('706')) {
      ventes_706 += credit
    }
    
    // Revenus totaux (tous les comptes de la classe 7)
    if (accountNumber.startsWith('7')) {
      revenus_totaux += credit
    }
    
    // Charges (classe 6)
    if (accountNumber.startsWith('6')) {
      charges += debit
    }
    
    // Trésorerie sera calculée séparément avec calculateCumulativeTreasury
    // Pas de calcul ici pour éviter la double comptabilisation
  })
  
  return {
    ventes_706,
    revenus_totaux,
    charges,
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
      const classCode = accountNumber.substring(0, 2)
      const debit = parseFloat(item.debits || '0')
      
      if (!breakdown[classCode]) {
        breakdown[classCode] = { total: 0, accounts: [] }
      }
      
      breakdown[classCode].total += debit
      breakdown[classCode].accounts.push({
        number: accountNumber,
        label: item.label || '',
        amount: debit
      })
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
      const classCode = accountNumber.substring(0, 3)
      const credit = parseFloat(item.credits || '0')
      
      if (!breakdown[classCode]) {
        breakdown[classCode] = { total: 0, accounts: [] }
      }
      
      breakdown[classCode].total += credit
      breakdown[classCode].accounts.push({
        number: accountNumber,
        label: item.label || '',
        amount: credit
      })
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