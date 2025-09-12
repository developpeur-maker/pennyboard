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
  // Détails par compte
  prestations_services: number // Compte 706
  ventes_biens: number // Compte 701
  achats: number // Compte 601
  charges_externes: number // Compte 622
  charges_personnel: number // Compte 641
}

export interface PennylaneTresorerie {
  period: string
  solde_initial: number
  encaissements: number
  decaissements: number
  solde_final: number
  currency: string
}

export interface PennylaneAccount {
  id: string
  code: string
  name: string
  balance: number
  currency: string
}

export interface PennylaneMonthlyData {
  period: string
  accounts: PennylaneAccount[]
  total_revenue: number
  total_expenses: number
  net_result: number
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

  // Récupérer le résultat comptable basé sur les comptes comptables
  async getResultatComptable(): Promise<PennylaneResultatComptable[]> {
    try {
      // D'abord, vérifier la connexion avec l'endpoint qui fonctionne
      const companyData = await apiCall<PennylaneCompany>('me')
      console.log('✅ Connexion API confirmée pour DIMO DIAGNOSTIC:', companyData.company.name)
      
      // Essayer de récupérer les données des comptes comptables
      console.log('📊 Tentative de récupération des données comptables par compte...')
      
      try {
        // Utiliser la logique comptable française avec les factures
        console.log('🔄 Récupération des factures pour la logique comptable française...')
        
        // Récupérer les factures clients (Comptes 7 - Produits)
        const customerData = await apiCall<any>('customer_invoices?page=1&per_page=100')
        const customerInvoices = customerData?.invoices || []
        
        // Récupérer les factures fournisseurs (Comptes 6 - Charges)
        const supplierData = await apiCall<any>('supplier_invoices?page=1&per_page=100')
        const supplierInvoices = supplierData?.invoices || []
        
        if (customerInvoices.length > 0 || supplierInvoices.length > 0) {
          console.log(`📊 Logique comptable française: ${customerInvoices.length} factures clients (Comptes 7), ${supplierInvoices.length} factures fournisseurs (Comptes 6)`)
          return this.processAccountingData(customerInvoices, supplierInvoices)
        }
        
        // Fallback: essayer les comptes comptables directs
        console.log('🔄 Fallback: tentative avec les comptes comptables...')
        const accountsData = await apiCall<any>('accounts')
        if (accountsData && accountsData.data) {
          console.log(`📊 Récupération de ${accountsData.data.length} comptes comptables`)
          // Pour l'instant, retourner des données vides car nous n'avons pas de fonction processAccountsData
          return []
        }
        
      } catch (endpointError) {
        console.log(`❌ Impossible de récupérer les données comptables:`, endpointError)
      }
      
      // Si aucun endpoint ne fonctionne, retourner des données vides
      console.log('📊 Aucun endpoint comptable disponible, retour de données vides')
      return []
      
    } catch (error) {
      console.error('Erreur lors de la récupération du résultat comptable:', error)
      return []
    }
  },

  // Traiter les données selon la logique comptable française
  processAccountingData(customerInvoices: any[], supplierInvoices: any[]): PennylaneResultatComptable[] {
    console.log(`📊 Traitement comptable français: ${customerInvoices.length} factures clients, ${supplierInvoices.length} factures fournisseurs`)
    
    // Grouper par mois (derniers 12 mois)
    const monthlyData: { [key: string]: { comptes7: number, comptes6: number } } = {}
    
    // Traiter les factures clients (Comptes 7 - Produits/Chiffre d'affaires)
    customerInvoices.forEach(invoice => {
      if (invoice.date) {
        const month = invoice.date.substring(0, 7) // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { comptes7: 0, comptes6: 0 }
        }
        
        const amount = parseFloat(invoice.currency_amount || invoice.amount || 0)
        monthlyData[month].comptes7 += amount
      }
    })
    
