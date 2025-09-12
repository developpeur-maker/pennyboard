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
    message: 'Test des permissions de la clé API Pennylane',
    baseUrl: PENNYLANE_BASE_URL,
    apiKeyConfigured: !!PENNYLANE_API_KEY,
    tests: {
      basicConnection: null,
      companyInfo: null,
      permissions: null,
      recommendations: null
    }
  }

  // Test 1: Connexion de base
  try {
    console.log('🔍 Test de connexion de base...')
    const response = await fetch(`${PENNYLANE_BASE_URL}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PENNYLANE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })

    const data = await response.json()
    
    results.tests.basicConnection = {
      status: response.status,
      success: response.status === 200,
      company: data.company?.name || 'Inconnue',
      user: data.user?.email || 'Inconnu',
      companyId: data.company?.id || null,
      userId: data.user?.id || null,
      error: response.status >= 400 ? data.error : null
    }
  } catch (error) {
    results.tests.basicConnection = {
      status: 'ERROR',
      success: false,
      error: error.message
    }
  }

  // Test 2: Informations de l'entreprise
  if (results.tests.basicConnection.success) {
    try {
      console.log('🔍 Test des informations de l\'entreprise...')
      const response = await fetch(`${PENNYLANE_BASE_URL}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PENNYLANE_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })

      const data = await response.json()
      
      results.tests.companyInfo = {
        companyName: data.company?.name,
        companyId: data.company?.id,
        regNo: data.company?.reg_no,
        userEmail: data.user?.email,
        userLocale: data.user?.locale,
        hasCompanyData: !!data.company,
        hasUserData: !!data.user
      }
    } catch (error) {
      results.tests.companyInfo = {
        error: error.message
      }
    }
  }

  // Test 3: Permissions spécifiques
  const permissionTests = [
    { name: 'customers', endpoint: 'customers', description: 'Accès aux clients' },
    { name: 'suppliers', endpoint: 'suppliers', description: 'Accès aux fournisseurs' },
    { name: 'customer_invoices', endpoint: 'customer_invoices', description: 'Accès aux factures clients' },
    { name: 'supplier_invoices', endpoint: 'supplier_invoices', description: 'Accès aux factures fournisseurs' },
    { name: 'transactions', endpoint: 'transactions', description: 'Accès aux transactions' },
    { name: 'bank-accounts', endpoint: 'bank-accounts', description: 'Accès aux comptes bancaires' },
    { name: 'products', endpoint: 'products', description: 'Accès aux produits' },
    { name: 'services', endpoint: 'services', description: 'Accès aux services' }
  ]

  results.tests.permissions = {
    tests: [],
    working: 0,
    total: permissionTests.length
  }

  for (const test of permissionTests) {
    try {
      const response = await fetch(`${PENNYLANE_BASE_URL}/${test.endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PENNYLANE_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })

      const data = await response.json()
      
      const result = {
        name: test.name,
        endpoint: test.endpoint,
        description: test.description,
        status: response.status,
        success: response.status === 200,
        hasData: response.status === 200 && data && Object.keys(data).length > 0,
        error: response.status >= 400 ? data.error : null,
        errorType: response.status === 403 ? 'Permission denied' : 
                   response.status === 404 ? 'Not found' : 
                   response.status >= 400 ? 'Other error' : null
      }

      results.tests.permissions.tests.push(result)
      
      if (result.success) {
        results.tests.permissions.working++
      }

    } catch (error) {
      results.tests.permissions.tests.push({
        name: test.name,
        endpoint: test.endpoint,
        description: test.description,
        status: 'ERROR',
        success: false,
        error: error.message,
        errorType: 'Network error'
      })
    }
  }

  // Test 4: Recommandations
  const workingPermissions = results.tests.permissions.tests.filter(t => t.success)
  const permissionErrors = results.tests.permissions.tests.filter(t => t.errorType === 'Permission denied')
  
  results.tests.recommendations = {
    connectionWorking: results.tests.basicConnection.success,
    workingPermissions: workingPermissions.length,
    totalPermissions: permissionTests.length,
    permissionErrors: permissionErrors.length,
    successRate: `${Math.round((workingPermissions.length / permissionTests.length) * 100)}%`,
    workingEndpoints: workingPermissions.map(t => t.endpoint),
    blockedEndpoints: permissionErrors.map(t => t.endpoint),
    recommendations: workingPermissions.length > 0 
      ? `Utiliser les ${workingPermissions.length} endpoints disponibles`
      : 'Aucun endpoint disponible - vérifier les permissions de la clé API',
    nextSteps: workingPermissions.length > 0 
      ? 'Adapter le dashboard pour utiliser les endpoints disponibles'
      : 'Contacter Pennylane pour obtenir les permissions nécessaires'
  }

  res.status(200).json(results)
}
