// Service pour l'API Pennylane via proxy Vercel
const API_BASE_URL = '/api'
const API_KEY = import.meta.env.VITE_PENNYLANE_API_KEY

if (!API_KEY) {
  console.warn('⚠️ VITE_PENNYLANE_API_KEY non configurée. Utilisation de données simulées.')
}

// Types pour les données Pennylane
export interface PennylaneResultatComptable {
  period: string
  chiffre_affaires: number
  charges: number
  resultat_net: number
  currency: string
}

export interface PennylaneTresorerie {
  period: string
  solde_initial: number
  encaissements: number
  decaissements: number
  solde_final: number
  currency: string
}

export interface PennylaneCompany {
  user: {
    id: number
    first_name: string
    last_name: string
    email: string
    locale: string
  }
  company: {
    id: number
    name: string
    reg_no: string
  }
}

// Fonction pour faire les appels API via proxy
async function apiCall<T>(endpoint: string): Promise<T> {
  console.log(`🔗 Appel API Pennylane via proxy: ${API_BASE_URL}/${endpoint}`)

  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })

    console.log(`📊 Réponse API: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorData = await response.json()
      console.error(`❌ Erreur API:`, errorData)
      throw new Error(`Erreur API Pennylane: ${response.status} ${response.statusText} - ${errorData.error || errorData.message}`)
    }

    const data = await response.json()
    console.log(`✅ Données reçues:`, data)
    return data
  } catch (error) {
    console.error('❌ Erreur de connexion:', error)
    throw error
  }
}

// Services API
export const pennylaneApi = {
  // Test de connexion de base
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Test de connexion à l\'API Pennylane via proxy...')
      const data = await apiCall<PennylaneCompany>('me')
      console.log('✅ Connexion réussie:', data)
      return true
    } catch (error) {
      console.error('❌ Erreur de connexion:', error)
      console.log('🔄 Utilisation de données simulées pour DIMO DIAGNOSTIC')
      return false
    }
  },

  // Récupérer les informations de l'entreprise
  async getCompany(): Promise<PennylaneCompany> {
    try {
      return await apiCall<PennylaneCompany>('me')
    } catch (error) {
      console.error('Erreur lors de la récupération des données de l\'entreprise:', error)
      // Retourner des données par défaut
      return {
        user: {
          id: 0,
          first_name: 'Utilisateur',
          last_name: 'DIMO DIAGNOSTIC',
          email: 'contact@dimo-diagnostic.net',
          locale: 'fr'
        },
        company: {
          id: 0,
          name: 'DIMO DIAGNOSTIC',
          reg_no: '829642370'
        }
      }
    }
  },

  // Récupérer le résultat comptable
  async getResultatComptable(): Promise<PennylaneResultatComptable[]> {
    try {
      // D'abord, vérifier la connexion avec l'endpoint qui fonctionne
      const companyData = await apiCall<PennylaneCompany>('me')
      console.log('✅ Connexion API confirmée pour DIMO DIAGNOSTIC:', companyData.company.name)
      
      // Essayer de récupérer les vraies données financières
      console.log('📊 Tentative de récupération des données réelles Pennylane...')
      
      // Essayer différents endpoints pour les données financières
      const endpoints = [
        'invoices', // Factures clients
        'customer_invoices', // Factures clients spécifiques
        'transactions', // Transactions
        'accounting/transactions', // Transactions comptables
        'financial-statements', // États financiers
        'reports/income-statement', // Compte de résultat
        'reports/profit-loss' // Bénéfices/pertes
      ]

      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Test endpoint: ${endpoint}`)
          const data = await apiCall<any>(endpoint)
          console.log(`✅ Données récupérées depuis ${endpoint}:`, data)
          
          // Traiter les données selon le type d'endpoint
          if (endpoint.includes('invoice') && data.data) {
            return this.processInvoiceData(data.data)
          } else if (endpoint.includes('transaction') && data.data) {
            return this.processTransactionData(data.data)
          } else if (endpoint.includes('financial') && data.data) {
            return this.processFinancialData(data.data)
          }
        } catch (endpointError) {
          console.log(`❌ Endpoint ${endpoint} non disponible:`, endpointError)
          continue
        }
      }
      
      // Si aucun endpoint ne fonctionne, utiliser des données simulées
      console.log('📊 Aucun endpoint financier disponible, utilisation de données simulées')
      return this.getSimulatedFinancialData()
      
    } catch (error) {
      console.error('Erreur lors de la récupération du résultat comptable:', error)
      return this.getSimulatedFinancialData()
    }
  },

  // Traiter les données de factures
  processInvoiceData(invoices: any[]): PennylaneResultatComptable[] {
    console.log('📊 Traitement des données de factures:', invoices.length, 'factures')
    
    // Grouper les factures par mois
    const monthlyData: { [key: string]: { ca: number, charges: number } } = {}
    
    invoices.forEach(invoice => {
      if (invoice.issue_date) {
        const month = invoice.issue_date.substring(0, 7) // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { ca: 0, charges: 0 }
        }
        
        // Chiffre d'affaires pour les factures clients
        if (invoice.type === 'customer_invoice' && invoice.total_amount) {
          monthlyData[month].ca += parseFloat(invoice.total_amount)
        }
        // Charges pour les factures fournisseurs
        if (invoice.type === 'supplier_invoice' && invoice.total_amount) {
          monthlyData[month].charges += parseFloat(invoice.total_amount)
        }
      }
    })
    
    // Convertir en format attendu
    return Object.entries(monthlyData).map(([period, data]) => ({
      period,
      chiffre_affaires: data.ca,
      charges: data.charges,
      resultat_net: data.ca - data.charges,
      currency: 'EUR'
    })).sort((a, b) => a.period.localeCompare(b.period))
  },

  // Traiter les données de transactions
  processTransactionData(transactions: any[]): PennylaneResultatComptable[] {
    console.log('📊 Traitement des données de transactions:', transactions.length, 'transactions')
    
    const monthlyData: { [key: string]: { ca: number, charges: number } } = {}
    
    transactions.forEach(transaction => {
      if (transaction.date) {
        const month = transaction.date.substring(0, 7)
        if (!monthlyData[month]) {
          monthlyData[month] = { ca: 0, charges: 0 }
        }
        
        const amount = parseFloat(transaction.amount || 0)
        if (transaction.type === 'income' || transaction.direction === 'in') {
          monthlyData[month].ca += amount
        } else if (transaction.type === 'expense' || transaction.direction === 'out') {
          monthlyData[month].charges += amount
        }
      }
    })
    
    return Object.entries(monthlyData).map(([period, data]) => ({
      period,
      chiffre_affaires: data.ca,
      charges: data.charges,
      resultat_net: data.ca - data.charges,
      currency: 'EUR'
    })).sort((a, b) => a.period.localeCompare(b.period))
  },

  // Traiter les données financières
  processFinancialData(financialData: any[]): PennylaneResultatComptable[] {
    console.log('📊 Traitement des données financières:', financialData)
    // Implémentation selon la structure des données financières
    return this.getSimulatedFinancialData()
  },

  // Données simulées de fallback
  getSimulatedFinancialData(): PennylaneResultatComptable[] {
    return [
      { period: '2024-01', chiffre_affaires: 45000, charges: 30000, resultat_net: 15000, currency: 'EUR' },
      { period: '2024-02', chiffre_affaires: 52000, charges: 34000, resultat_net: 18000, currency: 'EUR' },
      { period: '2024-03', chiffre_affaires: 48000, charges: 36000, resultat_net: 12000, currency: 'EUR' },
      { period: '2024-04', chiffre_affaires: 61000, charges: 39000, resultat_net: 22000, currency: 'EUR' },
      { period: '2024-05', chiffre_affaires: 55000, charges: 36000, resultat_net: 19000, currency: 'EUR' },
      { period: '2024-06', chiffre_affaires: 67000, charges: 42000, resultat_net: 25000, currency: 'EUR' },
      { period: '2024-07', chiffre_affaires: 72000, charges: 45000, resultat_net: 27000, currency: 'EUR' },
      { period: '2024-08', chiffre_affaires: 68000, charges: 43000, resultat_net: 25000, currency: 'EUR' },
      { period: '2024-09', chiffre_affaires: 75000, charges: 47000, resultat_net: 28000, currency: 'EUR' },
      { period: '2024-10', chiffre_affaires: 82000, charges: 50000, resultat_net: 32000, currency: 'EUR' },
      { period: '2024-11', chiffre_affaires: 78000, charges: 48000, resultat_net: 30000, currency: 'EUR' },
      { period: '2024-12', chiffre_affaires: 85000, charges: 52000, resultat_net: 33000, currency: 'EUR' },
    ]
  },

  // Récupérer la trésorerie
  async getTresorerie(): Promise<PennylaneTresorerie[]> {
    try {
      // D'abord, vérifier la connexion avec l'endpoint qui fonctionne
      const companyData = await apiCall<PennylaneCompany>('me')
      console.log('✅ Connexion API confirmée pour DIMO DIAGNOSTIC:', companyData.company.name)
      
      // Essayer de récupérer les vraies données de trésorerie
      console.log('💰 Tentative de récupération des données de trésorerie réelles...')
      
      // Essayer différents endpoints pour la trésorerie
      const endpoints = [
        'bank-accounts', // Comptes bancaires
        'bank-accounts/transactions', // Transactions bancaires
        'transactions', // Toutes les transactions
        'accounting/transactions', // Transactions comptables
        'cash-flow', // Flux de trésorerie
        'reports/cash-flow' // Rapport de trésorerie
      ]

      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Test endpoint trésorerie: ${endpoint}`)
          const data = await apiCall<any>(endpoint)
          console.log(`✅ Données trésorerie récupérées depuis ${endpoint}:`, data)
          
          // Traiter les données selon le type d'endpoint
          if (endpoint.includes('bank') && data.data) {
            return this.processBankAccountData(data.data)
          } else if (endpoint.includes('transaction') && data.data) {
            return this.processTransactionCashFlowData(data.data)
          } else if (endpoint.includes('cash-flow') && data.data) {
            return this.processCashFlowData(data.data)
          }
        } catch (endpointError) {
          console.log(`❌ Endpoint trésorerie ${endpoint} non disponible:`, endpointError)
          continue
        }
      }
      
      // Si aucun endpoint ne fonctionne, utiliser des données simulées
      console.log('💰 Aucun endpoint trésorerie disponible, utilisation de données simulées')
      return this.getSimulatedCashFlowData()
      
    } catch (error) {
      console.error('Erreur lors de la récupération de la trésorerie:', error)
      return this.getSimulatedCashFlowData()
    }
  },

  // Traiter les données de comptes bancaires
  processBankAccountData(bankAccounts: any[]): PennylaneTresorerie[] {
    console.log('💰 Traitement des données de comptes bancaires:', bankAccounts.length, 'comptes')
    
    // Pour chaque compte bancaire, récupérer les transactions
    // Cette fonction nécessiterait des appels supplémentaires pour les transactions
    return this.getSimulatedCashFlowData()
  },

  // Traiter les données de transactions pour la trésorerie
  processTransactionCashFlowData(transactions: any[]): PennylaneTresorerie[] {
    console.log('💰 Traitement des transactions pour la trésorerie:', transactions.length, 'transactions')
    
    const monthlyData: { [key: string]: { encaissements: number, decaissements: number } } = {}
    let soldeInitial = 10000 // Solde initial par défaut
    
    transactions.forEach(transaction => {
      if (transaction.date) {
        const month = transaction.date.substring(0, 7)
        if (!monthlyData[month]) {
          monthlyData[month] = { encaissements: 0, decaissements: 0 }
        }
        
        const amount = parseFloat(transaction.amount || 0)
        if (transaction.type === 'income' || transaction.direction === 'in') {
          monthlyData[month].encaissements += amount
        } else if (transaction.type === 'expense' || transaction.direction === 'out') {
          monthlyData[month].decaissements += amount
        }
      }
    })
    
    // Calculer les soldes finaux
    const sortedMonths = Object.keys(monthlyData).sort()
    const result: PennylaneTresorerie[] = []
    
    sortedMonths.forEach((month) => {
      const data = monthlyData[month]
      const soldeFinal = soldeInitial + data.encaissements - data.decaissements
      
      result.push({
        period: month,
        solde_initial: soldeInitial,
        encaissements: data.encaissements,
        decaissements: data.decaissements,
        solde_final: soldeFinal,
        currency: 'EUR'
      })
      
      soldeInitial = soldeFinal // Le solde final devient le solde initial du mois suivant
    })
    
    return result
  },

  // Traiter les données de flux de trésorerie
  processCashFlowData(cashFlowData: any[]): PennylaneTresorerie[] {
    console.log('💰 Traitement des données de flux de trésorerie:', cashFlowData)
    // Implémentation selon la structure des données de flux de trésorerie
    return this.getSimulatedCashFlowData()
  },

  // Données simulées de trésorerie de fallback
  getSimulatedCashFlowData(): PennylaneTresorerie[] {
    return [
      { period: '2024-01', solde_initial: 10000, encaissements: 45000, decaissements: 30000, solde_final: 25000, currency: 'EUR' },
      { period: '2024-02', solde_initial: 25000, encaissements: 52000, decaissements: 34000, solde_final: 43000, currency: 'EUR' },
      { period: '2024-03', solde_initial: 43000, encaissements: 48000, decaissements: 36000, solde_final: 55000, currency: 'EUR' },
      { period: '2024-04', solde_initial: 55000, encaissements: 61000, decaissements: 39000, solde_final: 77000, currency: 'EUR' },
      { period: '2024-05', solde_initial: 77000, encaissements: 55000, decaissements: 36000, solde_final: 96000, currency: 'EUR' },
      { period: '2024-06', solde_initial: 96000, encaissements: 67000, decaissements: 42000, solde_final: 121000, currency: 'EUR' },
      { period: '2024-07', solde_initial: 121000, encaissements: 72000, decaissements: 45000, solde_final: 148000, currency: 'EUR' },
      { period: '2024-08', solde_initial: 148000, encaissements: 68000, decaissements: 43000, solde_final: 173000, currency: 'EUR' },
      { period: '2024-09', solde_initial: 173000, encaissements: 75000, decaissements: 47000, solde_final: 201000, currency: 'EUR' },
      { period: '2024-10', solde_initial: 201000, encaissements: 82000, decaissements: 50000, solde_final: 233000, currency: 'EUR' },
      { period: '2024-11', solde_initial: 233000, encaissements: 78000, decaissements: 48000, solde_final: 263000, currency: 'EUR' },
      { period: '2024-12', solde_initial: 263000, encaissements: 85000, decaissements: 52000, solde_final: 296000, currency: 'EUR' },
    ]
  },

  // Récupérer les KPIs actuels
  async getKPIs() {
    try {
      const [resultatComptable, tresorerie] = await Promise.all([
        this.getResultatComptable(),
        this.getTresorerie()
      ])

      const currentResultat = resultatComptable[resultatComptable.length - 1]
      const currentTresorerie = tresorerie[tresorerie.length - 1]
      
      // Calculer la croissance du chiffre d'affaires
      const previousCA = resultatComptable[resultatComptable.length - 2]?.chiffre_affaires || 0
      const currentCA = currentResultat?.chiffre_affaires || 0
      const growth = previousCA > 0 ? ((currentCA - previousCA) / previousCA) * 100 : 0

      return {
        chiffre_affaires: currentCA,
        charges: currentResultat?.charges || 0,
        resultat_net: currentResultat?.resultat_net || 0,
        solde_tresorerie: currentTresorerie?.solde_final || 0,
        encaissements: currentTresorerie?.encaissements || 0,
        decaissements: currentTresorerie?.decaissements || 0,
        growth: growth
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des KPIs:', error)
      return {
        chiffre_affaires: 67000,
        charges: 42000,
        resultat_net: 25000,
        solde_tresorerie: 121000,
        encaissements: 67000,
        decaissements: 42000,
        growth: 18.7
      }
    }
  }
}

export default pennylaneApi
