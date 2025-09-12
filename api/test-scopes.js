const PENNYLANE_API_KEY = process.env.VITE_PENNYLANE_API_KEY
const PENNYLANE_BASE_URL = 'https://app.pennylane.com/api/external/v1'

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  
  if (!PENNYLANE_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  // Endpoints qui pourraient fonctionner avec les permissions actuelles
  const endpoints = [
    'me',
    'companies',
    'companies/me',
    'accounting',
    'accounting/companies',
    'accounting/companies/me',
    'invoices',
    'invoices/customer',
    'invoices/supplier',
    'financial-statements',
    'financial-statements/income-statement',
    'financial-statements/cash-flow',
    'financial-statements/balance-sheet',
    'transactions',
    'transactions/income',
    'transactions/expense',
    'chart-of-accounts',
    'accounts',
    'customers',
    'suppliers',
    'products',
    'services'
  ]

  const results = []

  for (const endpoint of endpoints) {
    try {
      const url = `${PENNYLANE_BASE_URL}/${endpoint}`
      console.log(`🔗 Testing: ${url}`)

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
        try {
          data = await response.json()
        } catch (e) {
          data = { error: 'Invalid JSON' }
        }
      } else {
        const text = await response.text()
        data = { response: text.substring(0, 200) }
      }

      results.push({
        endpoint: endpoint,
        status: response.status,
        contentType: contentType,
        data: data
      })

      console.log(`📊 ${endpoint}: ${response.status}`)

      // Si on trouve un endpoint qui fonctionne, on s'arrête
      if (response.status === 200) {
        console.log(`✅ SUCCESS with ${endpoint}!`)
        break
      }

    } catch (error) {
      results.push({
        endpoint: endpoint,
        status: 'ERROR',
        error: error.message
      })
      console.log(`❌ ${endpoint}: ${error.message}`)
    }
  }

  res.json({
    message: 'Scope test results',
    baseUrl: PENNYLANE_BASE_URL,
    results: results
  })
}
