const { Pool } = require('pg')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = '7d' // Token valide 7 jours

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' })
    }

    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL || process.env.NEON_URL,
      ssl: {
        rejectUnauthorized: false
      }
    })

    const client = await pool.connect()

    try {
      // Récupérer l'utilisateur par email
      const result = await client.query(
        'SELECT id, email, password_hash FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
      )

      if (result.rows.length === 0) {
        client.release()
        await pool.end()
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
      }

      const user = result.rows[0]

      // Vérifier le mot de passe
      const isValidPassword = await bcrypt.compare(password, user.password_hash)

      if (!isValidPassword) {
        client.release()
        await pool.end()
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
      }

      // Générer un token JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      )

      client.release()
      await pool.end()

      res.status(200).json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email
        }
      })
    } catch (error) {
      client.release()
      await pool.end()
      throw error
    }
  } catch (error) {
    console.error('❌ Erreur lors de la connexion:', error)
    res.status(500).json({
      error: 'Erreur lors de la connexion',
      details: error.message
    })
  }
}