    // Traiter les factures fournisseurs (Comptes 6 - Charges)
    supplierInvoices.forEach(invoice => {
      if (invoice.date) {
        const month = invoice.date.substring(0, 7) // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { comptes7: 0, comptes6: 0 }
        }
        
        const amount = parseFloat(invoice.currency_amount || invoice.amount || 0)
        monthlyData[month].comptes6 += amount
      }
    })
    
    // Créer les 12 derniers mois avec les données
    const result: PennylaneResultatComptable[] = []
    const currentDate = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const period = date.toISOString().substring(0, 7)
      
      const data = monthlyData[period] || { comptes7: 0, comptes6: 0 }
      
      // Logique comptable française : Comptes 7 - Comptes 6 = Résultat comptable
      const chiffre_affaires = data.comptes7 // Comptes 7 (Produits)
      const charges = data.comptes6 // Comptes 6 (Charges)
      const resultat_net = chiffre_affaires - charges
      
      result.push({
        period,
        chiffre_affaires,
        charges,
        resultat_net,
        currency: 'EUR',
        // Détail par type de compte (approximation basée sur les factures)
        prestations_services: chiffre_affaires, // Principalement des services
        ventes_biens: 0, // À ajuster selon vos données
        achats: charges * 0.4, // Estimation des achats
        charges_externes: charges * 0.3, // Estimation des charges externes
        charges_personnel: charges * 0.3 // Estimation des charges de personnel
      })
    }
    
    return result
  },

  // Obtenir le solde d'un compte pour une période donnée
  getAccountBalance(accounts: any[], accountCode: string, period: string): number {
    const account = accounts.find(acc => acc.code === accountCode)
    if (!account) return 0
    
    // Si le compte a des données mensuelles, utiliser la période
    if (account.monthly_balances && account.monthly_balances[period]) {
      return parseFloat(account.monthly_balances[period]) || 0
    }
    
    // Sinon, utiliser le solde total
    return parseFloat(account.balance) || 0
  },

  // Traiter les données financières de manière simple et compréhensible (fallback)
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
        currency: 'EUR',
        prestations_services: type === 'customer' ? data.ca : 0,
        ventes_biens: 0,
        achats: type === 'supplier' ? data.charges : 0,
        charges_externes: 0,
        charges_personnel: 0
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
        console.log('🔄 Récupération des données de trésorerie avec logique comptable française...')
        
        // Récupérer les factures clients (encaissements)
        const customerData = await apiCall<any>('customer_invoices?page=1&per_page=100')
        const customerInvoices = customerData?.invoices || []
        
        // Récupérer les factures fournisseurs (décaissements)
        const supplierData = await apiCall<any>('supplier_invoices?page=1&per_page=100')
        const supplierInvoices = supplierData?.invoices || []
        
        if (customerInvoices.length > 0 || supplierInvoices.length > 0) {
          console.log(`💰 Trésorerie: ${customerInvoices.length} factures clients (encaissements), ${supplierInvoices.length} factures fournisseurs (décaissements)`)
          return this.processAccountingCashFlowData(customerInvoices, supplierInvoices)
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

  // Traiter les données de trésorerie avec logique comptable française
  processAccountingCashFlowData(customerInvoices: any[], supplierInvoices: any[]): PennylaneTresorerie[] {
    console.log(`💰 Traitement trésorerie comptable français: ${customerInvoices.length} factures clients, ${supplierInvoices.length} factures fournisseurs`)
    
    // Grouper par mois (derniers 12 mois)
    const monthlyData: { [key: string]: { encaissements: number, decaissements: number } } = {}
    
    // Traiter les factures clients (encaissements)
    customerInvoices.forEach(invoice => {
      if (invoice.date) {
        const month = invoice.date.substring(0, 7) // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { encaissements: 0, decaissements: 0 }
        }
        
        const amount = parseFloat(invoice.currency_amount || invoice.amount || 0)
        monthlyData[month].encaissements += amount
      }
    })
    
    // Traiter les factures fournisseurs (décaissements)
    supplierInvoices.forEach(invoice => {
      if (invoice.date) {
        const month = invoice.date.substring(0, 7) // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { encaissements: 0, decaissements: 0 }
        }
        
        const amount = parseFloat(invoice.currency_amount || invoice.amount || 0)
        monthlyData[month].decaissements += amount
      }
    })
    
    // Créer les 12 derniers mois avec les données
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

  // Traiter les données de trésorerie de manière simple (fallback)
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


  // Récupérer les données mensuelles avec comparaison
  async getMonthlyData(): Promise<PennylaneMonthlyData[]> {
    try {
      const resultatComptable = await this.getResultatComptable()
      
      return resultatComptable.map((data, index) => {
        const previousMonth = index > 0 ? resultatComptable[index - 1] : null
        
        return {
          period: data.period,
          accounts: [
            { id: '706', code: '706', name: 'Prestations de services', balance: data.prestations_services, currency: 'EUR' },
            { id: '701', code: '701', name: 'Ventes de biens', balance: data.ventes_biens, currency: 'EUR' },
            { id: '601', code: '601', name: 'Achats', balance: data.achats, currency: 'EUR' },
            { id: '622', code: '622', name: 'Charges externes', balance: data.charges_externes, currency: 'EUR' },
            { id: '641', code: '641', name: 'Charges de personnel', balance: data.charges_personnel, currency: 'EUR' }
          ],
          total_revenue: data.chiffre_affaires,
          total_expenses: data.charges,
          net_result: data.resultat_net,
          // Comparaisons avec le mois précédent
          revenue_growth: previousMonth ? ((data.chiffre_affaires - previousMonth.chiffre_affaires) / previousMonth.chiffre_affaires) * 100 : 0,
          expenses_growth: previousMonth ? ((data.charges - previousMonth.charges) / previousMonth.charges) * 100 : 0,
          net_growth: previousMonth ? ((data.resultat_net - previousMonth.resultat_net) / Math.abs(previousMonth.resultat_net)) * 100 : 0
        }
      })
    } catch (error) {
      console.error('Erreur lors de la récupération des données mensuelles:', error)
      return []
    }
  },

  // Récupérer les KPIs actuels
  async getKPIs() {
    try {
      const [resultatComptable, tresorerie] = await Promise.all([
        this.getResultatComptable(),
        this.getTresorerie()
      ])

      // Vérifier si nous avons des données
      if (resultatComptable.length === 0 && tresorerie.length === 0) {
        console.log('📊 Aucune donnée disponible pour les KPIs')
        return {
          chiffre_affaires: null,
          charges: null,
          resultat_net: null,
          solde_tresorerie: null,
          encaissements: null,
          decaissements: null,
          growth: null,
          hasData: false
        }
      }

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
        growth: growth,
        hasData: true
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des KPIs:', error)
      return {
        chiffre_affaires: null,
        charges: null,
        resultat_net: null,
        solde_tresorerie: null,
        encaissements: null,
        decaissements: null,
        growth: null,
        hasData: false
      }
    }
  }
}

export default pennylaneApi
