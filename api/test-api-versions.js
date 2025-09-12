const PENNYLANE_API_KEY = process.env.VITE_PENNYLANE_API_KEY

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

  // Tester différentes versions et URLs de l'API Pennylane
  const apiVersions = [
    'https://app.pennylane.com/api/external/v1',
    'https://app.pennylane.com/api/external/v2',
    'https://app.pennylane.com/api/v1',
    'https://app.pennylane.com/api/v2',
    'https://api.pennylane.com/v1',
    'https://api.pennylane.com/v2',
    'https://app.pennylane.com/api',
    'https://api.pennylane.com',
    'https://app.pennylane.com/api/external',
    'https://app.pennylane.com/api/company',
    'https://app.pennylane.com/api/firm'
  ]

  const testEndpoints = ['me', 'companies', 'customers', 'customer_invoices']

  const results = {
    message: 'Test des différentes versions et URLs de l\'API Pennylane',
    apiKeyConfigured: !!PENNYLANE_API_KEY,
    totalVersions: apiVersions.length,
    workingVersions: [],
    failedVersions: [],
    summary: {}
  }

  for (const baseUrl of apiVersions) {
    const versionResult = {
      baseUrl,
      workingEndpoints: [],
      failedEndpoints: [],
      successRate: 0
    }

    for (const endpoint of testEndpoints) {
      try {
        const url = `${baseUrl}/${endpoint}`
        console.log(`🔍 Testing: ${url}`)

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
          hasData: response.status === 200 && data && Object.keys(data).length > 0,
          dataStructure: data ? Object.keys(data) : [],
          error: response.status >= 400 ? (data?.error || response.statusText) : null
        }

        if (response.status === 200 && result.hasData) {
          versionResult.workingEndpoints.push(result)
        } else {
          versionResult.failedEndpoints.push(result)
        }

      } catch (error) {
        versionResult.failedEndpoints.push({
          endpoint,
          status: 'ERROR',
          error: error.message
        })
      }
    }

    versionResult.successRate = Math.round((versionResult.workingEndpoints.length / testEndpoints.length) * 100)

    if (versionResult.workingEndpoints.length > 0) {
      results.workingVersions.push(versionResult)
    } else {
      results.failedVersions.push(versionResult)
    }
  }

  // Résumé
  results.summary = {
    totalVersions: apiVersions.length,
    workingVersions: results.workingVersions.length,
    failedVersions: results.failedVersions.length,
    bestVersion: results.workingVersions.length > 0 
      ? results.workingVersions.sort((a, b) => b.successRate - a.successRate)[0]
      : null,
    recommendations: results.workingVersions.length > 0 
      ? `Utiliser la version ${results.workingVersions[0].baseUrl} avec ${results.workingVersions[0].successRate}% de succès`
      : 'Aucune version d\'API fonctionnelle trouvée - vérifier la clé API ou contacter le support',
    nextSteps: results.workingVersions.length > 0 
      ? 'Utiliser la meilleure version d\'API identifiée'
      : 'Vérifier les permissions de la clé API avec Pennylane'
  }

  res.status(200).json(results)
}
