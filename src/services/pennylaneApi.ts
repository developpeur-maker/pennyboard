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
      
      // Essayer de récupérer des données financières simples
      try {
        console.log('🔄 Tentative de récupération des données financières...')
        
        // Essayer d'abord les factures clients (échantillon)
        const customerData = await apiCall<any>('customer_invoices?page=1&per_page=100')
        if (customerData && customerData.invoices) {
          console.log(`📊 Récupération de ${customerData.invoices.length} factures clients (échantillon)`)
          return this.processSimpleFinancialData(customerData.invoices, 'customer')
        }
        
        // Essayer les factures fournisseurs (échantillon)
        const supplierData = await apiCall<any>('supplier_invoices?page=1&per_page=100')
        if (supplierData && supplierData.invoices) {
          console.log(`📊 Récupération de ${supplierData.invoices.length} factures fournisseurs (échantillon)`)
          return this.processSimpleFinancialData(supplierData.invoices, 'supplier')
        }
        
      } catch (endpointError) {
        console.log(`❌ Impossible de récupérer les données financières:`, endpointError)
      }
      
      // Si aucun endpoint ne fonctionne, retourner des données vides
      console.log('📊 Aucun endpoint financier disponible, retour de données vides')
      return []
      
    } catch (error) {
      console.error('Erreur lors de la récupération du résultat comptable:', error)
      return []
    }
  },

  // Traiter les données financières de manière simple et compréhensible
  processSimpleFinancialData(invoices: any[], type: 'customer' | 'supplier'): PennylaneResultatComptable[] {
    console.log(`📊 Traitement simple des ${invoices.length} factures ${type}`)
    
    // Grouper les factures par mois (derniers 12 mois)
    const monthlyData: { [key: string]: { ca: number, charges: number } } = {}
    
    invoices.forEach(invoice => {
      if (invoice.date) {
        const month = invoice.date.substring(0, 7) // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { ca: 0, charges: 0 }
        }
        
        const amount = parseFloat(invoice.currency_amount || 0)
        
        if (type === 'customer') {
          // Chiffre d'affaires pour les factures clients
          monthlyData[month].ca += amount
        } else {
          // Charges pour les factures fournisseurs
          monthlyData[month].charges += amount
        }
      }
    })
    
    // Créer les 12 derniers mois avec des données
    const result: PennylaneResultatComptable[] = []
    const currentDate = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const period = date.toISOString().substring(0, 7)
      
      const data = monthlyData[period] || { ca: 0, charges: 0 }
      
      result.push({
        period,
        chiffre_affaires: data.ca,
        charges: data.charges,
        resultat_net: data.ca - data.charges,
        currency: 'EUR'
      })
    }
    
    return result
  },



  // Récupérer la trésorerie
  async getTresorerie(): Promise<PennylaneTresorerie[]> {
    try {
      // D'abord, vérifier la connexion avec l'endpoint qui fonctionne
      const companyData = await apiCall<PennylaneCompany>('me')
      console.log('✅ Connexion API confirmée pour DIMO DIAGNOSTIC:', companyData.company.name)
      
      // Essayer de récupérer les vraies données de trésorerie
      console.log('💰 Tentative de récupération des données de trésorerie réelles...')
      
      // Essayer de récupérer des données de trésorerie simples
      try {
        console.log('🔄 Tentative de récupération des données de trésorerie...')
        
        // Essayer d'abord les factures clients (échantillon)
        const customerData = await apiCall<any>('customer_invoices?page=1&per_page=100')
        if (customerData && customerData.invoices) {
          console.log(`💰 Récupération de ${customerData.invoices.length} factures clients pour la trésorerie`)
          return this.processSimpleCashFlowData(customerData.invoices, 'customer')
        }
        
        // Essayer les factures fournisseurs (échantillon)
        const supplierData = await apiCall<any>('supplier_invoices?page=1&per_page=100')
        if (supplierData && supplierData.invoices) {
          console.log(`💰 Récupération de ${supplierData.invoices.length} factures fournisseurs pour la trésorerie`)
          return this.processSimpleCashFlowData(supplierData.invoices, 'supplier')
        }
        
      } catch (endpointError) {
        console.log(`❌ Impossible de récupérer les données de trésorerie:`, endpointError)
      }
      
      // Si aucun endpoint ne fonctionne, retourner des données vides
      console.log('💰 Aucun endpoint trésorerie disponible, retour de données vides')
      return []
      
    } catch (error) {
      console.error('Erreur lors de la récupération de la trésorerie:', error)
      return []
    }
  },

  // Traiter les données de trésorerie de manière simple
  processSimpleCashFlowData(invoices: any[], type: 'customer' | 'supplier'): PennylaneTresorerie[] {
    console.log(`💰 Traitement simple des ${invoices.length} factures ${type} pour la trésorerie`)
    
    // Grouper les factures par mois (derniers 12 mois)
    const monthlyData: { [key: string]: { encaissements: number, decaissements: number } } = {}
    
    invoices.forEach(invoice => {
      if (invoice.date) {
        const month = invoice.date.substring(0, 7)
        if (!monthlyData[month]) {
          monthlyData[month] = { encaissements: 0, decaissements: 0 }
        }
        
        const amount = parseFloat(invoice.currency_amount || 0)
        
        if (type === 'customer') {
          // Encaissements pour les factures clients
          monthlyData[month].encaissements += amount
        } else {
          // Décaissements pour les factures fournisseurs
          monthlyData[month].decaissements += amount
        }
      }
    })
    
    // Créer les 12 derniers mois avec des données
    const result: PennylaneTresorerie[] = []
    const currentDate = new Date()
    let soldeInitial = 10000 // Solde initial par défaut
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const period = date.toISOString().substring(0, 7)
      
      const data = monthlyData[period] || { encaissements: 0, decaissements: 0 }
      const soldeFinal = soldeInitial + data.encaissements - data.decaissements
      
      result.push({
        period,
        solde_initial: soldeInitial,
        encaissements: data.encaissements,
        decaissements: data.decaissements,
        solde_final: soldeFinal,
        currency: 'EUR'
      })
      
      soldeInitial = soldeFinal
    }
    
    return result
  },

  // Traiter les factures fournisseurs pour la trésorerie
  processSupplierInvoicesCashFlowData(invoices: any[]): PennylaneTresorerie[] {
    console.log('💰 Traitement des factures fournisseurs pour la trésorerie:', invoices.length, 'factures')
    
    const monthlyData: { [key: string]: { encaissements: number, decaissements: number } } = {}
    let soldeInitial = 10000 // Solde initial par défaut
    
    invoices.forEach(invoice => {
      if (invoice.date) {
        const month = invoice.date.substring(0, 7)
        if (!monthlyData[month]) {
          monthlyData[month] = { encaissements: 0, decaissements: 0 }
        }
        
        // Décaissements pour les factures fournisseurs
        if (invoice.currency_amount) {
          monthlyData[month].decaissements += parseFloat(invoice.currency_amount)
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
      
      soldeInitial = soldeFinal
    })
    
    return result
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
    return []
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
