// Script pour vérifier les données dans la base de données
const { Pool } = require('pg')

async function checkDatabaseData() {
  console.log('🔍 Vérification des données dans la base de données...')
  
  // Charger les variables d'environnement
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
    console.log('📁 Variables d\'environnement chargées')
  }
  
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false
    }
  })
  
  try {
    const client = await pool.connect()
    console.log('✅ Connexion à la base de données réussie')
    
    // 1. Vérifier les mois disponibles
    console.log('\n📅 Mois disponibles dans la base :')
    const monthsResult = await client.query(`
      SELECT month, year, month_number, is_current_month, updated_at
      FROM monthly_data 
      ORDER BY year DESC, month_number DESC
    `)
    
    monthsResult.rows.forEach(row => {
      console.log(`  - ${row.month} (${row.year}) - Actuel: ${row.is_current_month} - Mis à jour: ${row.updated_at}`)
    })
    
    // 2. Vérifier les KPIs d'un mois spécifique
    if (monthsResult.rows.length > 0) {
      const firstMonth = monthsResult.rows[0].month
      console.log(`\n📊 KPIs pour le mois ${firstMonth} :`)
      
      const kpisResult = await client.query(`
        SELECT kpis FROM monthly_data WHERE month = $1
      `, [firstMonth])
      
      if (kpisResult.rows.length > 0) {
        const kpis = kpisResult.rows[0].kpis
        console.log('  - Ventes 706:', kpis.ventes_706 || 'N/A')
        console.log('  - Chiffre d\'affaires:', kpis.chiffre_affaires || 'N/A')
        console.log('  - Charges:', kpis.charges || 'N/A')
        console.log('  - Résultat net:', kpis.resultat_net || 'N/A')
        console.log('  - Trésorerie:', kpis.tresorerie || 'N/A')
        console.log('  - Période:', kpis.period || 'N/A')
      }
    }
    
    // 3. Vérifier les logs de synchronisation
    console.log('\n📋 Logs de synchronisation récents :')
    const logsResult = await client.query(`
      SELECT sync_type, status, message, created_at, months_synced, records_processed
      FROM sync_logs 
      ORDER BY created_at DESC 
      LIMIT 5
    `)
    
    logsResult.rows.forEach(log => {
      console.log(`  - ${log.created_at}: ${log.sync_type} - ${log.status}`)
      console.log(`    Message: ${log.message}`)
      if (log.months_synced) {
        console.log(`    Mois synchronisés: ${log.months_synced.length}`)
      }
      if (log.records_processed) {
        console.log(`    Enregistrements traités: ${log.records_processed}`)
      }
    })
    
    // 4. Vérifier le trial balance d'un mois
    if (monthsResult.rows.length > 0) {
      const firstMonth = monthsResult.rows[0].month
      console.log(`\n📋 Trial balance pour le mois ${firstMonth} :`)
      
      const trialBalanceResult = await client.query(`
        SELECT trial_balance FROM monthly_data WHERE month = $1
      `, [firstMonth])
      
      if (trialBalanceResult.rows.length > 0) {
        const trialBalance = trialBalanceResult.rows[0].trial_balance
        console.log(`  - Nombre d'éléments: ${trialBalance.items?.length || 0}`)
        
        if (trialBalance.items && trialBalance.items.length > 0) {
          console.log('  - Premiers comptes:')
          trialBalance.items.slice(0, 5).forEach((item, index) => {
            console.log(`    ${index + 1}. ${item.number} - ${item.label}`)
            console.log(`       Débit: ${item.debit || item.debits || '0'}, Crédit: ${item.credit || item.credits || '0'}`)
          })
        }
      }
    }
    
    client.release()
    console.log('\n✅ Vérification terminée')
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error)
  } finally {
    await pool.end()
  }
}

checkDatabaseData()
