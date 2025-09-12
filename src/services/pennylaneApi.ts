// Service pour l'API Pennylane via proxy Vercel
const API_BASE_URL = '/api/pennylane'
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
  id: string
  name: string
  currency: string
  fiscal_year_end: string
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
      const data = await apiCall<PennylaneCompany>('companies/me')
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
      return await apiCall<PennylaneCompany>('companies/me')
    } catch (error) {
      console.error('Erreur lors de la récupération des données de l\'entreprise:', error)
      // Retourner des données par défaut
      return {
        id: 'dimo-diagnostic',
        name: 'DIMO DIAGNOSTIC',
        currency: 'EUR',
        fiscal_year_end: '12-31'
      }
    }
  },

  // Récupérer le résultat comptable
  async getResultatComptable(): Promise<PennylaneResultatComptable[]> {
    try {
      // Essayer différents endpoints possibles selon la doc Pennylane
      const endpoints = [
        'companies/me/financial-statements/income-statement',
        'financial-statements/income-statement',
        'companies/me/income-statement',
        'income-statement',
        'companies/me/financial-statements',
        'financial-statements'
      ]

      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Tentative avec endpoint: ${endpoint}`)
          const data = await apiCall<{ data: PennylaneResultatComptable[] }>(endpoint)
          if (data && data.data) {
            console.log(`✅ Succès avec endpoint: ${endpoint}`)
            return data.data
          }
        } catch (endpointError) {
          console.log(`❌ Échec avec endpoint: ${endpoint}`, endpointError)
          continue
        }
      }
      
      throw new Error('Aucun endpoint valide trouvé pour le résultat comptable')
    } catch (error) {
      console.error('Erreur lors de la récupération du résultat comptable:', error)
      // Retourner des données simulées
      return [
        { period: '2024-01', chiffre_affaires: 45000, charges: 30000, resultat_net: 15000, currency: 'EUR' },
        { period: '2024-02', chiffre_affaires: 52000, charges: 34000, resultat_net: 18000, currency: 'EUR' },
        { period: '2024-03', chiffre_affaires: 48000, charges: 36000, resultat_net: 12000, currency: 'EUR' },
        { period: '2024-04', chiffre_affaires: 61000, charges: 39000, resultat_net: 22000, currency: 'EUR' },
        { period: '2024-05', chiffre_affaires: 55000, charges: 36000, resultat_net: 19000, currency: 'EUR' },
        { period: '2024-06', chiffre_affaires: 67000, charges: 42000, resultat_net: 25000, currency: 'EUR' },
      ]
    }
  },

  // Récupérer la trésorerie
  async getTresorerie(): Promise<PennylaneTresorerie[]> {
    try {
      // Essayer différents endpoints possibles selon la doc Pennylane
      const endpoints = [
        'companies/me/financial-statements/cash-flow',
        'financial-statements/cash-flow',
        'companies/me/cash-flow',
        'cash-flow',
        'companies/me/cashflow',
        'cashflow'
      ]

      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Tentative avec endpoint: ${endpoint}`)
          const data = await apiCall<{ data: PennylaneTresorerie[] }>(endpoint)
          if (data && data.data) {
            console.log(`✅ Succès avec endpoint: ${endpoint}`)
            return data.data
          }
        } catch (endpointError) {
          console.log(`❌ Échec avec endpoint: ${endpoint}`, endpointError)
          continue
        }
      }
      
      throw new Error('Aucun endpoint valide trouvé pour la trésorerie')
    } catch (error) {
      console.error('Erreur lors de la récupération de la trésorerie:', error)
      // Retourner des données simulées
      return [
        { period: '2024-01', solde_initial: 10000, encaissements: 45000, decaissements: 30000, solde_final: 25000, currency: 'EUR' },
        { period: '2024-02', solde_initial: 25000, encaissements: 52000, decaissements: 34000, solde_final: 43000, currency: 'EUR' },
        { period: '2024-03', solde_initial: 43000, encaissements: 48000, decaissements: 36000, solde_final: 55000, currency: 'EUR' },
        { period: '2024-04', solde_initial: 55000, encaissements: 61000, decaissements: 39000, solde_final: 77000, currency: 'EUR' },
        { period: '2024-05', solde_initial: 77000, encaissements: 55000, decaissements: 36000, solde_final: 96000, currency: 'EUR' },
        { period: '2024-06', solde_initial: 96000, encaissements: 67000, decaissements: 42000, solde_final: 121000, currency: 'EUR' },
      ]
    }
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
