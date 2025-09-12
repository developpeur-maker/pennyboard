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

  const results = {
    message: 'Diagnostic complet de l\'API Pennylane pour PennyBoard',
    timestamp: new Date().toISOString(),
    baseUrl: PENNYLANE_BASE_URL,
    apiKeyConfigured: !!PENNYLANE_API_KEY,
    tests: {
      connection: null,
      company: null,
      accounting: null,
      summary: null
    }
  }

  // Test 1: Connexion de base
  try {
    console.log('🔍 Test de connexion de base...')
    const response = await fetch(`${PENNYLANE_BASE_URL}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PENNYLANE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })

    const data = await response.json()
    
    results.tests.connection = {
      status: response.status,
      success: response.status === 200,
      company: data.company?.name || 'Inconnue',
      user: data.user?.email || 'Inconnu',
      error: response.status >= 400 ? data.error : null
    }
  } catch (error) {
    results.tests.connection = {
      status: 'ERROR',
      success: false,
      error: error.message
    }
  }

  // Test 2: Endpoints comptables prioritaires
  const accountingEndpoints = [
    'accounting/accounts',
    'accounting/balance-sheet', 
    'accounting/income-statement',
    'accounting/trial-balance',
    'financial-statements/balance-sheet',
    'financial-statements/income-statement',
    'reports/balance-sheet',
    'reports/income-statement',
    'accounts',
    'chart-of-accounts'
  ]

  results.tests.accounting = {
    endpoints: [],
    working: 0,
    total: accountingEndpoints.length
  }

  for (const endpoint of accountingEndpoints) {
    try {
      const response = await fetch(`${PENNYLANE_BASE_URL}/${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PENNYLANE_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })

      const data = await response.json()
      const hasData = response.status === 200 && data && Object.keys(data).length > 0

      const result = {
        endpoint,
        status: response.status,
        success: hasData,
        hasData,
        dataKeys: data ? Object.keys(data) : [],
        error: response.status >= 400 ? data.error : null
      }

      results.tests.accounting.endpoints.push(result)
      
      if (hasData) {
        results.tests.accounting.working++
      }

    } catch (error) {
      results.tests.accounting.endpoints.push({
        endpoint,
        status: 'ERROR',
        success: false,
        error: error.message
      })
    }
  }

  // Test 3: Résumé et recommandations
  const workingEndpoints = results.tests.accounting.endpoints.filter(e => e.success)
  
  results.tests.summary = {
    connectionWorking: results.tests.connection.success,
    accountingEndpointsWorking: results.tests.accounting.working,
    totalAccountingEndpoints: results.tests.accounting.total,
    successRate: `${Math.round((results.tests.accounting.working / results.tests.accounting.total) * 100)}%`,
    recommendedEndpoints: workingEndpoints.map(e => e.endpoint),
    nextSteps: workingEndpoints.length > 0 
      ? `Utiliser les ${workingEndpoints.length} endpoints comptables qui fonctionnent`
      : 'Aucun endpoint comptable disponible - vérifier les permissions API',
    dashboardStatus: workingEndpoints.length > 0 
      ? 'Prêt pour les données réelles'
      : 'Affichage des états vides'
  }

  res.status(200).json(results)
}
