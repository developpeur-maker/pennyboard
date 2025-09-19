import { NextApiRequest, NextApiResponse } from 'next'
import { getMonthlyData } from '../src/lib/init-database'

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
    const { month } = req.query
    
    if (!month || typeof month !== 'string') {
      return res.status(400).json({ error: 'Month parameter required' })
    }

    console.log(`📊 Récupération des données pour ${month}...`)
    
    // Récupérer les données depuis la base
    const result = await getMonthlyData(month)
    
    if (!result) {
      return res.status(404).json({ 
        error: 'No data found for this month',
        month: month
      })
    }

    // Vérifier si les données sont récentes (moins de 12h)
    const dataAge = Date.now() - new Date(result.updated_at).getTime()
    const isStale = dataAge > 12 * 60 * 60 * 1000 // 12 heures

    res.status(200).json({
      success: true,
      month: month,
      data: result.data,
      updated_at: result.updated_at,
      is_stale: isStale,
      age_hours: Math.round(dataAge / (60 * 60 * 1000))
    })

  } catch (error) {
    console.error('❌ Erreur récupération données:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    })
  }
}
