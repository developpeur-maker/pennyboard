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

  // Endpoints à tester pour les données financières réelles
  const endpointsToTest = [
    // Factures
    'invoices',
    'customer_invoices',
    'supplier_invoices',
    
    // Transactions
    'transactions',
    'accounting/transactions',
    
    // Comptes bancaires
    'bank-accounts',
    'bank-accounts/transactions',
    
    // États financiers
    'financial-statements',
    'reports/income-statement',
    'reports/profit-loss',
    'reports/cash-flow',
    'reports/balance-sheet',
    
    // Comptes
    'accounts',
    'chart-of-accounts',
    
    // Clients et fournisseurs
    'customers',
    'suppliers',
    
    // Produits et services
    'products',
    'services'
  ]

  const results = []

  for (const endpoint of endpointsToTest) {
    try {
      const url = `${PENNYLANE_BASE_URL}/${endpoint}`
      console.log(`🔗 Testing endpoint: ${url}`)

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

      results.push({
        endpoint,
        status: response.status,
        contentType,
        hasData: data && (data.data || data.length > 0),
        dataStructure: data ? Object.keys(data) : null,
        sampleData: data ? (Array.isArray(data.data) ? data.data.slice(0, 2) : data) : responseText?.substring(0, 200),
        error: response.status >= 400 ? (data?.error || responseText?.substring(0, 200)) : null
      })

    } catch (error) {
      console.error(`❌ Error testing endpoint ${endpoint}:`, error)
      results.push({
        endpoint,
        status: 'ERROR',
        error: error.message
      })
    }
  }

  res.status(200).json({
    message: 'Test des endpoints réels Pennylane',
    baseUrl: PENNYLANE_BASE_URL,
    totalEndpoints: endpointsToTest.length,
    workingEndpoints: results.filter(r => r.status === 200).length,
    results
  })
}
