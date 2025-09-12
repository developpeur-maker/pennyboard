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

  // Endpoints basés sur la documentation officielle de Pennylane
  const officialEndpoints = [
    // Endpoints de base (documentés)
    'me',
    'companies',
    'company',
    
    // Endpoints comptables (selon la doc officielle)
    'accounting/accounts',
    'accounting/balance-sheet',
    'accounting/income-statement',
    'accounting/cash-flow',
    'accounting/trial-balance',
    'accounting/general-ledger',
    'accounting/journal-entries',
    
    // Endpoints de rapports
    'reports/balance-sheet',
    'reports/income-statement',
    'reports/cash-flow',
    'reports/trial-balance',
    'reports/general-ledger',
    
    // Endpoints de données financières
    'financial-statements',
    'financial-statements/balance-sheet',
    'financial-statements/income-statement',
    'financial-statements/cash-flow',
    'financial-statements/trial-balance',
    
    // Endpoints de transactions
    'transactions',
    'entries',
    'journal-entries',
    'general-ledger',
    
    // Endpoints de comptes
    'accounts',
    'chart-of-accounts',
    
    // Endpoints de trésorerie
    'bank-accounts',
    'cash-flow',
    'treasury'
  ]

  const results = {
    message: 'Test des endpoints officiels Pennylane selon la documentation',
    baseUrl: PENNYLANE_BASE_URL,
    documentation: 'https://pennylane.readme.io/',
    workingEndpoints: [],
    failedEndpoints: [],
    accountingData: [],
    summary: {}
  }

  for (const endpoint of officialEndpoints) {
    try {
      const url = `${PENNYLANE_BASE_URL}/${endpoint}`
      console.log(`🔍 Testing official endpoint: ${endpoint}`)

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

      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      }

      const result = {
        endpoint,
        status: response.status,
        contentType,
        hasData: response.status === 200 && data && Object.keys(data).length > 0,
        dataStructure: data ? Object.keys(data) : [],
        dataSize: data ? (Array.isArray(data) ? data.length : Object.keys(data).length) : 0,
        sampleData: null,
        error: response.status >= 400 ? (data?.error || response.statusText) : null
      }

      // Analyser les données comptables
      if (response.status === 200 && data) {
        const accountingKeywords = ['account', 'balance', 'revenue', 'expense', 'asset', 'liability', 'equity', 'trial', 'ledger', 'journal', 'statement', 'sheet', 'cash', 'flow', 'profit', 'loss', 'compte']
        const dataString = JSON.stringify(data).toLowerCase()
        
        const hasAccountingData = accountingKeywords.some(keyword => 
          dataString.includes(keyword) || endpoint.toLowerCase().includes(keyword)
        )

        if (hasAccountingData) {
          result.isAccounting = true
          results.accountingData.push(result)
        }

        // Échantillon de données (limité)
        if (Array.isArray(data)) {
          result.sampleData = data.slice(0, 2)
        } else if (data.data && Array.isArray(data.data)) {
          result.sampleData = data.data.slice(0, 2)
        } else {
          result.sampleData = data
        }
      }

      if (response.status === 200 && result.hasData) {
        results.workingEndpoints.push(result)
      } else {
        results.failedEndpoints.push(result)
      }

    } catch (error) {
      results.failedEndpoints.push({
        endpoint,
        status: 'ERROR',
        error: error.message
      })
    }
  }

  // Résumé détaillé
  results.summary = {
    totalTested: officialEndpoints.length,
    working: results.workingEndpoints.length,
    failed: results.failedEndpoints.length,
    accountingEndpoints: results.accountingData.length,
    successRate: `${Math.round((results.workingEndpoints.length / officialEndpoints.length) * 100)}%`,
    topAccountingEndpoints: results.accountingData.slice(0, 5).map(e => ({
      endpoint: e.endpoint,
      dataSize: e.dataSize,
      dataStructure: e.dataStructure
    })),
    recommendations: results.accountingData.length > 0 
      ? `Utiliser les ${results.accountingData.length} endpoints comptables identifiés`
      : 'Aucun endpoint comptable trouvé - vérifier les permissions ou la documentation'
  }

  res.status(200).json(results)
}
