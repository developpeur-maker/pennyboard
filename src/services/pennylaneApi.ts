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

// Fonction pour récupérer les comptes comptables
export async function getAccounts(page: number = 1, perPage: number = 100): Promise<AccountsResponse> {
  try {
    console.log(`📊 Récupération des comptes comptables (page ${page})...`)
    const response = await apiCall<{success: boolean, raw_data: AccountsResponse}>(`test-accounts?page=${page}&per_page=${perPage}`)
    
    if (response.success && response.raw_data) {
      return response.raw_data
    }
    
    throw new Error('Format de réponse inattendu')
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des comptes comptables:', error)
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

  // Récupérer le résultat comptable basé sur les comptes comptables
  async getResultatComptable(): Promise<PennylaneResultatComptable[]> {
    try {
      console.log('📊 Récupération du résultat comptable depuis les comptes comptables...')
      
      // Récupérer les comptes comptables
      const accounts = await getAccounts(1, 1000) // Récupérer plus de comptes
      
      if (!accounts.items || accounts.items.length === 0) {
        console.log('⚠️ Aucun compte comptable trouvé')
        return []
      }
      
      console.log(`📋 ${accounts.items.length} comptes comptables récupérés`)
      
      // Traiter les données pour les 12 derniers mois
      return this.processAccountsData(accounts.items)
      
    } catch (error) {
      console.error('Erreur lors de la récupération du résultat comptable:', error)
      return []
    }
  },

  // Récupérer la trésorerie basée sur les comptes comptables
  async getTresorerie(): Promise<PennylaneTresorerie[]> {
    try {
      console.log('💰 Récupération de la trésorerie depuis les comptes comptables...')
      
      // Récupérer les comptes comptables
      const accounts = await getAccounts(1, 1000)
      
      if (!accounts.items || accounts.items.length === 0) {
        console.log('⚠️ Aucun compte comptable trouvé pour la trésorerie')
        return []
      }
      
      console.log(`📋 ${accounts.items.length} comptes comptables récupérés pour la trésorerie`)
      
      // Traiter les données pour les 12 derniers mois
      return this.processTreasuryFromAccounts(accounts.items)
      
    } catch (error) {
      console.error('Erreur lors de la récupération de la trésorerie:', error)
      return []
    }
  },

  // Traiter les données des comptes comptables pour calculer les métriques
  processAccountsData(accounts: Account[]): PennylaneResultatComptable[] {
    console.log(`📊 Traitement de ${accounts.length} comptes comptables...`)
    
    // Séparer les comptes par classe comptable
    const comptes7 = accounts.filter(account => account.code.startsWith('7')) // Revenus
    const comptes6 = accounts.filter(account => account.code.startsWith('6')) // Charges
    const comptes5 = accounts.filter(account => account.code.startsWith('5')) // Charges financières
    
    console.log(`📋 Comptes trouvés:`)
    console.log(`   - Comptes 7 (Revenus): ${comptes7.length}`)
    console.log(`   - Comptes 6 (Charges): ${comptes6.length}`)
    console.log(`   - Comptes 5 (Charges financières): ${comptes5.length}`)
    
    // Calculer les totaux
    const totalRevenus = comptes7.reduce((sum, account) => sum + (account.balance || 0), 0)
    const totalCharges = comptes6.reduce((sum, account) => sum + (account.balance || 0), 0)
    const totalChargesFinancieres = comptes5.reduce((sum, account) => sum + (account.balance || 0), 0)
    
    // Calculer le résultat net (Revenus - Charges - Charges financières)
    const resultatNet = totalRevenus - totalCharges - totalChargesFinancieres
    
    console.log(`💰 Calculs:`)
    console.log(`   - Total Revenus (Comptes 7): ${totalRevenus}€`)
    console.log(`   - Total Charges (Comptes 6): ${totalCharges}€`)
    console.log(`   - Total Charges Financières (Comptes 5): ${totalChargesFinancieres}€`)
    console.log(`   - Résultat Net: ${resultatNet}€`)
    
    // Créer les 12 derniers mois avec les mêmes données (car les comptes sont annuels)
    const result: PennylaneResultatComptable[] = []
    const currentDate = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const period = date.toISOString().slice(0, 7) // Format YYYY-MM
      
      // Pour l'instant, on utilise les mêmes montants pour tous les mois
      // Dans une vraie implémentation, on récupérerait les soldes par période
      const chiffreAffaires = Math.abs(totalRevenus) / 12 // Répartir sur 12 mois
      const charges = Math.abs(totalCharges) / 12 // Répartir sur 12 mois
      const chargesFinancieres = Math.abs(totalChargesFinancieres) / 12
      
      result.push({
        period,
        chiffre_affaires: chiffreAffaires,
        charges: charges + chargesFinancieres,
        resultat_net: chiffreAffaires - charges - chargesFinancieres,
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

  // Traiter les données de trésorerie à partir des comptes comptables
  processTreasuryFromAccounts(accounts: Account[]): PennylaneTresorerie[] {
    console.log(`💰 Traitement de ${accounts.length} comptes pour la trésorerie...`)
    
    // Trouver les comptes de trésorerie (comptes 5xxx généralement)
    const comptesTresorerie = accounts.filter(account => 
      account.code.startsWith('5') && 
      (account.name.toLowerCase().includes('banque') || 
       account.name.toLowerCase().includes('caisse') ||
       account.name.toLowerCase().includes('compte'))
    )
    
    console.log(`🏦 Comptes de trésorerie trouvés: ${comptesTresorerie.length}`)
    
    // Calculer le solde total de trésorerie
    const soldeTotal = comptesTresorerie.reduce((sum, account) => sum + (account.balance || 0), 0)
    
    console.log(`💰 Solde total de trésorerie: ${soldeTotal}€`)
    
    // Créer les 12 derniers mois
    const result: PennylaneTresorerie[] = []
    const currentDate = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const period = date.toISOString().slice(0, 7) // Format YYYY-MM
      
      // Pour l'instant, on utilise le même solde pour tous les mois
      // Dans une vraie implémentation, on récupérerait les soldes par période
      const soldeMensuel = soldeTotal / 12
      
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

  // Récupérer les KPIs consolidés
  async getKPIs(): Promise<{
    chiffre_affaires: number | null
    charges: number | null
    resultat_net: number | null
    solde_tresorerie: number | null
    growth: number | null
    hasData: boolean
  }> {
    try {
      console.log('📊 Récupération des KPIs...')
      
      const [resultatData, tresorerieData] = await Promise.all([
        this.getResultatComptable(),
        this.getTresorerie()
      ])
      
      if (resultatData.length === 0 || tresorerieData.length === 0) {
        return {
          chiffre_affaires: null,
          charges: null,
          resultat_net: null,
          solde_tresorerie: null,
          growth: null,
          hasData: false
        }
      }
      
      // Prendre les données du mois le plus récent
      const dernierResultat = resultatData[resultatData.length - 1]
      const derniereTresorerie = tresorerieData[tresorerieData.length - 1]
      
      // Calculer la croissance (comparaison avec le mois précédent)
      let growth = null
      if (resultatData.length > 1) {
        const moisPrecedent = resultatData[resultatData.length - 2]
        if (moisPrecedent.chiffre_affaires > 0) {
          growth = ((dernierResultat.chiffre_affaires - moisPrecedent.chiffre_affaires) / moisPrecedent.chiffre_affaires) * 100
        }
      }
      
      return {
        chiffre_affaires: dernierResultat.chiffre_affaires,
        charges: dernierResultat.charges,
        resultat_net: dernierResultat.resultat_net,
        solde_tresorerie: derniereTresorerie.solde_final,
        growth,
        hasData: true
      }
      
    } catch (error) {
      console.error('Erreur lors de la récupération des KPIs:', error)
      return {
        chiffre_affaires: null,
        charges: null,
        resultat_net: null,
        solde_tresorerie: null,
        growth: null,
        hasData: false
      }
    }
  }
}
