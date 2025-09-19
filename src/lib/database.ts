import { Pool } from 'pg'

// Configuration de la connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

// Fonction pour tester la connexion
export async function testConnection() {
  try {
    const client = await pool.connect()
    console.log('✅ Connexion à PostgreSQL réussie')
    client.release()
    return true
  } catch (error) {
    console.error('❌ Erreur de connexion PostgreSQL:', error)
    return false
  }
}

// Fonction pour exécuter des requêtes
export async function query(text: string, params?: any[]) {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

export default pool
