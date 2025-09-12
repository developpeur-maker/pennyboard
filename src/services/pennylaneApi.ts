// Service pour l'API Pennylane via proxy Vercel
const API_BASE_URL = '/api'
const API_KEY = import.meta.env.VITE_PENNYLANE_API_KEY

// Types pour les comptes comptables (API v2)
export interface Account {
  id: number
  code: string
  name: string
  balance: number
  currency: string
  account_type?: string
  parent_id?: number
}

export interface AccountsResponse {
  total_pages: number
  current_page: number
  per_page: number
  total_items: number
  items: Account[]
}

// Types pour le trial balance (API v2)
export interface TrialBalanceAccount {
  number: string
  formatted_number: string
  label: string
  credits: string
  debits: string
}

export interface TrialBalanceResponse {
  total_pages: number
  current_page: number
  per_page: number
  total_items: number
  items: TrialBalanceAccount[]
}

// Types pour les données Pennylane
export interface PennylaneResultatComptable {
  period: string
  chiffre_affaires: number // CA Net (comptes 701-708 moins 709)
  total_produits_exploitation: number // Total des produits d'exploitation (tous les comptes 7)
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

if (!API_KEY) {
  console.warn('⚠️ VITE_PENNYLANE_API_KEY non configurée.')
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

// Fonction pour récupérer les ledger entries (qui contiennent les informations comptables)
export async function getLedgerEntries(page: number = 1, perPage: number = 100): Promise<any> {
  try {
    console.log(`📊 Récupération des ledger entries (page ${page})...`)
    const response = await apiCall<{success: boolean, raw_data: any}>(`test-accounts?page=${page}&per_page=${perPage}`)
    
    if (response.success && response.raw_data) {
      return response.raw_data
    }
    
    throw new Error('Format de réponse inattendu')
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des ledger entries:', error)
    throw error
  }
}

// Fonction pour récupérer le trial balance (balance des comptes)
export async function getTrialBalance(periodStart: string = '2025-01-01', periodEnd: string = '2025-01-31', page: number = 1, perPage: number = 100): Promise<TrialBalanceResponse> {
  try {
    console.log(`📊 Récupération du trial balance (${periodStart} à ${periodEnd})...`)
    const response = await apiCall<{success: boolean, raw_data: TrialBalanceResponse}>(`test-trial-balance?period_start=${periodStart}&period_end=${periodEnd}&page=${page}&per_page=${perPage}`)
    
    if (response.success && response.raw_data) {
      return response.raw_data
    }
    
    throw new Error('Format de réponse inattendu')
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du trial balance:', error)
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

  // Récupérer le résultat comptable basé sur le trial balance
  async getResultatComptable(selectedMonth: string = '2025-09'): Promise<PennylaneResultatComptable[]> {
    try {
      console.log(`📊 Récupération du résultat comptable pour ${selectedMonth}...`)
      
      // Convertir le mois sélectionné en dates
      const [year, month] = selectedMonth.split('-')
      const startDate = `${year}-${month}-01`
      const endDate = `${year}-${month}-31`
      
      // Récupérer le trial balance pour le mois sélectionné
      const trialBalance = await getTrialBalance(startDate, endDate, 1, 1000)
      
      if (!trialBalance.items || trialBalance.items.length === 0) {
        console.log('⚠️ Aucune donnée de trial balance trouvée')
        return []
      }
      
      console.log(`📋 ${trialBalance.items.length} comptes récupérés du trial balance`)
      
      // Traiter les données pour le mois sélectionné
      return this.processTrialBalanceData(trialBalance, selectedMonth)
      
    } catch (error) {
      console.error('Erreur lors de la récupération du résultat comptable:', error)
      return []
    }
  },

  // Récupérer la trésorerie basée sur le trial balance
  async getTresorerie(selectedMonth: string = '2025-09'): Promise<PennylaneTresorerie[]> {
    try {
      console.log(`💰 Récupération de la trésorerie pour ${selectedMonth}...`)
      
      // Convertir le mois sélectionné en dates
      const [year, month] = selectedMonth.split('-')
      const startDate = `${year}-${month}-01`
      const endDate = `${year}-${month}-31`
      
      // Récupérer le trial balance pour le mois sélectionné
      const trialBalance = await getTrialBalance(startDate, endDate, 1, 1000)
      
      if (!trialBalance.items || trialBalance.items.length === 0) {
        console.log('⚠️ Aucune donnée de trial balance trouvée pour la trésorerie')
        return []
      }
      
      console.log(`📋 ${trialBalance.items.length} comptes récupérés du trial balance pour la trésorerie`)
      
      // Traiter les données pour le mois sélectionné
      return this.processTreasuryFromTrialBalance(trialBalance, selectedMonth)
      
    } catch (error) {
      console.error('Erreur lors de la récupération de la trésorerie:', error)
      return []
    }
  },

  // Traiter les données du trial balance pour calculer les métriques
  processTrialBalanceData(trialBalance: TrialBalanceResponse, selectedMonth: string = '2025-09'): PennylaneResultatComptable[] {
    console.log(`📊 Traitement de ${trialBalance.items.length} comptes du trial balance...`)
    
    // Analyser les comptes par classe
    const comptes7 = trialBalance.items.filter(account => account.number.startsWith('7')) // Revenus
    const comptes6 = trialBalance.items.filter(account => account.number.startsWith('6')) // Charges
    const comptes5 = trialBalance.items.filter(account => account.number.startsWith('5')) // Trésorerie
    
    console.log(`📋 Comptes trouvés: 7 (${comptes7.length}), 6 (${comptes6.length}), 5 (${comptes5.length})`)
    
    // Calculer le Chiffre d'Affaires Net (comptes 701-708 moins 709)
    const comptesCA = comptes7.filter(account => {
      const num = parseInt(account.number.substring(0, 3))
      return num >= 701 && num <= 708 // Comptes de ventes
    })
    
    const comptesRistournes = comptes7.filter(account => account.number.startsWith('709')) // Ristournes
    
    const chiffreAffairesBrut = comptesCA.reduce((total, account) => {
      const credits = parseFloat(account.credits) || 0
      const debits = parseFloat(account.debits) || 0
      return total + credits - debits
    }, 0)
    
    const ristournes = comptesRistournes.reduce((total, account) => {
      const credits = parseFloat(account.credits) || 0
      const debits = parseFloat(account.debits) || 0
      return total + debits - credits // Les ristournes sont en débit
    }, 0)
    
    const chiffreAffairesNet = chiffreAffairesBrut - ristournes
    
    // Calculer le Total des Produits d'Exploitation (tous les comptes 7)
    const totalProduitsExploitation = comptes7.reduce((total, account) => {
      const credits = parseFloat(account.credits) || 0
      const debits = parseFloat(account.debits) || 0
      return total + credits - debits
    }, 0)
    
    const charges = comptes6.reduce((total, account) => {
      const credits = parseFloat(account.credits) || 0
      const debits = parseFloat(account.debits) || 0
      return total + debits - credits
    }, 0)
    
    const tresorerie = comptes5.reduce((total, account) => {
      const credits = parseFloat(account.credits) || 0
      const debits = parseFloat(account.debits) || 0
      return total + credits - debits
    }, 0)
    
    console.log(`💰 Calculs détaillés:`)
    console.log(`   - CA Net: ${chiffreAffairesNet.toFixed(2)}€`)
    console.log(`   - Total Produits Exploitation: ${totalProduitsExploitation.toFixed(2)}€`)
    console.log(`   - Charges: ${charges.toFixed(2)}€`)
    console.log(`   - Trésorerie: ${tresorerie.toFixed(2)}€`)
    
    // Créer un seul résultat pour le mois sélectionné
    const result: PennylaneResultatComptable[] = []
    
    result.push({
      period: selectedMonth,
      chiffre_affaires: chiffreAffairesNet, // CA Net (comptes 701-708 moins 709)
      total_produits_exploitation: totalProduitsExploitation, // Total des produits d'exploitation (tous les comptes 7)
      charges: charges,
      resultat_net: chiffreAffairesNet - charges,
      currency: 'EUR',
      prestations_services: chiffreAffairesNet, // CA Net pour les prestations
      ventes_biens: 0, // Pas de vente de biens pour DIMO DIAGNOSTIC
      achats: 0, // À calculer séparément si nécessaire
      charges_externes: charges * 0.8, // Estimation
      charges_personnel: charges * 0.2 // Estimation
    })
    
    return result
  },

  // Traiter les données des ledger entries pour calculer les métriques (fallback)
  processLedgerEntriesData(ledgerEntries: any[]): PennylaneResultatComptable[] {
    console.log(`📊 Traitement de ${ledgerEntries.length} écritures comptables...`)
    
    // Pour l'instant, nous utilisons une approche simplifiée
    // Dans une vraie implémentation, nous récupérerions les lignes détaillées de chaque écriture
    // pour obtenir les montants et codes comptables exacts
    
    console.log(`📋 Écritures comptables trouvées: ${ledgerEntries.length}`)
    console.log(`⚠️ Note: Les montants sont estimés car nous n'avons pas accès aux lignes détaillées`)
    
    // Estimation basée sur le nombre d'écritures
    // Dans un vrai système, nous analyserions les labels et récupérerions les lignes
    const chiffreAffairesEstime = ledgerEntries.length * 150 // Estimation 150€ par écriture
    const chargesEstimees = ledgerEntries.length * 80 // Estimation 80€ par écriture
    
    // Créer les 12 derniers mois
    const result: PennylaneResultatComptable[] = []
    const currentDate = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const period = date.toISOString().slice(0, 7) // Format YYYY-MM
      
      // Répartir les montants estimés sur 12 mois
      const chiffreAffaires = chiffreAffairesEstime / 12
      const charges = chargesEstimees / 12
      
      result.push({
        period,
        chiffre_affaires: chiffreAffaires,
        total_produits_exploitation: chiffreAffaires, // Même valeur pour le fallback
        charges: charges,
        resultat_net: chiffreAffaires - charges,
        currency: 'EUR',
        prestations_services: chiffreAffaires, // Tous les revenus sont des prestations
        ventes_biens: 0, // Pas de vente de biens pour DIMO DIAGNOSTIC
        achats: 0, // À calculer séparément si nécessaire
        charges_externes: charges * 0.8, // Estimation
        charges_personnel: charges * 0.2 // Estimation
      })
    }
    
    return result
  },

  // Traiter les données de trésorerie à partir du trial balance
  processTreasuryFromTrialBalance(trialBalance: TrialBalanceResponse, selectedMonth: string = '2025-09'): PennylaneTresorerie[] {
    console.log(`💰 Traitement de ${trialBalance.items.length} comptes pour la trésorerie...`)
    
    // Analyser les comptes de trésorerie (classe 5)
    const comptes5 = trialBalance.items.filter(account => account.number.startsWith('5'))
    
    console.log(`📋 Comptes de trésorerie trouvés: ${comptes5.length}`)
    
    // Calculer le solde total de trésorerie
    const soldeTotal = comptes5.reduce((total, account) => {
      const credits = parseFloat(account.credits) || 0
      const debits = parseFloat(account.debits) || 0
      return total + credits - debits
    }, 0)
    
    console.log(`💰 Solde total de trésorerie: ${soldeTotal.toFixed(2)}€`)
    
    // Créer un seul résultat pour le mois sélectionné
    const result: PennylaneTresorerie[] = []
    
    result.push({
      period: selectedMonth,
      solde_initial: soldeTotal,
      encaissements: soldeTotal * 0.6, // Estimation
      decaissements: soldeTotal * 0.4, // Estimation
      solde_final: soldeTotal,
      currency: 'EUR'
    })
    
    return result
  },

  // Traiter les données de trésorerie à partir des ledger entries (fallback)
  processTreasuryFromLedgerEntries(ledgerEntries: any[]): PennylaneTresorerie[] {
    console.log(`💰 Traitement de ${ledgerEntries.length} écritures pour la trésorerie...`)
    
    // Pour l'instant, nous utilisons une approche simplifiée
    // Dans une vraie implémentation, nous analyserions les écritures pour identifier les flux de trésorerie
    
    console.log(`📋 Écritures comptables trouvées: ${ledgerEntries.length}`)
    console.log(`⚠️ Note: Les montants de trésorerie sont estimés`)
    
    // Estimation basée sur le nombre d'écritures
    const soldeEstime = ledgerEntries.length * 100 // Estimation 100€ par écriture
    
    // Créer les 12 derniers mois
    const result: PennylaneTresorerie[] = []
    const currentDate = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const period = date.toISOString().slice(0, 7) // Format YYYY-MM
      
      // Répartir le solde estimé sur 12 mois
      const soldeMensuel = soldeEstime / 12
      
      result.push({
        period,
        solde_initial: soldeMensuel,
        encaissements: soldeMensuel * 0.6, // Estimation
        decaissements: soldeMensuel * 0.4, // Estimation
        solde_final: soldeMensuel,
        currency: 'EUR'
      })
    }
    
    return result
  },

  // Récupérer les données du trial balance pour le compte de résultat
  async getTrialBalanceData(selectedMonth: string = '2025-09'): Promise<TrialBalanceResponse> {
    try {
      console.log(`📊 Récupération des données trial balance pour ${selectedMonth}...`)
      
      // Convertir le mois sélectionné en dates
      const [year, month] = selectedMonth.split('-')
      const startDate = `${year}-${month}-01`
      const endDate = `${year}-${month}-31`
      
      // Récupérer le trial balance pour le mois sélectionné
      const trialBalance = await getTrialBalance(startDate, endDate, 1, 1000)
      
      if (!trialBalance.items || trialBalance.items.length === 0) {
        throw new Error('Aucune donnée de trial balance trouvée')
      }
      
      console.log(`📋 ${trialBalance.items.length} comptes récupérés du trial balance`)
      return trialBalance
      
    } catch (error) {
      console.error('Erreur lors de la récupération des données trial balance:', error)
      throw error
    }
  },

  // Récupérer les données du mois précédent pour comparaison
  async getPreviousMonthData(selectedMonth: string = '2025-09'): Promise<TrialBalanceResponse | null> {
    try {
      // Calculer le mois précédent
      const [year, month] = selectedMonth.split('-')
      const currentDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const previousDate = new Date(currentDate)
      previousDate.setMonth(previousDate.getMonth() - 1)
      
      const prevYear = previousDate.getFullYear()
      const prevMonth = String(previousDate.getMonth() + 1).padStart(2, '0')
      const prevMonthStr = `${prevYear}-${prevMonth}`
      
      console.log(`📊 Récupération des données du mois précédent: ${prevMonthStr}...`)
      
      const startDate = `${prevYear}-${prevMonth}-01`
      const endDate = `${prevYear}-${prevMonth}-31`
      
      // Récupérer le trial balance pour le mois précédent
      const trialBalance = await getTrialBalance(startDate, endDate, 1, 1000)
      
      if (!trialBalance.items || trialBalance.items.length === 0) {
        console.log(`⚠️ Aucune donnée trouvée pour le mois précédent ${prevMonthStr}`)
        return null
      }
      
      console.log(`📋 ${trialBalance.items.length} comptes récupérés du mois précédent`)
      return trialBalance
      
    } catch (error) {
      console.error('Erreur lors de la récupération des données du mois précédent:', error)
      return null
    }
  },

  // Récupérer les KPIs consolidés
  async getKPIs(selectedMonth: string = '2025-09'): Promise<{
    chiffre_affaires: number | null
    total_produits_exploitation: number | null
    charges: number | null
    resultat_net: number | null
    solde_tresorerie: number | null
    growth: number | null
    hasData: boolean
  }> {
    try {
      console.log(`📊 Récupération des KPIs pour ${selectedMonth}...`)
      
      const [resultatData, tresorerieData] = await Promise.all([
        this.getResultatComptable(selectedMonth),
        this.getTresorerie(selectedMonth)
      ])
      
      if (resultatData.length === 0 || tresorerieData.length === 0) {
        return {
          chiffre_affaires: null,
          total_produits_exploitation: null,
          charges: null,
          resultat_net: null,
          solde_tresorerie: null,
          growth: null,
          hasData: false
        }
      }
      
      // Prendre les données du mois sélectionné
      const currentResultat = resultatData[0] // Premier (et seul) élément pour le mois sélectionné
      const currentTresorerie = tresorerieData[0] // Premier (et seul) élément pour le mois sélectionné
      
      // Pour l'instant, on ne calcule pas de croissance car nous n'avons qu'un mois de données
      // Dans une vraie implémentation, nous récupérerions les données de plusieurs mois
      let growth = null
      
      return {
        chiffre_affaires: currentResultat.chiffre_affaires,
        total_produits_exploitation: currentResultat.total_produits_exploitation,
        charges: currentResultat.charges,
        resultat_net: currentResultat.resultat_net,
        solde_tresorerie: currentTresorerie.solde_final,
        growth,
        hasData: true
      }
      
    } catch (error) {
      console.error('Erreur lors de la récupération des KPIs:', error)
      return {
        chiffre_affaires: null,
        total_produits_exploitation: null,
        charges: null,
        resultat_net: null,
        solde_tresorerie: null,
        growth: null,
        hasData: false
      }
    }
  },

  // Calculer le compte de résultat complet avec comparaisons
  calculateIncomeStatement(trialBalance: TrialBalanceResponse, previousTrialBalance?: TrialBalanceResponse | null): {
    produits: {
      vente_marchandises: { current: number, previous: number, variation: number }
      production_vendue_biens: { current: number, previous: number, variation: number }
      production_vendue_services: { current: number, previous: number, variation: number }
      montant_net_ca: { current: number, previous: number, variation: number }
      production_stockee: { current: number, previous: number, variation: number }
      production_immobilisee: { current: number, previous: number, variation: number }
      subventions: { current: number, previous: number, variation: number }
      reprises_amortissements: { current: number, previous: number, variation: number }
      autres_produits: { current: number, previous: number, variation: number }
      total_produits_exploitation: { current: number, previous: number, variation: number }
    }
    charges: {
      achats_marchandises: { current: number, previous: number, variation: number }
      autres_achats_charges_externes: { current: number, previous: number, variation: number }
      impots_taxes: { current: number, previous: number, variation: number }
      salaires: { current: number, previous: number, variation: number }
      cotisations_sociales: { current: number, previous: number, variation: number }
      dotations_amortissements: { current: number, previous: number, variation: number }
      autres_charges: { current: number, previous: number, variation: number }
      total_charges_exploitation: { current: number, previous: number, variation: number }
    }
    resultat_exploitation: { current: number, previous: number, variation: number }
  } {
    console.log(`📊 Calcul du compte de résultat à partir de ${trialBalance.items.length} comptes...`)
    
    // Fonction helper pour calculer le solde d'un compte
    const getAccountBalance = (accountNumber: string, data: TrialBalanceResponse): number => {
      const account = data.items.find(acc => acc.number === accountNumber)
      if (!account) return 0
      const credits = parseFloat(account.credits) || 0
      const debits = parseFloat(account.debits) || 0
      return credits - debits
    }

    // Fonction helper pour calculer le solde d'une classe de comptes
    const getClassBalance = (classPrefix: string, data: TrialBalanceResponse): number => {
      return data.items
        .filter(account => account.number.startsWith(classPrefix))
        .reduce((total, account) => {
          const credits = parseFloat(account.credits) || 0
          const debits = parseFloat(account.debits) || 0
          return total + credits - debits
        }, 0)
    }

    // Fonction helper pour créer un objet avec comparaison
    const createComparison = (current: number, previous: number = 0) => ({
      current,
      previous,
      variation: current - previous
    })

    // PRODUITS D'EXPLOITATION - Mois actuel
    const vente_marchandises_current = getAccountBalance('707', trialBalance)
    const production_vendue_biens_current = getClassBalance('701', trialBalance) + getClassBalance('702', trialBalance) + getClassBalance('703', trialBalance)
    const production_vendue_services_current = getClassBalance('706', trialBalance)
    const montant_net_ca_current = vente_marchandises_current + production_vendue_biens_current + production_vendue_services_current
    const production_stockee_current = getClassBalance('71', trialBalance)
    const production_immobilisee_current = getClassBalance('72', trialBalance)
    const subventions_current = getClassBalance('74', trialBalance)
    const reprises_amortissements_current = getClassBalance('78', trialBalance)
    const autres_produits_current = getClassBalance('75', trialBalance)
    const total_produits_exploitation_current = getClassBalance('7', trialBalance)

    // PRODUITS D'EXPLOITATION - Mois précédent
    const vente_marchandises_previous = previousTrialBalance ? getAccountBalance('707', previousTrialBalance) : 0
    const production_vendue_biens_previous = previousTrialBalance ? 
      getClassBalance('701', previousTrialBalance) + getClassBalance('702', previousTrialBalance) + getClassBalance('703', previousTrialBalance) : 0
    const production_vendue_services_previous = previousTrialBalance ? getClassBalance('706', previousTrialBalance) : 0
    const montant_net_ca_previous = vente_marchandises_previous + production_vendue_biens_previous + production_vendue_services_previous
    const production_stockee_previous = previousTrialBalance ? getClassBalance('71', previousTrialBalance) : 0
    const production_immobilisee_previous = previousTrialBalance ? getClassBalance('72', previousTrialBalance) : 0
    const subventions_previous = previousTrialBalance ? getClassBalance('74', previousTrialBalance) : 0
    const reprises_amortissements_previous = previousTrialBalance ? getClassBalance('78', previousTrialBalance) : 0
    const autres_produits_previous = previousTrialBalance ? getClassBalance('75', previousTrialBalance) : 0
    const total_produits_exploitation_previous = previousTrialBalance ? getClassBalance('7', previousTrialBalance) : 0

    // CHARGES D'EXPLOITATION - Mois actuel
    const achats_marchandises_current = getAccountBalance('607', trialBalance)
    const autres_achats_charges_externes_current = getClassBalance('622', trialBalance)
    const impots_taxes_current = getClassBalance('635', trialBalance)
    const salaires_current = getClassBalance('641', trialBalance)
    const cotisations_sociales_current = getClassBalance('645', trialBalance)
    const dotations_amortissements_current = getClassBalance('681', trialBalance)
    const autres_charges_current = getClassBalance('67', trialBalance)
    const total_charges_exploitation_current = getClassBalance('6', trialBalance)

    // CHARGES D'EXPLOITATION - Mois précédent
    const achats_marchandises_previous = previousTrialBalance ? getAccountBalance('607', previousTrialBalance) : 0
    const autres_achats_charges_externes_previous = previousTrialBalance ? getClassBalance('622', previousTrialBalance) : 0
    const impots_taxes_previous = previousTrialBalance ? getClassBalance('635', previousTrialBalance) : 0
    const salaires_previous = previousTrialBalance ? getClassBalance('641', previousTrialBalance) : 0
    const cotisations_sociales_previous = previousTrialBalance ? getClassBalance('645', previousTrialBalance) : 0
    const dotations_amortissements_previous = previousTrialBalance ? getClassBalance('681', previousTrialBalance) : 0
    const autres_charges_previous = previousTrialBalance ? getClassBalance('67', previousTrialBalance) : 0
    const total_charges_exploitation_previous = previousTrialBalance ? getClassBalance('6', previousTrialBalance) : 0

    // RÉSULTAT D'EXPLOITATION
    const resultat_exploitation_current = total_produits_exploitation_current - total_charges_exploitation_current
    const resultat_exploitation_previous = total_produits_exploitation_previous - total_charges_exploitation_previous

    console.log(`💰 Compte de résultat calculé avec comparaisons:`)
    console.log(`   - CA Net: ${montant_net_ca_current.toFixed(2)}€ (${montant_net_ca_previous.toFixed(2)}€ mois précédent)`)
    console.log(`   - Total Produits: ${total_produits_exploitation_current.toFixed(2)}€ (${total_produits_exploitation_previous.toFixed(2)}€ mois précédent)`)
    console.log(`   - Total Charges: ${total_charges_exploitation_current.toFixed(2)}€ (${total_charges_exploitation_previous.toFixed(2)}€ mois précédent)`)
    console.log(`   - Résultat Exploitation: ${resultat_exploitation_current.toFixed(2)}€ (${resultat_exploitation_previous.toFixed(2)}€ mois précédent)`)

    return {
      produits: {
        vente_marchandises: createComparison(vente_marchandises_current, vente_marchandises_previous),
        production_vendue_biens: createComparison(production_vendue_biens_current, production_vendue_biens_previous),
        production_vendue_services: createComparison(production_vendue_services_current, production_vendue_services_previous),
        montant_net_ca: createComparison(montant_net_ca_current, montant_net_ca_previous),
        production_stockee: createComparison(production_stockee_current, production_stockee_previous),
        production_immobilisee: createComparison(production_immobilisee_current, production_immobilisee_previous),
        subventions: createComparison(subventions_current, subventions_previous),
        reprises_amortissements: createComparison(reprises_amortissements_current, reprises_amortissements_previous),
        autres_produits: createComparison(autres_produits_current, autres_produits_previous),
        total_produits_exploitation: createComparison(total_produits_exploitation_current, total_produits_exploitation_previous)
      },
      charges: {
        achats_marchandises: createComparison(achats_marchandises_current, achats_marchandises_previous),
        autres_achats_charges_externes: createComparison(autres_achats_charges_externes_current, autres_achats_charges_externes_previous),
        impots_taxes: createComparison(impots_taxes_current, impots_taxes_previous),
        salaires: createComparison(salaires_current, salaires_previous),
        cotisations_sociales: createComparison(cotisations_sociales_current, cotisations_sociales_previous),
        dotations_amortissements: createComparison(dotations_amortissements_current, dotations_amortissements_previous),
        autres_charges: createComparison(autres_charges_current, autres_charges_previous),
        total_charges_exploitation: createComparison(total_charges_exploitation_current, total_charges_exploitation_previous)
      },
      resultat_exploitation: createComparison(resultat_exploitation_current, resultat_exploitation_previous)
    }
  }
}
