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

// Récupérer les infos d'un contrat (début/fin) — nécessite le scope contracts:read
async function fetchPayfitContract(companyId, contractId) {
  if (!contractId || contractId === 'unknown') return null
  const url = `${PAYFIT_CONFIG.BASE_URL}/companies/${companyId}/contracts-fr/${contractId}`

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
      if (response.status === 403) {
        console.warn(`⚠️ Scope contracts:read manquant ou contrat ${contractId} non accessible`)
      }
      return null
    }

    const data = await response.json()
    return {
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null
    }
  } catch (error) {
    console.warn(`⚠️ Erreur récupération contrat ${contractId}:`, error.message)
    return null
  }
}

// Enrichir la liste des employés avec les dates de contrat (début/fin).
// cacheDates: Map optionnelle partagée entre les mois pour n'appeler l'API Contract qu'une fois par contrat.
async function enrichEmployeesWithContractDates(companyId, employeesList, cacheDates = new Map()) {
  const uniqueContractIds = [...new Set(employeesList.map((e) => e.contractId).filter(Boolean))]

  for (const contractId of uniqueContractIds) {
    if (cacheDates.has(contractId)) continue
    const info = await fetchPayfitContract(companyId, contractId)
    cacheDates.set(contractId, info || { startDate: null, endDate: null })
    await new Promise((r) => setTimeout(r, 150))
  }

  return employeesList.map((emp) => {
    const dates = cacheDates.get(emp.contractId)
    return {
      ...emp,
      contractStartDate: dates?.startDate ?? null,
      contractEndDate: dates?.endDate ?? null
    }
  })
}

// Jours travaillés par mois : base 18,5 j (non-tech) ou 17,5 j (tech), prorata si arrivée/départ en cours de mois
const JOURS_TRAVAILLES_MOIS_NON_TECH = 18.5
const JOURS_TRAVAILLES_MOIS_TECH = 17.5
const BASE_ETP_REF = 18.5 // référence pour calcul effectif moyen (1 ETP = 18,5 j/mois)

function getTagFromEmployee(emp) {
  const ops = emp.operations || []
  for (const op of ops) {
    const codes = op.analyticCodes || []
    for (const c of codes) {
      const t = (c.type || '').toLowerCase()
      if (t === 'équipe' || t === 'equipe' || t === 'team') {
        return (c.value || '').trim()
      }
    }
  }
  return null
}

function isTech(tag) {
  return tag && String(tag).toUpperCase().includes('TECH')
}

function getLastDayOfMonth(year, monthNumber) {
  return new Date(year, monthNumber, 0).getDate()
}

function computeJoursTravaillesForMonth(year, monthNumber, contractStartDate, contractEndDate, isTech) {
  const baseJours = isTech ? JOURS_TRAVAILLES_MOIS_TECH : JOURS_TRAVAILLES_MOIS_NON_TECH
  const lastDay = getLastDayOfMonth(year, monthNumber)
  const firstDayOfMonth = new Date(year, monthNumber - 1, 1)
  const lastDayOfMonth = new Date(year, monthNumber - 1, lastDay)

  if (contractEndDate) {
    const end = new Date(contractEndDate)
    if (end < firstDayOfMonth) return 0 // contrat terminé avant ce mois
  }
  if (contractStartDate) {
    const start = new Date(contractStartDate)
    if (start > lastDayOfMonth) return 0 // contrat commence après ce mois
  }

  let effectiveFirst = 1
  let effectiveLast = lastDay

  if (contractStartDate) {
    const start = new Date(contractStartDate)
    if (start.getFullYear() === year && start.getMonth() + 1 === monthNumber) {
      effectiveFirst = start.getDate()
    }
  }

  if (contractEndDate) {
    const end = new Date(contractEndDate)
    if (end.getFullYear() === year && end.getMonth() + 1 === monthNumber) {
      effectiveLast = end.getDate()
    }
  }

  const daysInRange = Math.max(0, effectiveLast - effectiveFirst + 1)
  const prorata = daysInRange / lastDay
  return Math.round(baseJours * prorata * 100) / 100
}

function addJoursTravaillesToEmployees(employees, year, monthNumber) {
  return employees.map((emp) => {
    const tag = getTagFromEmployee(emp)
    const tech = isTech(tag)
    return {
      ...emp,
      joursTravailles: computeJoursTravaillesForMonth(year, monthNumber, emp.contractStartDate, emp.contractEndDate, tech)
    }
  })
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

    const results = []
    let successCount = 0
    let errorCount = 0
    // Cache des dates de contrat : une seule fois par contractId sur toute la sync (évite des centaines d'appels en boucle)
    const contractDatesCache = new Map()

    // Synchroniser chaque mois avec un délai pour éviter les rate limits
    for (const { month, year, monthNumber } of monthsToSync) {
      try {
        // Convertir la date au format YYYYMM
        const dateFormatted = month.replace('-', '')
        
        // Récupérer les données depuis Payfit
        const accountingData = await fetchPayfitAccounting(companyId, dateFormatted)
        
        // Traiter les données
        const processedData = processPayfitData(accountingData)
        
        // Enrichir avec les dates de contrat (réutilise le cache : appel API Contract uniquement pour les nouveaux contractIds)
        const employeesEnriched = await enrichEmployeesWithContractDates(companyId, processedData.employees, contractDatesCache)
        // Jours travaillés : 18 j/mois, prorata si arrivée/départ en cours de mois
        const employeesWithJours = addJoursTravaillesToEmployees(employeesEnriched, year, monthNumber)
        
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
          JSON.stringify(employeesWithJours),
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
    const hint = /relation "payfit_salaries"|does not exist|table.*does not exist/i.test(msg)
      ? ' Exécutez le script scripts/neon-payfit-migration.sql dans l’éditeur SQL Neon pour créer les tables.'
      : ''
    res.status(500).json({
      error: 'Erreur lors de la synchronisation',
      details: error.message + hint,
      type: 'SYNC_PAYFIT_ERROR'
    })
  }
}

