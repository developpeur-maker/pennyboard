const PAYFIT_CONFIG = require('../config/payfit')

// Fonction pour récupérer les données comptables Payfit
async function fetchPayfitAccounting(companyId, date) {
  const url = `${PAYFIT_CONFIG.BASE_URL}/companies/${companyId}/accounting-v2?date=${date}`

  console.log(`📊 Récupération des données comptables Payfit pour l'entreprise ${companyId}`)
  console.log(`📡 URL: ${url}`)

  try {
    const response = await fetch(url, {
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
    console.log(`✅ ${Object.keys(data).length} codes comptables récupérés`)
    
    return data
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des données comptables Payfit:', error)
    throw error
  }
}

// API Route pour récupérer les données comptables
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  try {
    const { companyId, date } = req.query

    // Vérifier que companyId est fourni
    if (!companyId) {
      return res.status(400).json({ 
        error: 'companyId est requis',
        details: 'Le paramètre companyId doit être fourni dans la requête'
      })
    }

    // Vérifier que date est fourni
    if (!date) {
      return res.status(400).json({ 
        error: 'date est requis',
        details: 'Le paramètre date doit être fourni dans la requête (format: YYYYMM)'
      })
    }

    // Vérifier le format de date (YYYYMM)
    if (!/^\d{6}$/.test(date)) {
      return res.status(400).json({ 
        error: 'Format de date invalide',
        details: 'Le paramètre date doit être au format YYYYMM (ex: 202412)'
      })
    }

    // Vérifier que la clé API Payfit est configurée
    if (!process.env.PAYFIT_API_KEY) {
      return res.status(500).json({ 
        error: 'Configuration Payfit manquante',
        details: 'La clé API Payfit n\'est pas configurée'
      })
    }

    // Récupérer les données comptables
    const accountingData = await fetchPayfitAccounting(companyId, date)

    // Enregistrer la requête dans les logs
    console.log(`📊 Requête Payfit Accounting réussie pour l'entreprise ${companyId}, date ${date}`)

    res.status(200).json({
      success: true,
      companyId,
      date,
      accountingCodes: Object.keys(accountingData),
      totalCodes: Object.keys(accountingData).length,
      rawData: accountingData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Erreur dans l\'API Payfit Accounting:', error)
    
    res.status(500).json({
      error: 'Erreur lors de la récupération des données comptables',
      details: error.message,
      type: 'PAYFIT_ACCOUNTING_API_ERROR'
    })
  }
}
