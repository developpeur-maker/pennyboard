// API de synchronisation complète Payfit (tous les mois depuis 2021)
// Route temporaire pour resynchroniser toutes les données Payfit
// ⚠️ ATTENTION: Cette route peut prendre beaucoup de temps et être rate limited
// À supprimer après la synchronisation initiale
const { Pool } = require('pg')
const PAYFIT_CONFIG = require('../config/payfit')

// Fonction pour récupérer les données comptables Payfit
async function fetchPayfitAccounting(companyId, date) {
  const url = `${PAYFIT_CONFIG.BASE_URL}/companies/${companyId}/accounting-v2?date=${date}`

  console.log(`📊 Récupération des données comptables Payfit pour l'entreprise ${companyId}, date ${date}`)
  console.log(`📡 URL: ${url}`)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PAYFIT_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Erreur API Payfit: ${response.status} - ${errorText}`)
      throw new Error(`Erreur API Payfit: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`✅ Données Payfit récupérées pour ${date}`)
    
    return data
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des données comptables Payfit:', error)
    throw error
  }
}

// Fonction pour traiter les données et calculer les salaires/cotisations par collaborateur
// (Copiée de sync-payfit.js)
function processPayfitData(accountingData) {
  const employeesMap = new Map()

  // La structure peut être soit un objet avec des codes comptables comme clés,
  // soit directement un tableau d'opérations
  let allOperations = []

  if (Array.isArray(accountingData)) {
    allOperations = accountingData
  } else {
    Object.values(accountingData).forEach((operations) => {
      if (Array.isArray(operations)) {
        allOperations.push(...operations)
      }
    })
  }

  // Liste complète des comptes comptables liés aux salaires et cotisations
  const salaryAccounts = [
    '4210000', // Personnel - remunerations dues (salaire net)
    '4250000', // Personnel - Avances et acomptes
    '4270000', // Personnel - Oppositions
    '6411000', // Dimo Diagnostic salaire
    '6413000', // Primes et gratifications
    '6414000', // Indemnites et avantages divers
    '6417000', // Avantages en nature
    '6417100', // Avantages en nature
  ]

  // Liste des comptes de cotisations à utiliser (uniquement ceux-ci)
  const contributionAccounts = [
    '6316000', // Fonds pour le paritarisme
    '6333100', // Contribution unique des employeurs à la formation professionnelle - Taxe d'apprentissage
    '6333200', // Contribution unique des employeurs à la formation professionnelle - Formation professionnelle continue
    '6451000', // Cotisations à l'Urssaf
    '6458200', // Cotisations AGIRC-ARRCO
    '6458400', // Cotisations prevoyance
    '6458500', // Cotisations mutuelle
  ]

  // Liste des comptes à inclure dans le total brut global (masse salariale)
  const grossCostAccounts = [
    '6252000', // Notes de frais
    '6411000', // Dimo Diagnostic salaire
    '6412000', // Congés payés
    '6413000', // Primes et gratifications
    '6414000', // Indemnites et avantages divers
    '6417000', // Avantages en nature
    '6417100', // Avantages en nature
    '6316000', // Fonds pour le paritarisme
    '6333100', // Contribution unique des employeurs à la formation professionnelle - Taxe d'apprentissage
    '6333200', // Contribution unique des employeurs à la formation professionnelle - Formation professionnelle continue
    '6451000', // Cotisations à l'Urssaf
    '6458200', // Cotisations AGIRC-ARRCO
    '6458400', // Cotisations prevoyance
    '6458500', // Cotisations mutuelle
    '6580100', // Regularisation net a payer - moins perçu
  ]

  // Parcourir toutes les opérations
  allOperations.forEach((operation) => {
    const accountId = String(operation.accountId || '')
    const accountName = String(operation.accountName || '').toUpperCase()

    // Vérifier si c'est un compte de tiers (421, 425, 427)
    const isTierAccount = accountId === '4210000' || accountId === '4250000' || accountId === '4270000'
    
    // Vérifier si c'est un compte de charge (641)
    const isChargeAccount = accountId.startsWith('641')
    
    // Vérifier si c'est un compte de cotisation
    const isContributionAccount = contributionAccounts.includes(accountId)
    
    // Vérifier si c'est un compte de masse salariale
    const isGrossCostAccount = grossCostAccounts.includes(accountId)
    
    // Comptes de détail uniquement (pour les opérations)
    const isDetailOnlyAccount = accountId.startsWith('625') && accountName.includes('FRAIS')

    const isSalaryRelated = isTierAccount || isChargeAccount || isContributionAccount || isGrossCostAccount || isDetailOnlyAccount

    if (isSalaryRelated && operation.employeeFullName) {
      const employeeName = operation.employeeFullName
      const contractId = operation.contractId || 'unknown'
      const employeeKey = `${employeeName}_${contractId}`

      if (!employeesMap.has(employeeKey)) {
        employeesMap.set(employeeKey, {
          employeeName,
          contractId,
          salaryPaid: 0,           // 421 + 425 (salaire réellement versé)
          totalPrimes: 0,          // 6413000 uniquement
          totalContributions: 0,   // Uniquement les comptes listés
          totalGrossCost: 0,       // Masse salariale (tous les comptes de charges 641 + cotisations)
          operations: []
        })
      }

      const employee = employeesMap.get(employeeKey)
      employee.operations.push(operation)

      // Calculer les montants
      const amount = Math.abs(operation.debit || operation.credit || 0)
      
      // Salaire du mois = 421 + 425 (comptes de tiers - montant réellement versé)
      if (accountId === '4210000' || accountId === '4250000') {
        employee.salaryPaid += amount
      }
      
      // Primes = 6413000 uniquement
      if (accountId === '6413000') {
        employee.totalPrimes += amount
      }
      
      // Cotisations = uniquement les comptes listés
      if (isContributionAccount) {
        employee.totalContributions += amount
      }
      
      // Total brut global (masse salariale) = uniquement les comptes listés dans grossCostAccounts
      // (exclut les comptes de tiers 421, 425, 427)
      if (isGrossCostAccount) {
        employee.totalGrossCost += amount
      }
    }
  })

  // Convertir la Map en tableau et trier par nom
  const employeesList = Array.from(employeesMap.values()).sort((a, b) => 
    a.employeeName.localeCompare(b.employeeName)
  )

  // Calculer les totaux globaux
  const totalSalaryPaid = employeesList.reduce((sum, emp) => sum + emp.salaryPaid, 0)
  const totalPrimes = employeesList.reduce((sum, emp) => sum + emp.totalPrimes, 0)
  const totalContributions = employeesList.reduce((sum, emp) => sum + emp.totalContributions, 0)
  const totalGrossCost = employeesList.reduce((sum, emp) => sum + emp.totalGrossCost, 0)

  return {
    employees: employeesList,
    totals: {
      totalSalaryPaid,
      totalPrimes,
      totalContributions,
      totalGrossCost,
      employeesCount: employeesList.length
    }
  }
}

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

  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.NEON_URL,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    const client = await pool.connect()

    // Vérifier que la clé API Payfit est configurée
    if (!process.env.PAYFIT_API_KEY) {
      client.release()
      return res.status(500).json({ 
        error: 'Configuration Payfit manquante',
        details: 'La clé API Payfit n\'est pas configurée'
      })
    }

    // Récupérer le companyId
    let companyId = process.env.PAYFIT_COMPANY_ID
    if (!companyId) {
      // Essayer de le récupérer via l'endpoint d'introspection
      try {
        const https = require('https')
        const introspectResponse = await new Promise((resolve, reject) => {
          const data = JSON.stringify({ token: process.env.PAYFIT_API_KEY })
          const options = {
            hostname: 'oauth.payfit.com',
            port: 443,
            path: '/introspect',
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.PAYFIT_API_KEY}`,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(data)
            }
          }
          const req = https.request(options, (res) => {
            let responseData = ''
            res.on('data', (chunk) => { responseData += chunk })
            res.on('end', () => {
              try {
                resolve(JSON.parse(responseData))
              } catch (e) {
                resolve({ data: responseData })
              }
            })
          })
          req.on('error', reject)
          req.write(data)
          req.end()
        })
        
        if (introspectResponse.company_id) {
          companyId = introspectResponse.company_id
        }
      } catch (introspectError) {
        console.error('Erreur lors de la récupération du Company ID:', introspectError)
      }
    }

    if (!companyId) {
      client.release()
      return res.status(500).json({ 
        error: 'Company ID Payfit non trouvé',
        details: 'Le Company ID n\'est pas configuré et ne peut pas être récupéré'
      })
    }

    console.log('🔄 Début de la synchronisation complète Payfit (tous les mois depuis 2021)...')

    // Récupérer TOUS les mois depuis 2021 jusqu'au mois actuel
    const monthsToSync = []
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1
    const startYear = 2021

    console.log(`📅 Synchronisation complète Payfit depuis ${startYear} jusqu'à ${currentYear}-${currentMonth.toString().padStart(2, '0')}`)

    // Synchroniser TOUS les mois depuis 2021
    for (let year = startYear; year <= currentYear; year++) {
      const maxMonth = year === currentYear ? currentMonth : 12
      
      for (let monthNumber = 1; monthNumber <= maxMonth; monthNumber++) {
        const monthFormatted = monthNumber.toString().padStart(2, '0')
        const month = `${year}-${monthFormatted}`
        
        monthsToSync.push({ month, year, monthNumber })
      }
    }

    console.log(`🔄 Synchronisation de ${monthsToSync.length} mois pour Payfit`)

    const results = []
    let successCount = 0
    let errorCount = 0

    // Synchroniser chaque mois avec un délai pour éviter les rate limits
    for (const { month, year, monthNumber } of monthsToSync) {
      try {
        // Convertir la date au format YYYYMM
        const dateFormatted = month.replace('-', '')
        
        // Récupérer les données depuis Payfit
        const accountingData = await fetchPayfitAccounting(companyId, dateFormatted)
        apiCallsCount++
        
        // Traiter les données
        const processedData = processPayfitData(accountingData)
        
        // Déterminer si c'est le mois en cours
        const isCurrentMonth = year === currentYear && monthNumber === currentDate.getMonth() + 1
        
        // Stocker dans la base de données
        await client.query(`
          INSERT INTO payfit_salaries (
            month, year, month_number, raw_accounting_data, employees_data,
            total_salaries, total_contributions, total_cost, employees_count,
            is_current_month, sync_version
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)
          ON CONFLICT (month) DO UPDATE SET
            raw_accounting_data = EXCLUDED.raw_accounting_data,
            employees_data = EXCLUDED.employees_data,
            total_salaries = EXCLUDED.total_salaries,
            total_contributions = EXCLUDED.total_contributions,
            total_cost = EXCLUDED.total_cost,
            employees_count = EXCLUDED.employees_count,
            is_current_month = EXCLUDED.is_current_month,
            sync_version = payfit_salaries.sync_version + 1,
            updated_at = CURRENT_TIMESTAMP
        `, [
          month, year, monthNumber,
          JSON.stringify(accountingData),
          JSON.stringify(processedData.employees),
          processedData.totals.totalSalaryPaid,
          processedData.totals.totalContributions,
          processedData.totals.totalGrossCost,
          processedData.totals.employeesCount,
          isCurrentMonth
        ])

        successCount++
        recordsProcessed += processedData.totals.employeesCount
        results.push({ month, status: 'success' })
        console.log(`✅ ${month} synchronisé avec succès`)

        // Délai entre les requêtes pour éviter les rate limits (augmenté pour la sync complète)
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        errorCount++
        results.push({ month, status: 'error', error: error.message })
        console.error(`❌ Erreur pour ${month}:`, error.message)
        
        // Délai même en cas d'erreur pour éviter de surcharger l'API
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Enregistrer dans les logs
    const duration = Date.now() - startTime
    await client.query(`
      INSERT INTO sync_logs (sync_type, status, message, months_synced, records_processed, api_calls_count, duration_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      'payfit_salaries_full',
      errorCount === 0 ? 'success' : (successCount > 0 ? 'partial' : 'error'),
      `Synchronisation complète Payfit: ${successCount} succès, ${errorCount} erreurs`,
      monthsToSync.map(m => m.month),
      recordsProcessed,
      apiCallsCount,
      duration
    ])

    client.release()
    await pool.end()

    res.status(200).json({
      success: true,
      message: `Synchronisation complète terminée: ${successCount} succès, ${errorCount} erreurs`,
      results,
      summary: {
        total: monthsToSync.length,
        success: successCount,
        errors: errorCount,
        recordsProcessed,
        apiCallsCount,
        durationMs: duration
      }
    })

  } catch (error) {
    console.error('❌ Erreur dans la synchronisation complète Payfit:', error)
    res.status(500).json({
      error: 'Erreur lors de la synchronisation complète',
      details: error.message,
      type: 'SYNC_PAYFIT_FULL_ERROR'
    })
  }
}

