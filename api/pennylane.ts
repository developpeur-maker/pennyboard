// API route pour proxy Pennylane
import type { VercelRequest, VercelResponse } from '@vercel/node'

const PENNYLANE_API_KEY = process.env.VITE_PENNYLANE_API_KEY
const PENNYLANE_BASE_URL = 'https://app.pennylane.com/api/external/v1'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('🔗 API Route called:', req.url, req.method)
  console.log('🔑 API Key present:', !!PENNYLANE_API_KEY)
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Gérer les requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (!PENNYLANE_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  try {
    const { endpoint } = req.query
    const url = `${PENNYLANE_BASE_URL}/${endpoint}`

    console.log(`🔗 Proxy API call: ${url}`)

    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${PENNYLANE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    })

    const data = await response.json()

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status}`, data)
      return res.status(response.status).json(data)
    }

    console.log(`✅ API Success: ${response.status}`)
    return res.status(200).json(data)

  } catch (error) {
    console.error('❌ Proxy Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
