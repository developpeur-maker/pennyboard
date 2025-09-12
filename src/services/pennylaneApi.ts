// Service pour l'API Pennylane via proxy Vercel
const API_BASE_URL = '/api'
const API_KEY = import.meta.env.VITE_PENNYLANE_API_KEY

// Types pour les Ledger Entries (API v2)
export interface LedgerEntry {
  id: number
  label: string
  date: string
  journal_id: number
  created_at: string
  updated_at: string
  ledger_attachment_filename?: string
}

export interface LedgerEntryLine {
  id: number
  ledger_entry_id: number
  account_code: string
  account_name: string
  debit: number
  credit: number
  label: string
  date: string
}

export interface LedgerEntriesResponse {
  total_pages: number
  current_page: number
  per_page: number
  total_items: number
  items: LedgerEntry[]
}

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

// Fonction pour récupérer les ledger entries
export async function getLedgerEntries(page: number = 1, perPage: number = 100): Promise<LedgerEntriesResponse> {
  try {
    console.log(`📊 Récupération des ledger entries (page ${page})...`)
    const response = await apiCall<{success: boolean, raw_data: LedgerEntriesResponse}>(`test-ledger-entries?page=${page}&per_page=${perPage}`)
    
    if (response.success && response.raw_data) {
      return response.raw_data
    }
    
    throw new Error('Format de réponse inattendu')
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des ledger entries:', error)
    throw error
  }
}

