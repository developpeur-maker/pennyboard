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
    message: 'Test de la logique comptable française',
    baseUrl: PENNYLANE_BASE_URL,
    accountingLogic: {
      revenue: 'Comptes 7 (Produits/Chiffre d\'affaires)',
      expenses: 'Comptes 6 (Charges)',
      result: 'Comptes 7 - Comptes 6 = Résultat comptable'
    },
    endpoints: {}
  }

  // Endpoints à tester pour trouver les données comptables
  const endpointsToTest = [
    'customer_invoices',
    'supplier_invoices', 
    'transactions',
    'financial-statements',
    'reports',
    'invoices',
    'entries',
    'journal-entries'
  ]

  for (const endpoint of endpointsToTest) {
    try {
      const url = `${PENNYLANE_BASE_URL}/${endpoint}`
      console.log(`🔗 Testing accounting endpoint: ${url}`)

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
      let responseText = null

      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        responseText = await response.text()
      }

      // Analyser les données pour la logique comptable
      let accountingAnalysis = {
        hasRevenueData: false,
        hasExpenseData: false,
        revenueAmount: 0,
        expenseAmount: 0,
        sampleData: null
      }

      if (data) {
        // Chercher des données de revenus (comptes 7)
        if (data.invoices || data.customer_invoices) {
          const invoices = data.invoices || data.customer_invoices || []
          if (Array.isArray(invoices) && invoices.length > 0) {
            accountingAnalysis.hasRevenueData = true
            accountingAnalysis.revenueAmount = invoices.reduce((sum, invoice) => {
              return sum + (parseFloat(invoice.currency_amount || invoice.amount || 0))
            }, 0)
            accountingAnalysis.sampleData = invoices.slice(0, 3)
          }
        }

        // Chercher des données de charges (comptes 6)
        if (data.supplier_invoices || data.expenses) {
          const expenses = data.supplier_invoices || data.expenses || []
          if (Array.isArray(expenses) && expenses.length > 0) {
            accountingAnalysis.hasExpenseData = true
            accountingAnalysis.expenseAmount = expenses.reduce((sum, expense) => {
              return sum + (parseFloat(expense.currency_amount || expense.amount || 0))
            }, 0)
          }
        }

        // Chercher des transactions avec codes comptables
        if (data.transactions || data.entries) {
          const transactions = data.transactions || data.entries || []
          if (Array.isArray(transactions) && transactions.length > 0) {
            // Analyser les codes comptables
            const accountCodes = transactions
              .map(t => t.account_code || t.account || t.code)
              .filter(code => code && typeof code === 'string')
              .slice(0, 10)

            if (accountCodes.length > 0) {
              accountingAnalysis.sampleData = {
                accountCodes,
                transactionCount: transactions.length
              }
            }
          }
        }
      }

      results.endpoints[endpoint] = {
        status: response.status,
        contentType,
        hasData: data && (data.invoices || data.transactions || data.entries),
        dataStructure: data ? Object.keys(data) : null,
        accountingAnalysis,
        error: response.status >= 400 ? (data?.error || responseText?.substring(0, 200)) : null
      }

    } catch (error) {
      console.error(`❌ Error testing accounting endpoint ${endpoint}:`, error)
      results.endpoints[endpoint] = {
        status: 'ERROR',
        error: error.message
      }
    }
  }

  // Calculer le résultat comptable si on a des données
  const workingEndpoints = Object.values(results.endpoints).filter(e => e.status === 200)
  const hasRevenueData = workingEndpoints.some(e => e.accountingAnalysis?.hasRevenueData)
  const hasExpenseData = workingEndpoints.some(e => e.accountingAnalysis?.hasExpenseData)

  results.summary = {
    workingEndpoints: workingEndpoints.length,
    hasRevenueData,
    hasExpenseData,
    canCalculateResult: hasRevenueData && hasExpenseData,
    recommendation: hasRevenueData || hasExpenseData 
      ? 'Utiliser les factures clients/fournisseurs pour calculer le résultat comptable'
      : 'Aucune donnée comptable trouvée, vérifier les permissions API'
  }

  res.status(200).json(results)
}
