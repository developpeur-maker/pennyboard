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
    message: 'Test des endpoints spécifiques à l\'entreprise DIMO DIAGNOSTIC',
    baseUrl: PENNYLANE_BASE_URL,
    companyId: null,
    companyName: null,
    workingEndpoints: [],
    failedEndpoints: [],
    summary: {}
  }

  // D'abord, récupérer l'ID de l'entreprise
  try {
    console.log('🔍 Récupération de l\'ID entreprise...')
    const meResponse = await fetch(`${PENNYLANE_BASE_URL}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PENNYLANE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })

    const meData = await meResponse.json()
    results.companyId = meData.company?.id
    results.companyName = meData.company?.name

    if (!results.companyId) {
      return res.status(200).json({
        ...results,
        error: 'Impossible de récupérer l\'ID de l\'entreprise'
      })
    }

    console.log(`✅ Entreprise trouvée: ${results.companyName} (ID: ${results.companyId})`)

  } catch (error) {
    return res.status(200).json({
      ...results,
      error: `Erreur lors de la récupération de l'entreprise: ${error.message}`
    })
  }

  // Endpoints spécifiques à l'entreprise à tester
  const companyEndpoints = [
    // Endpoints avec ID entreprise
    `companies/${results.companyId}`,
    `companies/${results.companyId}/accounts`,
    `companies/${results.companyId}/balance-sheet`,
    `companies/${results.companyId}/income-statement`,
    `companies/${results.companyId}/cash-flow`,
    `companies/${results.companyId}/trial-balance`,
    `companies/${results.companyId}/transactions`,
    `companies/${results.companyId}/invoices`,
    `companies/${results.companyId}/customer_invoices`,
    `companies/${results.companyId}/supplier_invoices`,
    `companies/${results.companyId}/customers`,
    `companies/${results.companyId}/suppliers`,
    `companies/${results.companyId}/bank-accounts`,
    `companies/${results.companyId}/reports`,
    `companies/${results.companyId}/reports/balance-sheet`,
    `companies/${results.companyId}/reports/income-statement`,
    `companies/${results.companyId}/reports/cash-flow`,
    `companies/${results.companyId}/reports/trial-balance`,
    
    // Endpoints avec paramètres d'entreprise
    `accounts?company_id=${results.companyId}`,
    `balance-sheet?company_id=${results.companyId}`,
    `income-statement?company_id=${results.companyId}`,
    `transactions?company_id=${results.companyId}`,
    `invoices?company_id=${results.companyId}`,
    `customer_invoices?company_id=${results.companyId}`,
    `supplier_invoices?company_id=${results.companyId}`,
    `customers?company_id=${results.companyId}`,
    `suppliers?company_id=${results.companyId}`,
    `bank-accounts?company_id=${results.companyId}`,
    
    // Endpoints de rapports avec paramètres
    `reports?company_id=${results.companyId}`,
    `reports/balance-sheet?company_id=${results.companyId}`,
    `reports/income-statement?company_id=${results.companyId}`,
    `reports/cash-flow?company_id=${results.companyId}`,
    `reports/trial-balance?company_id=${results.companyId}`
  ]

  results.totalEndpoints = companyEndpoints.length

  for (const endpoint of companyEndpoints) {
    try {
      const url = `${PENNYLANE_BASE_URL}/${endpoint}`
      console.log(`🔍 Testing company-specific endpoint: ${endpoint}`)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PENNYLANE_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })

      const contentType = response.headers.get('content-type')
      let data = null

      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      }

      const result = {
        endpoint,
        status: response.status,
        contentType,
        hasData: response.status === 200 && data && Object.keys(data).length > 0,
        dataStructure: data ? Object.keys(data) : [],
        dataSize: data ? (Array.isArray(data) ? data.length : Object.keys(data).length) : 0,
        sampleData: null,
        error: response.status >= 400 ? (data?.error || response.statusText) : null
      }

      // Échantillon de données (limité)
      if (response.status === 200 && data) {
        if (Array.isArray(data)) {
          result.sampleData = data.slice(0, 2)
        } else if (data.data && Array.isArray(data.data)) {
          result.sampleData = data.data.slice(0, 2)
        } else {
          result.sampleData = data
        }
      }

      if (response.status === 200 && result.hasData) {
        results.workingEndpoints.push(result)
      } else {
        results.failedEndpoints.push(result)
      }

    } catch (error) {
      results.failedEndpoints.push({
        endpoint,
        status: 'ERROR',
        error: error.message
      })
    }
  }

  // Résumé
  results.summary = {
    companyId: results.companyId,
    companyName: results.companyName,
    totalTested: companyEndpoints.length,
    working: results.workingEndpoints.length,
    failed: results.failedEndpoints.length,
    successRate: `${Math.round((results.workingEndpoints.length / companyEndpoints.length) * 100)}%`,
    workingEndpointNames: results.workingEndpoints.map(e => e.endpoint),
    recommendations: results.workingEndpoints.length > 0 
      ? `Utiliser les ${results.workingEndpoints.length} endpoints spécifiques à l'entreprise qui fonctionnent`
      : 'Aucun endpoint spécifique à l\'entreprise trouvé - vérifier les permissions ou la structure de l\'API',
    nextSteps: results.workingEndpoints.length > 0 
      ? 'Adapter le dashboard pour utiliser les endpoints spécifiques à l\'entreprise'
      : 'Les endpoints spécifiques à l\'entreprise ne sont pas disponibles avec cette clé API'
  }

  res.status(200).json(results)
}
