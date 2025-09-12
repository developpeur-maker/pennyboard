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

  // Endpoints à tester pour les comptes comptables
  const endpointsToTest = [
    'accounts',
    'chart-of-accounts',
    'accounting/accounts',
    'financial-statements/balance-sheet',
    'reports/balance-sheet'
  ]

  const results = []

  for (const endpoint of endpointsToTest) {
    try {
      const url = `${PENNYLANE_BASE_URL}/${endpoint}`
      console.log(`🔗 Testing accounts endpoint: ${url}`)

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

      // Chercher les comptes spécifiques que nous voulons
      const targetAccounts = ['706', '701', '601', '622', '641']
      const foundAccounts = []

      if (data && data.data) {
        data.data.forEach(account => {
          if (targetAccounts.includes(account.code)) {
            foundAccounts.push({
              code: account.code,
              name: account.name,
              balance: account.balance,
              currency: account.currency
            })
          }
        })
      }

      results.push({
        endpoint,
        status: response.status,
        contentType,
        hasData: data && (data.data || data.length > 0),
        dataStructure: data ? Object.keys(data) : null,
        foundAccounts,
        sampleData: data ? (Array.isArray(data.data) ? data.data.slice(0, 3) : data) : responseText?.substring(0, 200),
        error: response.status >= 400 ? (data?.error || responseText?.substring(0, 200)) : null
      })

    } catch (error) {
      console.error(`❌ Error testing accounts endpoint ${endpoint}:`, error)
      results.push({
        endpoint,
        status: 'ERROR',
        error: error.message
      })
    }
  }

  res.status(200).json({
    message: 'Test des endpoints comptes comptables',
    baseUrl: PENNYLANE_BASE_URL,
    targetAccounts: ['706 (Prestations services)', '701 (Ventes biens)', '601 (Achats)', '622 (Charges externes)', '641 (Charges personnel)'],
    totalEndpoints: endpointsToTest.length,
    workingEndpoints: results.filter(r => r.status === 200).length,
    results
  })
}
