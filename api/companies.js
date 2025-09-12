const PENNYLANE_API_KEY = process.env.VITE_PENNYLANE_API_KEY
const PENNYLANE_BASE_URL = 'https://app.pennylane.com/api/external/v1'

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  
  if (!PENNYLANE_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  try {
    const url = `${PENNYLANE_BASE_URL}/companies/me`
    console.log('🔗 Companies API call:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PENNYLANE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    console.log('📊 Companies response:', response.status)
    
    res.status(response.status).json(data)

  } catch (error) {
    console.error('❌ Companies error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    })
  }
}
