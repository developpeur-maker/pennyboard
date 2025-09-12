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

  // Test rapide des endpoints les plus probables
  const quickTests = [
    'me',
    'companies',
    'accounting/accounts',
    'financial-statements/balance-sheet',
    'financial-statements/income-statement',
    'reports/balance-sheet',
    'reports/income-statement',
    'accounting/balance-sheet',
    'accounting/income-statement',
    'accounts',
    'chart-of-accounts',
    'trial-balance',
    'accounting/trial-balance',
    'financial-statements/trial-balance',
    'reports/trial-balance'
  ]

  const results = {
    message: 'Test rapide des endpoints comptables Pennylane',
    baseUrl: PENNYLANE_BASE_URL,
    workingEndpoints: [],
    failedEndpoints: [],
    summary: {}
  }

  for (const endpoint of quickTests) {
    try {
      const url = `${PENNYLANE_BASE_URL}/${endpoint}`
      console.log(`🔍 Quick test: ${endpoint}`)

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
        hasData: response.status === 200 && data && Object.keys(data).length > 0,
        dataKeys: data ? Object.keys(data) : [],
        sampleData: data ? (Array.isArray(data) ? data.slice(0, 2) : data) : null,
        error: response.status >= 400 ? (data?.error || response.statusText) : null
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
    totalTested: quickTests.length,
    working: results.workingEndpoints.length,
    failed: results.failedEndpoints.length,
    successRate: `${Math.round((results.workingEndpoints.length / quickTests.length) * 100)}%`,
    recommendedEndpoints: results.workingEndpoints.map(e => e.endpoint),
    nextSteps: results.workingEndpoints.length > 0 
      ? `Utiliser les ${results.workingEndpoints.length} endpoints qui fonctionnent`
      : 'Aucun endpoint comptable trouvé - vérifier les permissions API'
  }

  res.status(200).json(results)
}
