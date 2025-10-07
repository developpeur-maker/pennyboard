const PAYFIT_CONFIG = require('../config/payfit')

// Fonction pour récupérer les collaborateurs Payfit
async function fetchPayfitCollaborators(companyId, options = {}) {
  const {
    nextPageToken,
    maxResults = PAYFIT_CONFIG.DEFAULT_PARAMS.maxResults,
    includeInProgressContracts = PAYFIT_CONFIG.DEFAULT_PARAMS.includeInProgressContracts,
    email
  } = options

  // Construire l'URL avec les paramètres
  const url = new URL(`${PAYFIT_CONFIG.BASE_URL}${PAYFIT_CONFIG.ENDPOINTS.COLLABORATORS.replace('{companyId}', companyId)}`)
  
  // Ajouter les paramètres de requête
  if (nextPageToken) {
    url.searchParams.append('nextPageToken', nextPageToken)
  }
  
  if (maxResults && maxResults !== PAYFIT_CONFIG.DEFAULT_PARAMS.maxResults) {
    url.searchParams.append('maxResults', maxResults.toString())
  }
  
  if (includeInProgressContracts !== PAYFIT_CONFIG.DEFAULT_PARAMS.includeInProgressContracts) {
    url.searchParams.append('includeInProgressContracts', includeInProgressContracts.toString())
  }
  
  if (email) {
    url.searchParams.append('email', email)
  }

  console.log(`🔍 Récupération des collaborateurs Payfit pour l'entreprise ${companyId}`)
  console.log(`📡 URL: ${url.toString()}`)

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PAYFIT_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Erreur API Payfit: ${response.status} - ${errorText}`)
      throw new Error(`Erreur API Payfit: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`✅ ${data.collaborators?.length || 0} collaborateurs récupérés`)
    
    return data
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des collaborateurs Payfit:', error)
    throw error
  }
}

// API Route pour récupérer les collaborateurs
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  try {
    const { companyId } = req.query
    const {
      nextPageToken,
      maxResults,
      includeInProgressContracts,
      email
    } = req.query

    // Vérifier que companyId est fourni
    if (!companyId) {
      return res.status(400).json({ 
        error: 'companyId est requis',
        details: 'Le paramètre companyId doit être fourni dans la requête'
      })
    }

    // Vérifier que la clé API Payfit est configurée
    if (!process.env.PAYFIT_API_KEY) {
      return res.status(500).json({ 
        error: 'Configuration Payfit manquante',
        details: 'La clé API Payfit n\'est pas configurée'
      })
    }

    // Préparer les options
    const options = {}
    
    if (nextPageToken) {
      options.nextPageToken = nextPageToken
    }
    
    if (maxResults) {
      const maxResultsNum = parseInt(maxResults)
      if (maxResultsNum > PAYFIT_CONFIG.LIMITS.MAX_RESULTS) {
        return res.status(400).json({
          error: 'maxResults trop élevé',
          details: `maxResults ne peut pas dépasser ${PAYFIT_CONFIG.LIMITS.MAX_RESULTS}`
        })
      }
      options.maxResults = maxResultsNum
    }
    
    if (includeInProgressContracts !== undefined) {
      options.includeInProgressContracts = includeInProgressContracts === 'true'
    }
    
    if (email) {
      options.email = email
    }

    // Récupérer les collaborateurs
    const collaboratorsData = await fetchPayfitCollaborators(companyId, options)

    // Enregistrer la requête dans les logs
    console.log(`📊 Requête Payfit réussie pour l'entreprise ${companyId}`)

    res.status(200).json({
      success: true,
      companyId,
      collaborators: collaboratorsData.collaborators || [],
      pagination: {
        nextPageToken: collaboratorsData.nextPageToken,
        hasMore: !!collaboratorsData.nextPageToken
      },
      total: collaboratorsData.collaborators?.length || 0,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Erreur dans l\'API Payfit:', error)
    
    res.status(500).json({
      error: 'Erreur lors de la récupération des collaborateurs',
      details: error.message,
      type: 'PAYFIT_API_ERROR'
    })
  }
}