// Fonction pour récupérer les détails d'une ledger entry (lignes comptables)
export async function getLedgerEntryLines(ledgerEntryId: number): Promise<LedgerEntryLine[]> {
  try {
    console.log(`📋 Récupération des lignes pour l'écriture ${ledgerEntryId}...`)
    // Note: Nous devrons créer un endpoint pour récupérer les lignes d'une écriture
    // Pour l'instant, retournons un tableau vide
    return []
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des lignes de l'écriture ${ledgerEntryId}:`, error)
    return []
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

  // Récupérer le résultat comptable (adapté pour clé API en lecture seule)
  async getResultatComptable(): Promise<PennylaneResultatComptable[]> {
    try {
      console.log('📊 Récupération du résultat comptable depuis les ledger entries...')
      
      // Récupérer les ledger entries
      const ledgerEntries = await getLedgerEntries(1, 100) // Première page, 100 entrées
      
      if (!ledgerEntries.items || ledgerEntries.items.length === 0) {
        console.log('⚠️ Aucune écriture comptable trouvée')
        return []
      }
      
      console.log(`📋 ${ledgerEntries.items.length} écritures comptables récupérées`)
      
      // Traiter les données pour les 12 derniers mois
      return this.processLedgerEntriesData(ledgerEntries.items)
      
    } catch (error) {
      console.error('Erreur lors de la récupération du résultat comptable:', error)
      return []
    }
  },

  // Traiter les données en lecture seule selon l'endpoint utilisé
  processReadOnlyData(data: any, endpoint: string): PennylaneResultatComptable[] {
    console.log(`📊 Traitement des données en lecture seule depuis ${endpoint}`)
    
    // Créer les 12 derniers mois avec les données
    const result: PennylaneResultatComptable[] = []
    const currentDate = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const period = date.toISOString().substring(0, 7)
      
      // Extraire les données selon le type d'endpoint en lecture seule
      let chiffre_affaires = 0
      let charges = 0
      let prestations_services = 0
      let ventes_biens = 0
      let achats = 0
      let charges_externes = 0
      let charges_personnel = 0
      
      if (endpoint.includes('reports/income-statement') || endpoint.includes('reports/profit-loss')) {
        // Rapport de compte de résultat
        chiffre_affaires = this.extractRevenueFromIncomeStatement(data)
        charges = this.extractExpensesFromIncomeStatement(data)
      } else if (endpoint.includes('reports/balance-sheet')) {
        // Rapport de bilan
        chiffre_affaires = this.extractRevenueFromBalanceSheet(data)
        charges = this.extractExpensesFromBalanceSheet(data)
      } else if (endpoint.includes('reports/trial-balance')) {
        // Rapport de balance
        const trialData = this.extractDataFromTrialBalance(data)
        chiffre_affaires = trialData.revenue
        charges = trialData.expenses
        prestations_services = trialData.prestations_services
        ventes_biens = trialData.ventes_biens
        achats = trialData.achats
        charges_externes = trialData.charges_externes
        charges_personnel = trialData.charges_personnel
      } else if (endpoint.includes('customer_invoices') || endpoint.includes('supplier_invoices')) {
        // Factures (approximation pour lecture seule)
        const invoiceData = this.extractDataFromInvoices(data, endpoint)
        chiffre_affaires = invoiceData.revenue
        charges = invoiceData.expenses
        prestations_services = invoiceData.prestations_services
        achats = invoiceData.achats
      } else if (endpoint.includes('transactions')) {
        // Transactions (approximation pour lecture seule)
        const transactionData = this.extractDataFromTransactions(data)
        chiffre_affaires = transactionData.revenue
        charges = transactionData.expenses
      }
      
      const resultat_net = chiffre_affaires - charges
      
      result.push({
        period,
        chiffre_affaires,
        charges,
        resultat_net,
        currency: 'EUR',
        prestations_services,
        ventes_biens,
        achats,
        charges_externes,
        charges_personnel
      })
    }
    
    return result
  },

  // Traiter les données des ledger entries pour calculer les métriques comptables
  processLedgerEntriesData(ledgerEntries: LedgerEntry[]): PennylaneResultatComptable[] {
    console.log(`📊 Traitement de ${ledgerEntries.length} écritures comptables...`)
    
    // Créer les 12 derniers mois
    const result: PennylaneResultatComptable[] = []
    const currentDate = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const period = date.toISOString().slice(0, 7) // Format YYYY-MM
      
      // Filtrer les écritures pour ce mois
      const monthEntries = ledgerEntries.filter(entry => {
        const entryDate = new Date(entry.date)
        return entryDate.getFullYear() === date.getFullYear() && 
               entryDate.getMonth() === date.getMonth()
      })
      
      // Pour l'instant, nous n'avons que les métadonnées des écritures
      // Nous devrons récupérer les lignes détaillées pour obtenir les montants et comptes
      // En attendant, nous utilisons des estimations basées sur les types d'écritures
      
      let chiffre_affaires = 0
      let charges = 0
      
      // Analyser les labels pour estimer les montants
      monthEntries.forEach(entry => {
        const label = entry.label.toLowerCase()
        
        // Factures clients (chiffre d'affaires)
        if (label.includes('facture') && !label.includes('fournisseur')) {
          chiffre_affaires += this.estimateAmountFromLabel(entry.label)
        }
        
        // Charges diverses
        if (label.includes('prlv') || label.includes('sepa') || 
            label.includes('stripe') || label.includes('sumup')) {
          charges += this.estimateAmountFromLabel(entry.label)
        }
      })
      
      result.push({
        period,
        chiffre_affaires,
        charges,
        resultat_net: chiffre_affaires - charges,
        currency: 'EUR',
        prestations_services: chiffre_affaires, // Estimation
        ventes_biens: 0,
        achats: 0,
        charges_externes: charges * 0.7, // Estimation
        charges_personnel: charges * 0.3 // Estimation
      })
    }
    
    return result
  },

  // Estimer un montant à partir du label d'une écriture (méthode simplifiée)
  estimateAmountFromLabel(label: string): number {
    // Cette fonction est une estimation basique
    // Dans un vrai système, nous récupérerions les lignes détaillées
    const numbers = label.match(/\d+/g)
    if (numbers && numbers.length > 0) {
      // Prendre le plus grand nombre trouvé comme estimation
      return Math.max(...numbers.map(n => parseInt(n))) / 100 // Convertir en euros
    }
    return 0
  },

  // Extraire les données des factures (lecture seule)
  extractDataFromInvoices(data: any, endpoint: string): any {
    const invoices = data.invoices || data.data || []
    let revenue = 0
    let expenses = 0
    let prestations_services = 0
    let achats = 0
    
    invoices.forEach((invoice: any) => {
      const amount = parseFloat(invoice.currency_amount || invoice.amount || 0)
      
      if (endpoint.includes('customer_invoices')) {
        revenue += amount
        prestations_services += amount // Approximation
      } else if (endpoint.includes('supplier_invoices')) {
        expenses += amount
        achats += amount // Approximation
      }
    })
    
    return {
      revenue,
      expenses,
      prestations_services,
      achats
    }
  },

  // Extraire les données des transactions (lecture seule)
  extractDataFromTransactions(data: any): any {
    const transactions = data.transactions || data.data || []
    let revenue = 0
    let expenses = 0
    
    transactions.forEach((transaction: any) => {
      const amount = parseFloat(transaction.amount || 0)
      
      // Approximation basée sur le type de transaction
      if (transaction.type === 'income' || transaction.direction === 'in') {
        revenue += amount
      } else if (transaction.type === 'expense' || transaction.direction === 'out') {
        expenses += amount
      }
    })
    
    return {
      revenue,
      expenses
    }
  },

  // Extraire les revenus d'un compte de résultat
  extractRevenueFromIncomeStatement(data: any): number {
    // Chercher les sections de revenus dans le compte de résultat
    const revenueFields = ['revenue', 'sales', 'income', 'chiffre_affaires', 'produits', 'comptes_7']
    let totalRevenue = 0
    
    for (const field of revenueFields) {
      if (data[field] && typeof data[field] === 'number') {
        totalRevenue += data[field]
      }
    }
    
    return totalRevenue
  },

  // Extraire les charges d'un compte de résultat
  extractExpensesFromIncomeStatement(data: any): number {
    // Chercher les sections de charges dans le compte de résultat
    const expenseFields = ['expenses', 'charges', 'costs', 'comptes_6']
    let totalExpenses = 0
    
    for (const field of expenseFields) {
      if (data[field] && typeof data[field] === 'number') {
        totalExpenses += data[field]
      }
    }
    
    return totalExpenses
  },

  // Extraire les données d'un bilan comptable
  extractRevenueFromBalanceSheet(data: any): number {
    // Dans un bilan, les revenus peuvent être dans les capitaux propres ou en résultat
    return data.result || data.profit || data.retained_earnings || 0
  },

  extractExpensesFromBalanceSheet(data: any): number {
    // Dans un bilan, les charges sont généralement dans les dettes ou provisions
    return data.provisions || data.liabilities || 0
  },

  // Extraire les données d'une balance des comptes
  extractDataFromTrialBalance(data: any): any {
    const accounts = data.accounts || data.data || []
    let revenue = 0
    let expenses = 0
    let prestations_services = 0
    let ventes_biens = 0
    let achats = 0
    let charges_externes = 0
    let charges_personnel = 0
    
    accounts.forEach((account: any) => {
      const code = account.code || account.account_code || ''
      const balance = parseFloat(account.balance || account.solde || 0)
      
      // Comptes 7 (Produits)
      if (code.startsWith('7')) {
        revenue += balance
        if (code === '706') prestations_services = balance
        if (code === '701') ventes_biens = balance
      }
      
      // Comptes 6 (Charges)
      if (code.startsWith('6')) {
        expenses += balance
        if (code === '601') achats = balance
        if (code === '622') charges_externes = balance
        if (code === '641') charges_personnel = balance
      }
    })
    
    return {
      revenue,
      expenses,
      prestations_services,
      ventes_biens,
      achats,
      charges_externes,
      charges_personnel
    }
  },

  // Extraire les données d'un plan comptable
  extractDataFromAccounts(data: any): any {
    return this.extractDataFromTrialBalance(data) // Même logique que la balance
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



  // Récupérer la trésorerie à partir des données comptables réelles
  async getTresorerie(): Promise<PennylaneTresorerie[]> {
    try {
      // D'abord, vérifier la connexion avec l'endpoint qui fonctionne
      const companyData = await apiCall<PennylaneCompany>('me')
      console.log('✅ Connexion API confirmée pour DIMO DIAGNOSTIC:', companyData.company.name)
      
      console.log('💰 Récupération des données de trésorerie comptables...')
      
      // Essayer différents endpoints de trésorerie dans l'ordre de priorité
      const treasuryEndpoints = [
        'accounting/cash-flow',
        'financial-statements/cash-flow',
        'reports/cash-flow',
        'accounting/bank-accounts',
        'bank-accounts',
        'treasury',
        'cash-flow',
        'accounting/balance-sheet',
        'financial-statements/balance-sheet'
      ]
      
      for (const endpoint of treasuryEndpoints) {
        try {
          console.log(`🔄 Tentative trésorerie avec l'endpoint: ${endpoint}`)
          const data = await apiCall<any>(endpoint)
          
          if (data && (data.data || data.accounts || data.cash_flow || data.bank_accounts)) {
            console.log(`✅ Données de trésorerie trouvées dans ${endpoint}`)
            return this.processTreasuryDataFromEndpoint(data, endpoint)
          }
        } catch (endpointError) {
          console.log(`❌ ${endpoint} non disponible:`, endpointError instanceof Error ? endpointError.message : String(endpointError))
        }
      }
      
      // Si aucun endpoint ne fonctionne, retourner des données vides
      console.log('💰 Aucun endpoint trésorerie disponible, retour de données vides')
      return []
      
    } catch (error) {
      console.error('Erreur lors de la récupération de la trésorerie:', error)
      return []
    }
  },

  // Traiter les données de trésorerie selon l'endpoint utilisé
  processTreasuryDataFromEndpoint(data: any, endpoint: string): PennylaneTresorerie[] {
    console.log(`💰 Traitement des données de trésorerie depuis ${endpoint}`)
    
    // Créer les 12 derniers mois avec les données
    const result: PennylaneTresorerie[] = []
    const currentDate = new Date()
    let soldeInitial = 10000 // Solde initial par défaut
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const period = date.toISOString().substring(0, 7)
      
      // Extraire les données selon le type d'endpoint
      let encaissements = 0
      let decaissements = 0
      
      if (endpoint.includes('cash-flow')) {
        // Tableau de flux de trésorerie
        const cashFlowData = this.extractCashFlowData(data)
        encaissements = cashFlowData.inflows
        decaissements = cashFlowData.outflows
      } else if (endpoint.includes('bank-accounts')) {
        // Comptes bancaires
        const bankData = this.extractBankAccountData(data)
        encaissements = bankData.inflows
        decaissements = bankData.outflows
      } else if (endpoint.includes('balance-sheet')) {
        // Bilan comptable (comptes de trésorerie)
        const balanceData = this.extractTreasuryFromBalanceSheet(data)
        encaissements = balanceData.inflows
        decaissements = balanceData.outflows
      }
      
      const soldeFinal = soldeInitial + encaissements - decaissements
      
      result.push({
        period,
        solde_initial: soldeInitial,
        encaissements,
        decaissements,
        solde_final: soldeFinal,
        currency: 'EUR'
      })
      
      soldeInitial = soldeFinal
    }
    
    return result
  },

  // Extraire les données de flux de trésorerie
  extractCashFlowData(data: any): any {
    const cashFlow = data.cash_flow || data.data || {}
    return {
      inflows: cashFlow.inflows || cashFlow.incoming || cashFlow.receipts || 0,
      outflows: cashFlow.outflows || cashFlow.outgoing || cashFlow.payments || 0
    }
  },

  // Extraire les données des comptes bancaires
  extractBankAccountData(data: any): any {
    const accounts = data.bank_accounts || data.accounts || data.data || []
    let totalInflows = 0
    let totalOutflows = 0
    
    accounts.forEach((account: any) => {
      const balance = parseFloat(account.balance || account.solde || 0)
      if (balance > 0) {
        totalInflows += balance
      } else {
        totalOutflows += Math.abs(balance)
      }
    })
    
    return {
      inflows: totalInflows,
      outflows: totalOutflows
    }
  },

  // Extraire les données de trésorerie du bilan
  extractTreasuryFromBalanceSheet(data: any): any {
    // Chercher les comptes de trésorerie dans le bilan (comptes 5)
    const treasuryFields = ['cash', 'bank', 'treasury', 'liquidities', 'comptes_5']
    let totalTreasury = 0
    
    for (const field of treasuryFields) {
      if (data[field] && typeof data[field] === 'number') {
        totalTreasury += data[field]
      }
    }
    
    return {
      inflows: totalTreasury > 0 ? totalTreasury : 0,
      outflows: totalTreasury < 0 ? Math.abs(totalTreasury) : 0
    }
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
