// Route de test pour vérifier que les fonctions Vercel fonctionnent
const { VercelRequest, VercelResponse } = require('@vercel/node')

module.exports = async function handler(req, res) {
  console.log('🧪 Test route called')
  
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  return res.status(200).json({
    message: 'API Vercel fonctionne !',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  })
}
