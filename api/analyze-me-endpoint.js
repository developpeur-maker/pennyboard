const PENNYLANE_API_KEY = process.env.VITE_PENNYLANE_API_KEY
const PENNYLANE_BASE_URL = 'https://app.pennylane.com/api/external/v1'

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (!PENNYLANE_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  const results = {
    message: 'Analyse complète de l\'endpoint /me de Pennylane',
    baseUrl: PENNYLANE_BASE_URL,
    endpoint: '/me',
    analysis: {
      rawData: null,
      dataStructure: null,
      extractedInfo: null,
      potentialUse: null,
      recommendations: null
    }
  }

  try {
    console.log('🔍 Analyse de l\'endpoint /me...')
    const response = await fetch(`${PENNYLANE_BASE_URL}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PENNYLANE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })

    const data = await response.json()
    
    results.analysis.rawData = data
    results.analysis.dataStructure = {
      topLevelKeys: Object.keys(data),
      userKeys: data.user ? Object.keys(data.user) : [],
      companyKeys: data.company ? Object.keys(data.company) : [],
      totalFields: Object.keys(data).length + 
                   (data.user ? Object.keys(data.user).length : 0) + 
                   (data.company ? Object.keys(data.company).length : 0)
    }

    // Extraction des informations utiles
    results.analysis.extractedInfo = {
      company: {
        name: data.company?.name,
        id: data.company?.id,
        regNo: data.company?.reg_no,
        hasRegNo: !!data.company?.reg_no
      },
      user: {
        id: data.user?.id,
        firstName: data.user?.first_name,
        lastName: data.user?.last_name,
        email: data.user?.email,
        locale: data.user?.locale,
        fullName: data.user ? `${data.user.first_name} ${data.user.last_name}` : null
      },
      connection: {
        status: response.status,
        success: response.status === 200,
        timestamp: new Date().toISOString()
      }
    }

    // Analyse du potentiel d'utilisation
    results.analysis.potentialUse = {
      dashboardInfo: {
        companyName: data.company?.name || 'Entreprise Inconnue',
        userInfo: data.user ? `${data.user.first_name} ${data.user.last_name}` : 'Utilisateur Inconnu',
        canDisplayCompany: !!data.company?.name,
        canDisplayUser: !!(data.user?.first_name && data.user?.last_name)
      },
      businessData: {
        hasCompanyId: !!data.company?.id,
        hasRegNo: !!data.company?.reg_no,
        companyId: data.company?.id,
        regNo: data.company?.reg_no
      },
      limitations: {
        noFinancialData: true,
        noAccountingData: true,
        noTransactionData: true,
        noInvoiceData: true,
        onlyBasicInfo: true
      }
    }

    // Recommandations
    results.analysis.recommendations = {
      immediateUse: [
        'Afficher le nom de l\'entreprise dans le header du dashboard',
        'Afficher les informations utilisateur dans un profil',
        'Utiliser l\'ID entreprise pour des appels API futurs',
        'Afficher le numéro d\'enregistrement si disponible'
      ],
      dashboardEnhancement: [
        'Créer une section "Informations Entreprise"',
        'Ajouter un profil utilisateur',
        'Utiliser les données pour personnaliser l\'interface',
        'Afficher le statut de connexion API'
      ],
      nextSteps: [
        'Tester d\'autres endpoints avec l\'ID entreprise',
        'Essayer des endpoints avec des paramètres d\'entreprise',
        'Demander une clé API avec plus de permissions',
        'Créer un dashboard basique avec les informations disponibles'
      ]
    }

    // Test d'endpoints avec l'ID entreprise
    if (data.company?.id) {
      results.analysis.companySpecificEndpoints = {
        companyId: data.company.id,
        suggestedEndpoints: [
          `companies/${data.company.id}`,
          `companies/${data.company.id}/accounts`,
          `companies/${data.company.id}/balance-sheet`,
          `companies/${data.company.id}/income-statement`,
          `companies/${data.company.id}/transactions`,
          `companies/${data.company.id}/invoices`
        ]
      }
    }

  } catch (error) {
    results.analysis.error = {
      message: error.message,
      type: 'Network or API Error'
    }
  }

  res.status(200).json(results)
}
