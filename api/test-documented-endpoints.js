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
  // https://pennylane.readme.io/
  const documentedEndpoints = [
    // Endpoints de base (confirmés dans la doc)
    'me',
    
    // Endpoints de l'API Company (selon la doc officielle)
    'customers',
    'suppliers', 
    'products',
    'services',
    'customer_invoices',
    'supplier_invoices',
    'transactions',
    'bank-accounts',
    'accounting-entries',
    'journal-entries',
    
    // Endpoints de l'API Firm (pour les cabinets)
    'companies',
    'company',
    'firms',
    'firm',
    
    // Endpoints de rapports (mentionnés dans la doc)
    'reports',
    'reports/balance-sheet',
    'reports/income-statement',
    'reports/cash-flow',
    'reports/trial-balance',
    
    // Endpoints de données financières
    'financial-data',
    'accounting-data',
    'chart-of-accounts',
    'accounts',
    'balance-sheet',
    'income-statement',
    'cash-flow',
    'trial-balance',
    
    // Endpoints de périodes
    'periods',
    'fiscal-years',
    'accounting-periods',
    
    // Endpoints de trésorerie
    'treasury',
    'cash-management',
    'bank-reconciliation',
    
    // Endpoints de données analytiques
    'analytics',
    'kpis',
    'metrics',
    'dashboard-data'
  ]

  const results = {
    message: 'Test des endpoints documentés de l\'API Pennylane',
    baseUrl: PENNYLANE_BASE_URL,
    documentation: 'https://pennylane.readme.io/',
    totalTested: documentedEndpoints.length,
    workingEndpoints: [],
    failedEndpoints: [],
    summary: {}
  }

  for (const endpoint of documentedEndpoints) {
    try {
      const url = `${PENNYLANE_BASE_URL}/${endpoint}`
      console.log(`🔍 Testing documented endpoint: ${endpoint}`)

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

      // Échantillon de données (limité)
      if (response.status === 200 && data) {
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

  // Résumé
  results.summary = {
    totalTested: documentedEndpoints.length,
    working: results.workingEndpoints.length,
    failed: results.failedEndpoints.length,
    successRate: `${Math.round((results.workingEndpoints.length / documentedEndpoints.length) * 100)}%`,
    workingEndpointNames: results.workingEndpoints.map(e => e.endpoint),
    recommendations: results.workingEndpoints.length > 0 
      ? `Utiliser les ${results.workingEndpoints.length} endpoints documentés qui fonctionnent`
      : 'Aucun endpoint documenté trouvé - vérifier la documentation ou les permissions',
    nextSteps: results.workingEndpoints.length > 0 
      ? 'Analyser les données disponibles et adapter le dashboard'
      : 'Contacter le support Pennylane pour les permissions API'
  }

  res.status(200).json(results)
}
