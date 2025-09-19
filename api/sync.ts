import { NextApiRequest, NextApiResponse } from 'next'
import { initDatabase, insertMonthlyData, logSync } from '../src/lib/init-database'
import { testConnection } from '../src/lib/database'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Vérifier la clé API
  const apiKey = req.headers['x-api-key']
  if (apiKey !== process.env.API_KEY) {
    console.log('❌ Clé API invalide:', apiKey ? 'Fournie' : 'Manquante')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    console.log('🔄 Début de la synchronisation...')
    
    // Tester la connexion à la base
    const isConnected = await testConnection()
    if (!isConnected) {
      throw new Error('Impossible de se connecter à la base de données')
    }

    // Initialiser la base si nécessaire
    await initDatabase()

    // Ici, nous allons synchroniser les données
    // Pour l'instant, créons un exemple
    const exampleData = {
      kpis: {
        ventes_706: 100000,
        chiffre_affaires: 120000,
        charges: 80000,
        resultat_net: 40000,
        tresorerie: 50000
      },
      trial_balance: {
        items: [],
        total_items: 0
      },
      last_sync: new Date().toISOString()
    }

    // Insérer les données pour le mois actuel
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    await insertMonthlyData(currentMonth, exampleData)

    // Logger la synchronisation
    await logSync('monthly', 'success', `Synchronisation réussie pour ${currentMonth}`)

    res.status(200).json({ 
      success: true, 
      message: 'Synchronisation réussie',
      month: currentMonth
    })

  } catch (error) {
    console.error('❌ Erreur de synchronisation:', error)
    
    // Logger l'erreur
    await logSync('monthly', 'error', error instanceof Error ? error.message : 'Erreur inconnue')
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    })
  }
}
