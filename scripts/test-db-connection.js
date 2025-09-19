// Script de test pour la connexion à la base de données
const { Pool } = require('pg')

async function testDatabaseConnection() {
  console.log('🔍 Test de connexion à la base de données...')
  
  // Charger les variables d'environnement depuis .env.local
  const fs = require('fs')
  const path = require('path')
  
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim()
          process.env[key.trim()] = value
        }
      }
    })
    console.log('📁 Variables d\'environnement chargées depuis .env.local')
  }
  
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false
    }
  })
  
  try {
    const client = await pool.connect()
    console.log('✅ Connexion à PostgreSQL réussie !')
    
    // Tester une requête simple
    const result = await client.query('SELECT NOW()')
    console.log('⏰ Heure actuelle de la base :', result.rows[0].now)
    
    // Vérifier que les tables existent
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    console.log('📊 Tables trouvées :', tablesResult.rows.map(r => r.table_name))
    
    client.release()
    console.log('✅ Test terminé avec succès')
    return true
  } catch (error) {
    console.error('❌ Erreur de connexion :', error)
    return false
  } finally {
    await pool.end()
  }
}

testDatabaseConnection()
