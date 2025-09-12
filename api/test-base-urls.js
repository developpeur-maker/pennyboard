const PENNYLANE_API_KEY = process.env.VITE_PENNYLANE_API_KEY

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  
  if (!PENNYLANE_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  // Différentes URLs de base possibles
  const baseUrls = [
    'https://app.pennylane.com/api/external/v1',
    'https://api.pennylane.com/v1',
    'https://api.pennylane.com',
    'https://app.pennylane.com/api/v1',
    'https://app.pennylane.com/api',
    'https://pennylane.com/api/v1',
    'https://pennylane.com/api'
  ]

  const results = []

  for (const baseUrl of baseUrls) {
    try {
      const url = `${baseUrl}/companies/me`
      console.log(`🔗 Testing base URL: ${url}`)

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
        baseUrl: baseUrl,
        status: response.status,
        contentType: contentType,
        data: data
      })

      console.log(`📊 ${baseUrl}: ${response.status}`)

    } catch (error) {
      results.push({
        baseUrl: baseUrl,
        status: 'ERROR',
        error: error.message
      })
      console.log(`❌ ${baseUrl}: ${error.message}`)
    }
  }

  res.json({
    message: 'Base URL test results',
    results: results
  })
}
