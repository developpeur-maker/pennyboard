// Script d'initialisation de la base de données
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

async function initDatabase() {
  console.log('🗄️ Initialisation de la base de données...')
  
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    const client = await pool.connect()
    
    // Créer la table monthly_data
    await client.query(`
      CREATE TABLE IF NOT EXISTS monthly_data (
        id SERIAL PRIMARY KEY,
        month VARCHAR(7) NOT NULL UNIQUE,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Table monthly_data créée')
    
    // Créer la table sync_logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id SERIAL PRIMARY KEY,
        sync_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Table sync_logs créée')
    
    // Créer les index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_monthly_data_month ON monthly_data(month)
    `)
    console.log('✅ Index monthly_data créé')
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_monthly_data_updated_at ON monthly_data(updated_at)
    `)
    console.log('✅ Index updated_at créé')
    
    client.release()
    await pool.end()
    
    console.log('🎉 Base de données initialisée avec succès !')
    return true
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation :', error)
    return false
  }
}

// Exécuter l'initialisation si le script est appelé directement
if (require.main === module) {
  initDatabase()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Erreur fatale :', error)
      process.exit(1)
    })
}

module.exports = initDatabase
