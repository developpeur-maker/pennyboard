import { NextApiRequest, NextApiResponse } from 'next'
import pool from '../src/lib/database'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    const { month, type } = req.query

    if (!month || typeof month !== 'string') {
      return res.status(400).json({ error: 'Le paramètre "month" est requis.' })
    }

    console.log(`📊 Récupération des données pour ${month} (type: ${type || 'all'})`)

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
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    })
  }
}