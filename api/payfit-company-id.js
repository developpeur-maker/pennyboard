// API Route pour récupérer le Company ID Payfit
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  try {
    // Vérifier que la clé API Payfit est configurée
    if (!process.env.PAYFIT_API_KEY) {
      return res.status(500).json({ 
        error: 'Configuration Payfit manquante',
        details: 'La clé API Payfit n\'est pas configurée'
      })
    }

    // Si PAYFIT_COMPANY_ID est directement disponible dans les variables d'environnement
    if (process.env.PAYFIT_COMPANY_ID) {
      return res.status(200).json({
        success: true,
        companyId: process.env.PAYFIT_COMPANY_ID,
        source: 'environment'
      })
    }

    // Sinon, essayer de le récupérer via l'endpoint d'introspection
    try {
      const https = require('https')
      
      const response = await new Promise((resolve, reject) => {
        const data = JSON.stringify({
          token: process.env.PAYFIT_API_KEY
        })

        const options = {
          hostname: 'oauth.payfit.com',
          port: 443,
          path: '/introspect',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.PAYFIT_API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
          }
        }

        const req = https.request(options, (res) => {
          let responseData = ''
          
          res.on('data', (chunk) => {
            responseData += chunk
          })
          
          res.on('end', () => {
            try {
              const parsedData = JSON.parse(responseData)
              resolve({
                status: res.statusCode,
                data: parsedData
              })
            } catch (parseError) {
              resolve({
                status: res.statusCode,
                data: responseData
              })
            }
          })
        })

        req.on('error', (error) => {
          reject(error)
        })

        req.write(data)
        req.end()
      })

      if (response.status === 200 && response.data && response.data.company_id) {
        return res.status(200).json({
          success: true,
          companyId: response.data.company_id,
          source: 'introspection'
        })
      } else {
        return res.status(500).json({
          error: 'Impossible de récupérer le Company ID',
          details: 'La réponse de l\'API d\'introspection ne contient pas de company_id'
        })
      }
    } catch (introspectError) {
      return res.status(500).json({
        error: 'Erreur lors de la récupération du Company ID',
        details: introspectError.message
      })
    }

  } catch (error) {
    console.error('❌ Erreur dans l\'API Payfit Company ID:', error)
    
    res.status(500).json({
      error: 'Erreur lors de la récupération du Company ID',
      details: error.message,
      type: 'PAYFIT_COMPANY_ID_ERROR'
    })
  }
}

