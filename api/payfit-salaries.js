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
    const { month, year } = req.query

    if (!month && !year) {
      return res.status(400).json({ 
        error: 'Le paramètre month ou year est requis',
        details: 'Format attendu: month=YYYY-MM (ex: 2025-01) ou year=YYYY (ex: 2025)'
      })
    }

    const client = await pool.connect()

    let result
    let employees = []
    let totalSalaryPaid = 0
    let totalPrimes = 0
    let totalContributions = 0
    let totalGrossCost = 0
    let employeesSet = new Set()
    let lastSyncDate = null

    if (month) {
      // Mode mois : récupérer les données d'un mois spécifique
      if (!/^\d{4}-\d{2}$/.test(month)) {
        client.release()
        await pool.end()
        return res.status(400).json({ 
          error: 'Format de month invalide',
          details: 'Format attendu: YYYY-MM (ex: 2025-01)'
        })
      }

      result = await client.query(`
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

      if (result.rows.length === 0) {
        client.release()
        await pool.end()
        return res.status(404).json({
          success: false,
          error: 'Aucune donnée trouvée pour ce mois',
          month
        })
      }

      const data = result.rows[0]
      employees = data.employees_data || []
      totalSalaryPaid = parseFloat(data.total_salaries) || 0
      totalPrimes = employees.reduce((sum, emp) => sum + (emp.totalPrimes || 0), 0)
      totalContributions = parseFloat(data.total_contributions) || 0
      totalGrossCost = parseFloat(data.total_cost) || 0
      employeesSet = new Set(employees.map(emp => `${emp.employeeName}_${emp.contractId || 'unknown'}`))
      lastSyncDate = data.updated_at ? new Date(data.updated_at).toISOString() : null
    } else if (year) {
      // Mode année : agréger les données de tous les mois de l'année
      if (!/^\d{4}$/.test(year)) {
        client.release()
        await pool.end()
        return res.status(400).json({ 
          error: 'Format de year invalide',
          details: 'Format attendu: YYYY (ex: 2025)'
        })
      }

      result = await client.query(`
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
        WHERE year = $1
        ORDER BY month_number ASC
      `, [parseInt(year)])

      if (result.rows.length === 0) {
        client.release()
        await pool.end()
        return res.status(404).json({
          success: false,
          error: 'Aucune donnée trouvée pour cette année',
          year
        })
      }

      // Agréger les données de tous les mois
      const employeesMap = new Map()

      result.rows.forEach((row) => {
        const monthEmployees = row.employees_data || []
        
        // Mettre à jour la date de synchronisation la plus récente
        if (row.updated_at && (!lastSyncDate || new Date(row.updated_at) > new Date(lastSyncDate))) {
          lastSyncDate = new Date(row.updated_at).toISOString()
        }

        monthEmployees.forEach((emp) => {
          const key = `${emp.employeeName}_${emp.contractId || 'unknown'}`
          
          if (!employeesMap.has(key)) {
            employeesMap.set(key, {
              employeeName: emp.employeeName,
              contractId: emp.contractId,
              salaryPaid: 0,
              totalPrimes: 0,
              totalContributions: 0,
              totalGrossCost: 0,
              operations: []
            })
          }

          const aggregated = employeesMap.get(key)
          aggregated.salaryPaid += emp.salaryPaid || 0
          aggregated.totalPrimes += emp.totalPrimes || 0
          aggregated.totalContributions += emp.totalContributions || 0
          aggregated.totalGrossCost += emp.totalGrossCost || 0

          // Fusionner les opérations
          if (emp.operations && Array.isArray(emp.operations)) {
            aggregated.operations.push(...emp.operations)
          }
        })

        // Agréger les totaux
        totalSalaryPaid += parseFloat(row.total_salaries) || 0
        totalContributions += parseFloat(row.total_contributions) || 0
        totalGrossCost += parseFloat(row.total_cost) || 0
      })

      // Convertir la Map en tableau
      employees = Array.from(employeesMap.values())
      totalPrimes = employees.reduce((sum, emp) => sum + (emp.totalPrimes || 0), 0)
      employeesSet = new Set(employees.map(emp => `${emp.employeeName}_${emp.contractId || 'unknown'}`))
    }

    client.release()
    await pool.end()

    res.status(200).json({
      success: true,
      month: month || null,
      year: year || (month ? month.split('-')[0] : null),
      monthNumber: month ? parseInt(month.split('-')[1]) : null,
      employees: employees,
      totals: {
        totalSalaryPaid: totalSalaryPaid,
        totalPrimes: totalPrimes,
        totalContributions: totalContributions,
        totalGrossCost: totalGrossCost,
        employeesCount: employeesSet.size
      },
      lastSyncDate: lastSyncDate,
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

