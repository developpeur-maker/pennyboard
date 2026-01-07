// API de synchronisation complète (tous les mois depuis 2021)
// Route temporaire pour resynchroniser toutes les données
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
    console.log('🔄 Début de la synchronisation complète Pennylane (tous les mois depuis 2021)...')

    // Connexion à la base de données
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: {
        rejectUnauthorized: false
      }
    })

    const client = await pool.connect()
    
    try {
      // Récupérer TOUS les mois depuis 2021 jusqu'au mois actuel
      const monthsToSync = []
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1
      const startYear = 2021
      
      console.log(`📅 Synchronisation complète depuis ${startYear} jusqu'à ${currentYear}-${currentMonth.toString().padStart(2, '0')}`)
      
      // Synchroniser TOUS les mois depuis 2021
      for (let year = startYear; year <= currentYear; year++) {
        const maxMonth = year === currentYear ? currentMonth : 12
        
        for (let monthNumber = 1; monthNumber <= maxMonth; monthNumber++) {
          const monthFormatted = monthNumber.toString().padStart(2, '0')
          const month = `${year}-${monthFormatted}`
          
          monthsToSync.push({ month, year, monthNumber })
          console.log(`📊 Ajout de ${month} à la synchronisation complète`)
        }
      }

      console.log(`📅 Synchronisation de ${monthsToSync.length} mois au total`)

      // Importer les fonctions nécessaires depuis sync.js
      // Note: On doit copier les fonctions car on ne peut pas les importer directement
      const getTrialBalanceFromPennylane = async (startDate, endDate) => {
        const fetch = require('node-fetch')
        const PENNYLANE_API_BASE = 'https://app.pennylane.com/api/external/v1'
        const apiKey = process.env.PENNYLANE_API_KEY

        if (!apiKey) {
          throw new Error('PENNYLANE_API_KEY non configurée')
        }

        const url = `${PENNYLANE_API_BASE}/accounting/trial-balance?start_date=${startDate}&end_date=${endDate}`
        
        console.log(`📡 Appel API Pennylane: ${url}`)
        apiCallsCount++

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ Erreur API Pennylane (${response.status}):`, errorText)
          throw new Error(`API Pennylane error: ${response.status} - ${errorText}`)
        }

        return await response.json()
      }

      // Copier les fonctions de calcul depuis sync.js
      function calculateKPIsFromTrialBalance(trialBalance, month) {
        const items = trialBalance.items || []
        
        let ventes_706 = 0
        let revenus_totaux = 0
        let charges = 0
        let charges_sans_amortissements = 0
        let charges_salariales = 0
        let tresorerie = 0
        
        items.forEach((item) => {
          const accountNumber = item.number || ''
          const debit = parseFloat(item.debits || '0')
          const credit = parseFloat(item.credits || '0')
          
          if (accountNumber.startsWith('706')) {
            ventes_706 += (credit - debit)
          }
          
          if (accountNumber.startsWith('7')) {
            revenus_totaux += (credit - debit)
          }
          
          if (accountNumber.startsWith('6')) {
            const solde = debit - credit
            charges += solde
            
            if (!accountNumber.startsWith('68')) {
              charges_sans_amortissements += solde
            }
          }
          
          if (accountNumber.startsWith('64')) {
            const solde = debit - credit
            if (solde > 0) {
              charges_salariales += solde
            }
          }
        })
        
        return {
          ventes_706,
          revenus_totaux,
          charges,
          charges_sans_amortissements,
          charges_salariales,
          resultat_net: revenus_totaux - charges,
          tresorerie,
          currency: 'EUR',
          period: month
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

      function calculateChargesSansAmortissementsBreakdown(trialBalance) {
        const items = trialBalance.items || []
        const breakdown = {}
        
        items.forEach((item) => {
          const accountNumber = item.number || ''
          if (accountNumber.startsWith('6') && !accountNumber.startsWith('68')) {
            const debit = parseFloat(item.debits || '0')
            const credit = parseFloat(item.credits || '0')
            const solde = debit - credit
            
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
            
            if (solde > 0) {
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
            const solde = credit - debit
            
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

      function calculateTresorerieBreakdown(trialBalance) {
        const items = trialBalance.items || []
        const breakdown = {}
        
        items.forEach((item) => {
          const accountNumber = item.number || ''
          if (accountNumber.startsWith('512')) {
            const debit = parseFloat(item.debits || '0')
            const credit = parseFloat(item.credits || '0')
            const balance = debit - credit
            
            const label = item.label || `Compte ${accountNumber}`
            
            breakdown[accountNumber] = {
              number: accountNumber,
              label: label,
              balance: balance
            }
          }
        })
        
        return breakdown
      }

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
          const chargesSansAmortissementsBreakdown = calculateChargesSansAmortissementsBreakdown(trialBalance)
          const chargesSalarialesBreakdown = calculateChargesSalarialesBreakdown(trialBalance)
          const revenusBreakdown = calculateRevenusBreakdown(trialBalance)
          const tresorerieBreakdown = calculateTresorerieBreakdown(trialBalance)
          
          // Déterminer si c'est le mois actuel
          const isCurrentMonth = month === currentDate.toISOString().slice(0, 7)
          
          // Pour la synchronisation complète, on met à jour TOUS les mois
          const shouldUpdate = true
          
          // Stocker dans la base de données (toujours mettre à jour)
          await client.query(`
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
              updated_at = CURRENT_TIMESTAMP
          `, [
            month,
            year,
            monthNumber,
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

          // Délai pour éviter les rate limits
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (monthError) {
          console.error(`❌ Erreur lors de la synchronisation de ${month}:`, monthError)
          // Continuer avec les autres mois même en cas d'erreur
        }
      }

      const duration = Date.now() - startTime

      // Enregistrer le log de synchronisation
      await client.query(`
        INSERT INTO sync_logs (sync_type, status, message, months_synced, records_processed, duration_ms, api_calls_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        'full_sync',
        'success',
        `Synchronisation complète réussie: ${recordsProcessed} mois synchronisés`,
        monthsToSync.length,
        recordsProcessed,
        duration,
        apiCallsCount
      ])

      client.release()
      await pool.end()

      console.log(`✅ Synchronisation complète terminée: ${recordsProcessed} mois synchronisés en ${duration}ms`)

      res.status(200).json({
        success: true,
        message: `Synchronisation complète réussie: ${recordsProcessed} mois synchronisés`,
        monthsSynced: monthsToSync.length,
        recordsProcessed,
        duration_ms: duration,
        apiCallsCount
      })

    } catch (dbError) {
      console.error('❌ Erreur base de données:', dbError)
      client.release()
      await pool.end()
      
      res.status(500).json({
        error: 'Erreur lors de la synchronisation complète',
        details: dbError.message,
        type: 'FULL_SYNC_DB_ERROR'
      })
    }
  } catch (error) {
    console.error('❌ Erreur générale de synchronisation complète:', error)
    res.status(500).json({
      error: 'Erreur lors de la synchronisation complète',
      details: error.message,
      type: 'FULL_SYNC_ERROR'
    })
  }
}

