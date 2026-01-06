// Script pour créer la table payfit_salaries dans la base de données
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

loadEnvFile()

async function createPayfitTable() {
  console.log('🗄️ Création de la table payfit_salaries...')
  
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.NEON_URL,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    const client = await pool.connect()
    
    // Créer la table payfit_salaries
    await client.query(`
      CREATE TABLE IF NOT EXISTS payfit_salaries (
        id SERIAL PRIMARY KEY,
        month VARCHAR(7) NOT NULL, -- Format: 2025-01
        year INTEGER NOT NULL,
        month_number INTEGER NOT NULL,
        
        -- Données brutes de Payfit
        raw_accounting_data JSONB NOT NULL, -- Données brutes de l'API accounting-v2
        
        -- Données traitées par collaborateur
        employees_data JSONB NOT NULL, -- Tableau des collaborateurs avec salaires et cotisations
        
        -- Totaux calculés
        total_salaries DECIMAL(15, 2) DEFAULT 0,
        total_contributions DECIMAL(15, 2) DEFAULT 0,
        total_cost DECIMAL(15, 2) DEFAULT 0,
        employees_count INTEGER DEFAULT 0,
        
        -- Métadonnées
        sync_version INTEGER DEFAULT 1,
        is_current_month BOOLEAN DEFAULT FALSE,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(month)
      )
    `)
    console.log('✅ Table payfit_salaries créée')
    
    // Créer les index pour les performances
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payfit_salaries_month ON payfit_salaries(month)
    `)
    console.log('✅ Index sur month créé')
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payfit_salaries_year ON payfit_salaries(year)
    `)
    console.log('✅ Index sur year créé')
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payfit_salaries_current ON payfit_salaries(is_current_month)
    `)
    console.log('✅ Index sur is_current_month créé')
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payfit_salaries_updated_at ON payfit_salaries(updated_at)
    `)
    console.log('✅ Index sur updated_at créé')
    
    // Index GIN pour les colonnes JSONB
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payfit_salaries_raw_data_gin ON payfit_salaries USING GIN (raw_accounting_data)
    `)
    console.log('✅ Index GIN sur raw_accounting_data créé')
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payfit_salaries_employees_gin ON payfit_salaries USING GIN (employees_data)
    `)
    console.log('✅ Index GIN sur employees_data créé')
    
    // Créer un trigger pour mettre à jour updated_at automatiquement
    await client.query(`
      CREATE OR REPLACE FUNCTION update_payfit_salaries_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `)
    console.log('✅ Fonction trigger créée')
    
    await client.query(`
      DROP TRIGGER IF EXISTS update_payfit_salaries_updated_at ON payfit_salaries;
      CREATE TRIGGER update_payfit_salaries_updated_at 
        BEFORE UPDATE ON payfit_salaries 
        FOR EACH ROW 
        EXECUTE FUNCTION update_payfit_salaries_updated_at();
    `)
    console.log('✅ Trigger créé')
    
    client.release()
    await pool.end()
    
    console.log('🎉 Table payfit_salaries créée avec succès !')
    return true
    
  } catch (error) {
    console.error('❌ Erreur lors de la création de la table :', error)
    return false
  }
}

// Exécuter si le script est appelé directement
if (require.main === module) {
  createPayfitTable()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Erreur fatale :', error)
      process.exit(1)
    })
}

module.exports = createPayfitTable

