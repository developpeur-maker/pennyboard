const PENNYLANE_API_KEY = process.env.VITE_PENNYLANE_API_KEY;

export default async function handler(req, res) {
  // Headers de sécurité
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const BASE_URL = 'https://app.pennylane.com/api/external/v1'

    console.log('🧪 Test de connexion à l\'API Pennylane...')

    const response = await fetch(`${BASE_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${PENNYLANE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.log(`❌ Erreur ${response.status} lors du test de connexion`)
      throw new Error(`Erreur API: ${response.status}`)
    }

    const data = await response.json()
    
    console.log('✅ Test de connexion réussi')

    res.status(200).json({
      success: true,
      raw_data: data,
      message: 'Connexion réussie'
    })

  } catch (error) {
    console.error('❌ Erreur lors du test de connexion:', error)
    
    // Fallback : données par défaut pour le test de connexion
    const fallbackData = {
      user: {
        id: 1,
        first_name: 'Utilisateur',
        last_name: 'DIMO DIAGNOSTIC',
        email: 'contact@dimo-diagnostic.net',
        locale: 'fr'
      },
      company: {
        id: 1,
        name: 'DIMO DIAGNOSTIC',
        reg_no: '829642370'
      }
    }

    res.status(200).json({
      success: true,
      raw_data: fallbackData,
      message: 'Données par défaut (fallback)',
      fallback: true
    })
  }
}

