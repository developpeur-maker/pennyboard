// API de récupération des données simplifiée
const { Pool } = require('pg')

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Vérifier la clé API
  const apiKey = req.headers['x-api-key']
  if (apiKey !== process.env.API_KEY) {
    console.log('❌ Clé API invalide:', apiKey ? 'Fournie' : 'Manquante')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { month, year, type } = req.query

    // Vérifier si c'est une requête d'année ou de mois
    if (year && type === 'year') {
      // Requête d'année
      if (!year || typeof year !== 'string') {
        return res.status(400).json({ error: 'Le paramètre "year" est requis pour les requêtes d\'année.' })
      }
      
      console.log(`📊 Récupération des données annuelles pour ${year}`)
      
      // Connexion à la base de données
      const pool = new Pool({
        connectionString: process.env.POSTGRES_URL,
        ssl: {
          rejectUnauthorized: false
        }
      })

      const client = await pool.connect()
      try {
        // Récupérer toutes les données de l'année
        const result = await client.query(`
          SELECT 
            month, year, month_number,
            trial_balance, kpis, charges_breakdown, charges_salariales_breakdown,
            revenus_breakdown, tresorerie_breakdown,
            is_current_month, updated_at
          FROM monthly_data 
          WHERE year = $1
          ORDER BY month_number ASC
        `, [year])

        if (result.rows.length === 0) {
          return res.status(404).json({ 
            error: `Aucune donnée trouvée pour l'année ${year}`,
            suggestion: 'Vérifiez que la synchronisation a été effectuée'
          })
        }

        console.log(`✅ ${result.rows.length} mois trouvés pour l'année ${year}`)
        
        return res.status(200).json({
          success: true,
          data: result.rows,
          year: year,
          months_count: result.rows.length
        })

      } finally {
        client.release()
      }
    } else {
      // Requête de mois (logique existante)
      if (!month || typeof month !== 'string') {
        return res.status(400).json({ error: 'Le paramètre "month" est requis.' })
      }

      console.log(`📊 Récupération des données pour ${month} (type: ${type || 'all'})`)
    }

    // Connexion à la base de données
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: {
        rejectUnauthorized: false
      }
    })

    const client = await pool.connect()
    try {
      // Récupérer les données du mois spécifié
      const result = await client.query(`
        SELECT 
          month, year, month_number,
          trial_balance, kpis, charges_breakdown, 
          revenus_breakdown, tresorerie_breakdown,
          is_current_month, updated_at
        FROM monthly_data 
        WHERE month = $1
      `, [month])

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          error: `Aucune donnée trouvée pour le mois ${month}`,
          suggestion: 'Vérifiez que la synchronisation a été effectuée'
        })
      }

      const data = result.rows[0]
      
      // Retourner les données selon le type demandé
      if (type === 'kpis') {
        res.status(200).json({
          month: data.month,
          kpis: data.kpis,
          is_current_month: data.is_current_month,
          updated_at: data.updated_at
        })
      } else if (type === 'breakdown') {
        res.status(200).json({
          month: data.month,
          charges_breakdown: data.charges_breakdown,
          revenus_breakdown: data.revenus_breakdown,
          tresorerie_breakdown: data.tresorerie_breakdown,
          updated_at: data.updated_at
        })
      } else if (type === 'trial_balance') {
        res.status(200).json({
          month: data.month,
          trial_balance: data.trial_balance,
          updated_at: data.updated_at
        })
      } else {
        // Retourner toutes les données
        res.status(200).json({
          month: data.month,
          year: data.year,
          month_number: data.month_number,
          kpis: data.kpis,
          charges_breakdown: data.charges_breakdown,
          revenus_breakdown: data.revenus_breakdown,
          tresorerie_breakdown: data.tresorerie_breakdown,
          trial_balance: data.trial_balance,
          is_current_month: data.is_current_month,
          updated_at: data.updated_at
        })
      }
      
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des données:', error)
    res.status(500).json({ 
      error: 'Échec de la récupération des données',
      details: error.message
    })
  }
}