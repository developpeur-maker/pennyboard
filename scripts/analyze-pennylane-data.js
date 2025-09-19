// Script pour analyser les données de l'API Pennylane
const fs = require('fs')
const path = require('path')

// Charger les variables d'environnement
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
    console.log('📁 Variables d\'environnement chargées')
  }
}

loadEnvFile()

async function analyzePennylaneData() {
  console.log('🔍 Analyse des données Pennylane...')
  
  try {
    // Appeler l'API Pennylane pour récupérer les données réelles
    const response = await fetch('http://localhost:5173/api/trial-balance?period_start=2025-09-01&period_end=2025-09-30&page=1&per_page=100', {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('📊 Données reçues de Pennylane:')
    console.log('   - Type:', typeof data)
    console.log('   - Keys:', Object.keys(data))
    console.log('   - Structure:', JSON.stringify(data, null, 2))
    
    // Analyser la structure des données
    if (data.success && data.raw_data) {
      const rawData = data.raw_data
      console.log('\n📋 Structure des données brutes:')
      console.log('   - Type:', typeof rawData)
      console.log('   - Keys:', Object.keys(rawData))
      
      if (rawData.items) {
        console.log('   - Nombre d\'items:', rawData.items.length)
        console.log('   - Premier item:', JSON.stringify(rawData.items[0], null, 2))
      }
    }
    
    // Proposer une structure de base de données
    console.log('\n🗄️ Structure de base de données proposée:')
    console.log(`
-- Table pour les données mensuelles
CREATE TABLE monthly_data (
  id SERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL UNIQUE,
  kpis JSONB NOT NULL,           -- KPIs calculés
  trial_balance JSONB,          -- Trial balance complet
  charges_breakdown JSONB,       -- Détail des charges
  revenus_breakdown JSONB,       -- Détail des revenus
  tresorerie_breakdown JSONB,    -- Détail de la trésorerie
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour les logs de synchronisation
CREATE TABLE sync_logs (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  message TEXT,
  data_size INTEGER,            -- Taille des données synchronisées
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
    `)
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error.message)
    console.log('\n💡 Suggestion: Démarrez le serveur de développement avec "npm run dev"')
  }
}

// Exécuter l'analyse si le script est appelé directement
if (require.main === module) {
  analyzePennylaneData()
    .then(() => {
      console.log('\n🎉 Analyse terminée')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Erreur fatale:', error)
      process.exit(1)
    })
}

module.exports = analyzePennylaneData
