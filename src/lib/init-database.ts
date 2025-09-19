import { query } from './database'

// Script d'initialisation de la base de données
export async function initDatabase() {
  try {
    console.log('🗄️ Initialisation de la base de données...')
    
    // Créer la table monthly_data
    await query(`
      CREATE TABLE IF NOT EXISTS monthly_data (
        id SERIAL PRIMARY KEY,
        month VARCHAR(7) NOT NULL UNIQUE,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Créer la table sync_logs
    await query(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id SERIAL PRIMARY KEY,
        sync_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Créer les index pour optimiser les performances
    await query(`
      CREATE INDEX IF NOT EXISTS idx_monthly_data_month ON monthly_data(month)
    `)
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_monthly_data_updated_at ON monthly_data(updated_at)
    `)
    
    console.log('✅ Base de données initialisée avec succès')
    return true
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error)
    return false
  }
}

// Fonction pour insérer des données mensuelles
export async function insertMonthlyData(month: string, data: any) {
  try {
    const result = await query(`
      INSERT INTO monthly_data (month, data) 
      VALUES ($1, $2) 
      ON CONFLICT (month) 
      DO UPDATE SET 
        data = $2, 
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [month, JSON.stringify(data)])
    
    console.log(`✅ Données insérées pour ${month}`)
    return result.rows[0].id
  } catch (error) {
    console.error(`❌ Erreur insertion ${month}:`, error)
    throw error
  }
}

// Fonction pour récupérer les données mensuelles
export async function getMonthlyData(month: string) {
  try {
    const result = await query(`
      SELECT data, updated_at 
      FROM monthly_data 
      WHERE month = $1
    `, [month])
    
    if (result.rows.length === 0) {
      return null
    }
    
    return {
      data: result.rows[0].data,
      updated_at: result.rows[0].updated_at
    }
  } catch (error) {
    console.error(`❌ Erreur récupération ${month}:`, error)
    throw error
  }
}

// Fonction pour logger les synchronisations
export async function logSync(syncType: string, status: string, message?: string) {
  try {
    await query(`
      INSERT INTO sync_logs (sync_type, status, message) 
      VALUES ($1, $2, $3)
    `, [syncType, status, message])
    
    console.log(`📝 Log sync: ${syncType} - ${status}`)
  } catch (error) {
    console.error('❌ Erreur log sync:', error)
  }
}
