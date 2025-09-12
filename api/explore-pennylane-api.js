const PENNYLANE_API_KEY = process.env.VITE_PENNYLANE_API_KEY
const PENNYLANE_BASE_URL = 'https://app.pennylane.com/api/external/v1'

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (!PENNYLANE_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  // Liste exhaustive des endpoints à tester pour la comptabilité
  const endpointsToTest = [
    // Endpoints de base
    'me',
    'companies',
    'company',
    
    // Endpoints comptables principaux
    'accounts',
    'chart-of-accounts',
    'accounting/accounts',
    'accounting/chart-of-accounts',
    'accounting/balance-sheet',
    'accounting/income-statement',
    'accounting/cash-flow',
    'accounting/trial-balance',
    'accounting/general-ledger',
    'accounting/journal-entries',
    'accounting/entries',
    
    // États financiers
    'financial-statements',
    'financial-statements/balance-sheet',
    'financial-statements/income-statement',
    'financial-statements/cash-flow',
    'financial-statements/trial-balance',
    'financial-statements/profit-loss',
    'financial-statements/p-l',
    
    // Rapports
    'reports',
    'reports/balance-sheet',
    'reports/income-statement',
    'reports/cash-flow',
    'reports/trial-balance',
    'reports/profit-loss',
    'reports/p-l',
    'reports/general-ledger',
    'reports/journal',
    
    // Transactions et écritures
    'transactions',
    'entries',
    'journal-entries',
    'general-ledger',
    'trial-balance',
    
    // Données par période
    'accounting/periods',
    'accounting/fiscal-years',
    'periods',
    'fiscal-years',
    
    // Données analytiques
    'accounting/analytics',
    'analytics',
    'accounting/kpis',
    'kpis',
    
    // Données de trésorerie
    'cash-flow',
    'treasury',
    'bank-accounts',
    'accounting/bank-accounts',
    
    // Données de bilan
    'balance-sheet',
    'assets',
    'liabilities',
    'equity',
    'accounting/assets',
    'accounting/liabilities',
    'accounting/equity',
    
    // Données de résultat
    'income-statement',
    'profit-loss',
    'p-l',
    'revenue',
    'expenses',
    'accounting/revenue',
    'accounting/expenses',
    
    // Données de classe de comptes
    'accounting/classes',
    'classes',
    'accounting/class-6',
    'accounting/class-7',
    'class-6',
    'class-7',
    
    // Données de synthèse
    'summary',
    'accounting/summary',
    'dashboard',
    'accounting/dashboard'
  ]

  const results = {
    message: 'Exploration complète de l\'API Pennylane pour les données comptables',
    baseUrl: PENNYLANE_BASE_URL,
    totalEndpoints: endpointsToTest.length,
    workingEndpoints: [],
    accountingEndpoints: [],
    summary: {}
  }

  for (const endpoint of endpointsToTest) {
    try {
      const url = `${PENNYLANE_BASE_URL}/${endpoint}`
      console.log(`🔍 Testing: ${endpoint}`)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PENNYLANE_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })

      const contentType = response.headers.get('content-type')
      let data = null
      let responseText = null

      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        responseText = await response.text()
      }

      const result = {
        endpoint,
        status: response.status,
        contentType,
        hasData: false,
        dataStructure: null,
        sampleData: null,
        error: null,
        isAccounting: false
      }

      if (response.status === 200 && data) {
        result.hasData = true
        result.dataStructure = Object.keys(data)
        
        // Analyser si c'est un endpoint comptable
        const accountingKeywords = ['account', 'balance', 'revenue', 'expense', 'asset', 'liability', 'equity', 'trial', 'ledger', 'journal', 'statement', 'sheet', 'cash', 'flow', 'profit', 'loss', 'class', 'compte']
        const dataString = JSON.stringify(data).toLowerCase()
        
        result.isAccounting = accountingKeywords.some(keyword => 
          dataString.includes(keyword) || endpoint.toLowerCase().includes(keyword)
        )

        if (result.isAccounting) {
          results.accountingEndpoints.push(endpoint)
        }

        results.workingEndpoints.push(endpoint)
        
        // Échantillon de données (limité pour éviter les réponses trop lourdes)
        if (Array.isArray(data)) {
          result.sampleData = data.slice(0, 3)
        } else if (data.data && Array.isArray(data.data)) {
          result.sampleData = data.data.slice(0, 3)
        } else {
          result.sampleData = data
        }
      } else if (response.status >= 400) {
        result.error = data?.error || responseText?.substring(0, 200) || response.statusText
      }

      results[endpoint] = result

    } catch (error) {
      console.error(`❌ Error testing ${endpoint}:`, error)
      results[endpoint] = {
        endpoint,
        status: 'ERROR',
        error: error.message
      }
    }
  }

  // Résumé des résultats
  results.summary = {
    totalTested: endpointsToTest.length,
    workingEndpoints: results.workingEndpoints.length,
    accountingEndpoints: results.accountingEndpoints.length,
    successRate: `${Math.round((results.workingEndpoints.length / endpointsToTest.length) * 100)}%`,
    recommendedEndpoints: results.accountingEndpoints.slice(0, 10), // Top 10 des endpoints comptables
    nextSteps: results.accountingEndpoints.length > 0 
      ? 'Utiliser les endpoints comptables identifiés pour récupérer les données réelles'
      : 'Aucun endpoint comptable trouvé, vérifier les permissions API ou la documentation'
  }

  res.status(200).json(results)
}
