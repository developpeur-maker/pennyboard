const { Pool } = require('pg')

// API Route pour récupérer les données de salaires depuis la base de données
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.NEON_URL,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    const { month } = req.query

    if (!month) {
      return res.status(400).json({ 
        error: 'Le paramètre month est requis',
        details: 'Format attendu: YYYY-MM (ex: 2025-01)'
      })
    }

    // Vérifier le format de month
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ 
        error: 'Format de month invalide',
        details: 'Format attendu: YYYY-MM (ex: 2025-01)'
      })
    }

    const client = await pool.connect()

    // Récupérer les données depuis la base de données
    const result = await client.query(`
      SELECT 
        month,
        year,
        month_number,
        employees_data,
        total_salaries,
        total_contributions,
        total_cost,
        employees_count,
        updated_at
      FROM payfit_salaries
      WHERE month = $1
    `, [month])

    client.release()
    await pool.end()

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aucune donnée trouvée pour ce mois',
        month
      })
    }

    const data = result.rows[0]
    const employees = data.employees_data || []

    // Calculer le total des primes depuis les données des employés
    const totalPrimes = employees.reduce((sum, emp) => sum + (emp.totalPrimes || 0), 0)

    res.status(200).json({
      success: true,
      month: data.month,
      year: data.year,
      monthNumber: data.month_number,
      employees: employees,
      totals: {
        totalSalaryPaid: parseFloat(data.total_salaries) || 0,  // total_salaries contient le salaire versé (421+425)
        totalPrimes: totalPrimes,
        totalContributions: parseFloat(data.total_contributions) || 0,
        totalGrossCost: parseFloat(data.total_cost) || 0,  // total_cost contient la masse salariale
        employeesCount: data.employees_count || 0
      },
      lastSyncDate: data.updated_at ? new Date(data.updated_at).toISOString() : null,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des données Payfit:', error)
    
    res.status(500).json({
      error: 'Erreur lors de la récupération des données',
      details: error.message,
      type: 'PAYFIT_SALARIES_DB_ERROR'
    })
  }
}

