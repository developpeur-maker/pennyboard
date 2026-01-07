const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' })
    }

    const token = authHeader.substring(7) // Enlever "Bearer "

    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      
      res.status(200).json({
        success: true,
        user: {
          id: decoded.userId,
          email: decoded.email
        }
      })
    } catch (error) {
      return res.status(401).json({ error: 'Token invalide ou expiré' })
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error)
    res.status(500).json({
      error: 'Erreur lors de la vérification',
      details: error.message
    })
  }
}

