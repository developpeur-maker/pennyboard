const PENNYLANE_API_KEY = process.env.VITE_PENNYLANE_API_KEY
const PENNYLANE_BASE_URL = 'https://app.pennylane.com/api/external/v1'

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  
  if (!PENNYLANE_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  try {
    const url = `${PENNYLANE_BASE_URL}/me`
    console.log('🔗 Me API call:', url)
    console.log('🔑 API Key:', PENNYLANE_API_KEY ? 'Present' : 'Missing')

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PENNYLANE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })

    console.log('📊 Response status:', response.status)
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()))

    const contentType = response.headers.get('content-type')
    console.log('📊 Content-Type:', contentType)

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      console.log('📊 Non-JSON response:', text.substring(0, 500))
      return res.status(response.status).json({
        error: 'Non-JSON response from Pennylane API',
        status: response.status,
        contentType: contentType,
        response: text.substring(0, 500)
      })
    }

    const data = await response.json()
    console.log('📊 Me data:', data)
    
    res.status(response.status).json(data)

  } catch (error) {
    console.error('❌ Me error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    })
  }
}
