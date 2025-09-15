const fetch = require('node-fetch')

module.exports = async (req, res) => {
  try {
    const API_KEY = process.env.VITE_PENNYLANE_API_KEY
    const BASE_URL = 'https://app.pennylane.com/api/external/v1'

    console.log('📅 Récupération des exercices fiscaux...')

    const response = await fetch(`${BASE_URL}/fiscal_years`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.log(`❌ Erreur ${response.status} lors de la récupération des exercices fiscaux`)
      throw new Error(`Erreur API: ${response.status}`)
    }

    const data = await response.json()
    
    console.log('✅ Exercices fiscaux récupérés avec succès')
    console.log(`📋 ${data.items ? data.items.length : 0} exercices trouvés`)

    res.status(200).json({
      success: true,
      raw_data: data,
      message: 'Exercices fiscaux récupérés avec succès'
    })

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des exercices fiscaux:', error)
    
    // Fallback : créer des exercices par défaut
    const currentYear = new Date().getFullYear()
    const fallbackData = {
      items: [
        {
          id: `${currentYear}`,
          name: `Exercice ${currentYear}`,
          start_date: `${currentYear}-01-01`,
          end_date: `${currentYear}-12-31`
        },
        {
          id: `${currentYear - 1}`,
          name: `Exercice ${currentYear - 1}`,
          start_date: `${currentYear - 1}-01-01`,
          end_date: `${currentYear - 1}-12-31`
        }
      ]
    }

    res.status(200).json({
      success: true,
      raw_data: fallbackData,
      message: 'Exercices fiscaux par défaut (fallback)',
      fallback: true
    })
  }
}
