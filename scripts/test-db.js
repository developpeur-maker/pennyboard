// Script de test pour vérifier la connexion à la base de données
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Charger les variables d'environnement depuis .env.local
function loadEnvFile() {
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
  } else {
    console.log('⚠️ Fichier .env.local non trouvé')
  }
}

// Charger les variables d'environnement
loadEnvFile()

async function testDatabaseConnection() {
  console.log('🔍 Test de connexion à la base de données...')
  console.log('🔗 URL de connexion:', process.env.POSTGRES_URL ? '✅ Définie' : '❌ Non définie')
  
  if (!process.env.POSTGRES_URL) {
    console.error('❌ POSTGRES_URL non définie dans les variables d\'environnement')
    return false
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
    const result = await client.query('SELECT NOW() as current_time')
    console.log('⏰ Heure actuelle de la base :', result.rows[0].current_time)
    
    client.release()
    await pool.end()
    
    console.log('✅ Test terminé avec succès')
    return true
    
  } catch (error) {
    console.error('❌ Erreur de connexion :', error.message)
    return false
  }
}

// Exécuter le test si le script est appelé directement
if (require.main === module) {
  testDatabaseConnection()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Erreur fatale :', error)
      process.exit(1)
    })
}

module.exports = testDatabaseConnection
