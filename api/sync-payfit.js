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

  const contributionAccounts = [
    '4310000', // Urssaf - charges
    '4372000', // Caisse de retraite AGIRC-ARRCO - charges salariales
    '4375000', // Mutuelle - charges salariales
    '437200',  // Caisse de retraite AGIRC-ARRCO - charges patronales
    '4374100', // Prevoyance - charges patronales
    '437500',  // Mutuelle - charges patronales
    '437800',  // Titres-restaurant - charges patronales
    '4386000', // Organismes sociaux - charges a payer
    '4421000', // Prelevement a la source
    '6451000', // Cotisations à l'Urssaf
    '6458200', // Cotisations AGIRC-ARRCO
    '6458400', // Cotisations prevoyance
    '6458500', // Cotisations mutuelle
    '6476000', // Autres charges sociales - Titres restaurants
    '6316000', // Fonds pour le paritarisme
    '6333100', // Contribution unique des employeurs à la formation professionnelle - Taxe d'apprentissage
    '6333200', // Contribution unique des employeurs à la formation professionnelle - Formation professionnelle continue
    '6580100', // Regularisation net a payer - moins perçu
  ]

  // Parcourir toutes les opérations
  allOperations.forEach((operation) => {
    const accountId = String(operation.accountId || '')
    const accountName = String(operation.accountName || '').toUpperCase()
    
    // Vérifier si le compte est dans nos listes ou correspond à un pattern générique
    const isSalaryAccount = salaryAccounts.includes(accountId) ||
                           accountId.startsWith('421') ||
                           accountId.startsWith('425') ||
                           accountId.startsWith('427') ||
                           accountId.startsWith('641') ||
                           accountName.includes('SALAIRE') ||
                           accountName.includes('PRIME') ||
                           accountName.includes('GRATIFICATION') ||
                           accountName.includes('INDEMNITE') ||
                           accountName.includes('AVANTAGE') ||
                           (accountName.includes('REMUNERATION') && !accountName.includes('BRUT'))

    const isContributionAccount = contributionAccounts.includes(accountId) ||
                                 accountId.startsWith('431') ||
                                 accountId.startsWith('437') ||
                                 accountId.startsWith('438') ||
                                 accountId.startsWith('442') ||
                                 accountId.startsWith('645') ||
                                 accountId.startsWith('647') ||
                                 accountId.startsWith('631') ||
                                 accountId.startsWith('633') ||
                                 accountId.startsWith('658') ||
                                 accountName.includes('COTISATION') ||
                                 accountName.includes('CHARGE SOCIALE') ||
                                 accountName.includes('URSSAF') ||
                                 accountName.includes('RETRAITE') ||
                                 accountName.includes('MUTUELLE') ||
                                 accountName.includes('PREVOYANCE') ||
                                 accountName.includes('PRELEVEMENT') ||
                                 accountName.includes('FORMATION') ||
                                 accountName.includes('PARITARISME') ||
                                 accountName.includes('REGULARISATION') ||
                                 accountName.includes('TITRE') ||
                                 accountName.includes('RESTAURANT')

    const isSalaryRelated = isSalaryAccount || isContributionAccount

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
          totalContributions: 0,   // Tous les comptes de cotisations
          totalGrossCost: 0,       // Masse salariale (tous les comptes de charges)
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
      
      // Cotisations = tous les comptes de cotisations
      if (isContributionAccount) {
        employee.totalContributions += amount
      }
      
      // Total brut global (masse salariale) = tous les comptes de charges (641 + cotisations)
      if (isSalaryAccount || isContributionAccount) {
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

// API Route pour synchroniser les données Payfit
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  // Vérifier la clé API secrète
  const apiKey = req.headers['x-api-key']
  if (apiKey !== 'pennyboard_secret_key_2025') {
    return res.status(401).json({ error: 'Non autorisé' })
  }

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

    // Déterminer les mois à synchroniser (année en cours + année précédente complète)
    const monthsToSync = []
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const previousYear = currentYear - 1

    // Synchroniser TOUS les mois de l'année précédente (1-12)
    for (let monthNumber = 1; monthNumber <= 12; monthNumber++) {
      const monthFormatted = monthNumber.toString().padStart(2, '0')
      const month = `${previousYear}-${monthFormatted}`
      monthsToSync.push({ month, year: previousYear, monthNumber })
    }

    // Synchroniser TOUS les mois de l'année en cours (1-12)
    for (let monthNumber = 1; monthNumber <= 12; monthNumber++) {
      const monthFormatted = monthNumber.toString().padStart(2, '0')
      const month = `${currentYear}-${monthFormatted}`
      monthsToSync.push({ month, year: currentYear, monthNumber })
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
            raw_accounting_data = CASE 
              WHEN payfit_salaries.year = $11 OR payfit_salaries.year = $12 THEN EXCLUDED.raw_accounting_data 
              ELSE payfit_salaries.raw_accounting_data 
            END,
            employees_data = CASE 
              WHEN payfit_salaries.year = $11 OR payfit_salaries.year = $12 THEN EXCLUDED.employees_data 
              ELSE payfit_salaries.employees_data 
            END,
            total_salaries = CASE 
              WHEN payfit_salaries.year = $11 OR payfit_salaries.year = $12 THEN EXCLUDED.total_salaries 
              ELSE payfit_salaries.total_salaries 
            END,
            total_contributions = CASE 
              WHEN payfit_salaries.year = $11 OR payfit_salaries.year = $12 THEN EXCLUDED.total_contributions 
              ELSE payfit_salaries.total_contributions 
            END,
            total_cost = CASE 
              WHEN payfit_salaries.year = $11 OR payfit_salaries.year = $12 THEN EXCLUDED.total_cost 
              ELSE payfit_salaries.total_cost 
            END,
            employees_count = CASE 
              WHEN payfit_salaries.year = $11 OR payfit_salaries.year = $12 THEN EXCLUDED.employees_count 
              ELSE payfit_salaries.employees_count 
            END,
            is_current_month = CASE 
              WHEN payfit_salaries.year = $11 OR payfit_salaries.year = $12 THEN EXCLUDED.is_current_month 
              ELSE payfit_salaries.is_current_month 
            END,
            sync_version = CASE 
              WHEN payfit_salaries.year = $11 OR payfit_salaries.year = $12 THEN payfit_salaries.sync_version + 1 
              ELSE payfit_salaries.sync_version 
            END,
            updated_at = CASE 
              WHEN payfit_salaries.year = $11 OR payfit_salaries.year = $12 THEN CURRENT_TIMESTAMP 
              ELSE payfit_salaries.updated_at 
            END
        `, [
          month, year, monthNumber,
          JSON.stringify(accountingData),
          JSON.stringify(processedData.employees),
          processedData.totals.totalSalaryPaid,  // Utilisé pour total_salaries (salaire versé)
          processedData.totals.totalContributions,
          processedData.totals.totalGrossCost,    // Utilisé pour total_cost (masse salariale)
          processedData.totals.employeesCount,
          isCurrentMonth,
          currentYear,
          previousYear
        ])

        successCount++
        results.push({ month, status: 'success' })
        console.log(`✅ ${month} synchronisé avec succès`)

        // Délai entre les requêtes pour éviter les rate limits
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error) {
        errorCount++
        results.push({ month, status: 'error', error: error.message })
        console.error(`❌ Erreur pour ${month}:`, error.message)
      }
    }

    // Enregistrer dans les logs
    await client.query(`
      INSERT INTO sync_logs (sync_type, status, message, months_synced, records_processed, api_calls_count, duration_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      'payfit_salaries',
      errorCount === 0 ? 'success' : (successCount > 0 ? 'partial' : 'error'),
      `Synchronisation Payfit: ${successCount} succès, ${errorCount} erreurs`,
      monthsToSync.map(m => m.month),
      successCount,
      monthsToSync.length,
      null // Durée non calculée pour l'instant
    ])

    client.release()
    await pool.end()

    res.status(200).json({
      success: true,
      message: `Synchronisation terminée: ${successCount} succès, ${errorCount} erreurs`,
      results,
      summary: {
        total: monthsToSync.length,
        success: successCount,
        errors: errorCount
      }
    })

  } catch (error) {
    console.error('❌ Erreur dans la synchronisation Payfit:', error)
    res.status(500).json({
      error: 'Erreur lors de la synchronisation',
      details: error.message,
      type: 'SYNC_PAYFIT_ERROR'
    })
  }
}

