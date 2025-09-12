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

  // Endpoints qui devraient fonctionner avec une clé en lecture seule
  const readonlyEndpoints = [
    // Informations de base (lecture seule)
    'me',
    'companies',
    'company',
    
    // Données de consultation (lecture seule)
    'customers',
    'suppliers',
    'products',
    'services',
    'customer_invoices',
    'supplier_invoices',
    'transactions',
    'bank-accounts',
    
    // Rapports et états financiers (lecture seule)
    'reports',
    'reports/balance-sheet',
    'reports/income-statement',
    'reports/cash-flow',
    'reports/trial-balance',
    'reports/profit-loss',
    
    // Données comptables (lecture seule)
    'accounting-entries',
    'journal-entries',
    'chart-of-accounts',
    'accounts',
    'balance-sheet',
    'income-statement',
    'cash-flow',
    'trial-balance',
    
    // Données de trésorerie (lecture seule)
    'treasury',
    'cash-management',
    'bank-reconciliation',
    
    // Données analytiques (lecture seule)
    'analytics',
    'kpis',
    'metrics',
    'dashboard-data',
    
    // Périodes et exercices (lecture seule)
    'periods',
    'fiscal-years',
    'accounting-periods'
  ]

  const results = {
    message: 'Test des endpoints en lecture seule pour clé API Pennylane',
    baseUrl: PENNYLANE_BASE_URL,
    apiKeyType: 'Read-only',
    totalTested: readonlyEndpoints.length,
    workingEndpoints: [],
    failedEndpoints: [],
    summary: {}
  }

  for (const endpoint of readonlyEndpoints) {
    try {
      const url = `${PENNYLANE_BASE_URL}/${endpoint}`
      console.log(`🔍 Testing read-only endpoint: ${endpoint}`)

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
        error: response.status >= 400 ? (data?.error || response.statusText) : null,
        errorType: response.status === 403 ? 'Permission denied (read-only)' : 
                   response.status === 404 ? 'Not found' : 
                   response.status >= 400 ? 'Other error' : null
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
        error: error.message,
        errorType: 'Network error'
      })
    }
  }

  // Résumé
  results.summary = {
    totalTested: readonlyEndpoints.length,
    working: results.workingEndpoints.length,
    failed: results.failedEndpoints.length,
    successRate: `${Math.round((results.workingEndpoints.length / readonlyEndpoints.length) * 100)}%`,
    workingEndpointNames: results.workingEndpoints.map(e => e.endpoint),
    permissionErrors: results.failedEndpoints.filter(e => e.errorType === 'Permission denied (read-only)').length,
    recommendations: results.workingEndpoints.length > 0 
      ? `Utiliser les ${results.workingEndpoints.length} endpoints en lecture seule disponibles`
      : 'Aucun endpoint en lecture seule trouvé - vérifier les permissions ou la documentation',
    nextSteps: results.workingEndpoints.length > 0 
      ? 'Adapter le dashboard pour utiliser les endpoints en lecture seule disponibles'
      : 'Demander une clé API avec permissions de lecture pour les données comptables'
  }

  res.status(200).json(results)
}
