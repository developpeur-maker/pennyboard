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

// Récupère tous les meal vouchers du mois (vouchersCount = jours travaillés)
// Pagination avec maxResults=50 et nextPageToken
async function fetchPayfitMealVouchers(companyId, date) {
  const basePath = PAYFIT_CONFIG.ENDPOINTS.MEAL_VOUCHERS.replace('{companyId}', companyId)
  const allMealVouchers = []
  let nextPageToken = null

  do {
    const params = new URLSearchParams({ date, maxResults: String(PAYFIT_CONFIG.LIMITS.MAX_RESULTS) })
    if (nextPageToken) params.set('nextPageToken', nextPageToken)
    const url = `${PAYFIT_CONFIG.BASE_URL}${basePath}?${params}`

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
      console.error(`❌ Erreur API Payfit Meal Vouchers: ${response.status} - ${errorText}`)
      throw new Error(`Erreur API Payfit Meal Vouchers: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const list = data.mealVouchers || []
    allMealVouchers.push(...list)
    nextPageToken = (data.meta && data.meta.nextPageToken) || null
  } while (nextPageToken)

  return allMealVouchers
}

// Normaliser un nom pour le matching (aligné avec le front)
function normalizeName(name) {
  if (!name || typeof name !== 'string') return ''
  return name
    .toUpperCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

// Récupère la liste des collaborateurs Payfit (id + nom) pour faire le lien avec les meal vouchers
async function fetchPayfitCollaborators(companyId) {
  const basePath = PAYFIT_CONFIG.ENDPOINTS.COLLABORATORS.replace('{companyId}', companyId)
  const all = []
  let nextPageToken = null
  do {
    const params = new URLSearchParams({ maxResults: String(PAYFIT_CONFIG.LIMITS.MAX_RESULTS) })
    if (nextPageToken) params.set('nextPageToken', nextPageToken)
    const url = `${PAYFIT_CONFIG.BASE_URL}${basePath}?${params}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PAYFIT_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Payfit Collaborators: ${response.status} - ${err}`)
    }
    const data = await response.json()
    const list = data.data ?? data.collaborators ?? data.results ?? []
    all.push(...(Array.isArray(list) ? list : []))
    nextPageToken = data.meta?.nextPageToken ?? data.nextPageToken ?? null
  } while (nextPageToken)
  // Map normalized full name -> first matching collaborator id
  const nameToId = new Map()
  for (const c of all) {
    const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || c.name || c.fullName || ''
    if (!fullName || !c.id) continue
    const key = normalizeName(fullName)
    if (!nameToId.has(key)) nameToId.set(key, c.id)
  }
  return nameToId
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
    
    // Vérifier si c'est un compte de tiers (421, 425, 427) - pour le salaire versé
    const isTierAccount = accountId === '4210000' || accountId === '4250000' || accountId === '4270000'
    
    // Vérifier si c'est un compte de charges 641 (tous les comptes commençant par 641)
    const isChargeAccount = accountId.startsWith('641')

    // Vérifier si c'est un compte de cotisation (uniquement les comptes listés)
    const isContributionAccount = contributionAccounts.includes(accountId)

    // Vérifier si c'est un compte à inclure dans le total brut global
    const isGrossCostAccount = grossCostAccounts.includes(accountId)

    // Vérifier si c'est le compte 6580000 (pourboires et autres) - uniquement pour le détail
    const isDetailOnlyAccount = accountId === '6580000'

    // Filtrer les opérations liées aux salaires/cotisations (tiers OU charges OU cotisations OU comptes du brut global OU compte détail uniquement)
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

    // Récupérer la liste des collaborateurs une fois (pour lier collaboratorId aux employés / meal vouchers)
    let nameToCollaboratorId = new Map()
    try {
      nameToCollaboratorId = await fetchPayfitCollaborators(companyId)
      console.log(`✅ Liste collaborateurs: ${nameToCollaboratorId.size} noms mappés`)
    } catch (collabErr) {
      console.warn('⚠️ Liste collaborateurs non récupérée (collaboratorId non renseigné):', collabErr.message)
    }

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
        // Enrichir chaque employé avec collaboratorId (pour taux journalier / jours diagnostiqueurs)
        processedData.employees.forEach((emp) => {
          emp.collaboratorId = nameToCollaboratorId.get(normalizeName(emp.employeeName)) || null
        })
        
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

        // Récupérer et stocker les jours travaillés (meal vouchers) pour ce mois
        try {
          const mealVouchers = await fetchPayfitMealVouchers(companyId, dateFormatted)
          for (const row of mealVouchers) {
            await client.query(`
              INSERT INTO payfit_meal_vouchers (month, collaborator_id, vouchers_count)
              VALUES ($1, $2, $3)
              ON CONFLICT (month, collaborator_id) DO UPDATE SET
                vouchers_count = EXCLUDED.vouchers_count,
                updated_at = CURRENT_TIMESTAMP
            `, [month, row.collaboratorId, row.vouchersCount ?? 0])
          }
          if (mealVouchers.length > 0) {
            console.log(`✅ ${month} meal vouchers: ${mealVouchers.length} collaborateurs`)
          }
        } catch (mvErr) {
          console.warn(`⚠️ Meal vouchers non récupérés pour ${month}:`, mvErr.message)
        }

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

    // Enregistrer dans les logs (ne pas faire échouer la réponse si la table/colonnes manquent)
    try {
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
        null
      ])
    } catch (logErr) {
      console.warn('⚠️ Écriture sync_logs ignorée (table ou colonnes manquantes ?):', logErr.message)
    }

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
    const msg = error.message || ''
    const hint = /relation "payfit_|does not exist|table.*does not exist/i.test(msg)
      ? ' Exécutez le script scripts/neon-payfit-migration.sql dans l’éditeur SQL Neon pour créer les tables.'
      : ''
    res.status(500).json({
      error: 'Erreur lors de la synchronisation',
      details: error.message + hint,
      type: 'SYNC_PAYFIT_ERROR'
    })
  }
}

