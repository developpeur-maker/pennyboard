// Service pour communiquer avec l'API de base de données
// Remplace les appels directs à pennylaneApi pour les données synchronisées

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://pennyboard.vercel.app/api' 
  : 'http://localhost:3000/api'

const API_KEY = process.env.VITE_API_KEY || 'pennyboard_secret_key_2025'

interface DatabaseApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  month?: string
  updated_at?: string
  is_stale?: boolean
  age_hours?: number
}

interface KPIData {
  ventes_706: number
  chiffre_affaires: number
  charges: number
  resultat_net: number
  tresorerie: number
  currency: string
  period: string
}

interface BreakdownData {
  [key: string]: {
    total: number
    accounts: Array<{
      number: string
      label: string
      amount: number
    }>
  }
}

interface TresorerieBreakdown {
  [key: string]: {
    number: string
    label: string
    balance: number
  }
}

interface MonthlyData {
  month: string
  year: number
  month_number: number
  kpis: KPIData
  charges_breakdown: BreakdownData
  revenus_breakdown: BreakdownData
  tresorerie_breakdown: TresorerieBreakdown
  trial_balance: any
  is_current_month: boolean
  updated_at: string
}

// Fonction utilitaire pour faire des appels API
async function apiCall<T>(endpoint: string, params?: Record<string, string>): Promise<DatabaseApiResponse<T>> {
  try {
    const url = new URL(`${API_BASE_URL}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error(`❌ Erreur API ${endpoint}:`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }
  }
}

// Récupérer les KPIs pour un mois donné
export async function getKPIsFromDatabase(month: string): Promise<DatabaseApiResponse<KPIData>> {
  console.log(`📊 Récupération des KPIs depuis la base de données pour ${month}`)
  return apiCall<KPIData>('/data', { month, type: 'kpis' })
}

// Récupérer les breakdowns pour un mois donné
export async function getBreakdownsFromDatabase(month: string): Promise<DatabaseApiResponse<{
  charges_breakdown: BreakdownData
  revenus_breakdown: BreakdownData
  tresorerie_breakdown: TresorerieBreakdown
}>> {
  console.log(`📊 Récupération des breakdowns depuis la base de données pour ${month}`)
  return apiCall<{
    charges_breakdown: BreakdownData
    revenus_breakdown: BreakdownData
    tresorerie_breakdown: TresorerieBreakdown
  }>('/data', { month, type: 'breakdown' })
}

// Récupérer toutes les données pour un mois donné
export async function getAllDataFromDatabase(month: string): Promise<DatabaseApiResponse<MonthlyData>> {
  console.log(`📊 Récupération de toutes les données depuis la base de données pour ${month}`)
  return apiCall<MonthlyData>('/data', { month })
}

// Récupérer les données du mois actuel
export async function getCurrentMonthData(): Promise<DatabaseApiResponse<MonthlyData>> {
  const currentMonth = new Date().toISOString().slice(0, 7) // Format YYYY-MM
  console.log(`📊 Récupération des données du mois actuel: ${currentMonth}`)
  return getAllDataFromDatabase(currentMonth)
}

// Vérifier si les données sont à jour
export function isDataStale(updatedAt: string, maxAgeHours: number = 24): boolean {
  const dataAge = Date.now() - new Date(updatedAt).getTime()
  const maxAge = maxAgeHours * 60 * 60 * 1000
  return dataAge > maxAge
}

// Obtenir l'âge des données en heures
export function getDataAge(updatedAt: string): number {
  const dataAge = Date.now() - new Date(updatedAt).getTime()
  return Math.round(dataAge / (60 * 60 * 1000))
}

// Fonction de fallback vers l'API Pennylane directe
export async function fallbackToPennylaneApi(month: string) {
  console.log(`⚠️ Fallback vers l'API Pennylane directe pour ${month}`)
  
  // Importer dynamiquement pour éviter les dépendances circulaires
  const { getKPIs, processChargesBreakdownFromMonth, processRevenusBreakdownFromMonth, getTresorerieActuelle, processTresorerieBreakdownFromMonth } = await import('./pennylaneApi')
  
  try {
    const [kpisData, chargesBreakdown, revenusBreakdown, tresorerieActuelle, tresorerieBreakdown] = await Promise.all([
      getKPIs(month),
      processChargesBreakdownFromMonth(month),
      processRevenusBreakdownFromMonth(month),
      getTresorerieActuelle(month),
      processTresorerieBreakdownFromMonth(month)
    ])

    return {
      success: true,
      data: {
        month,
        kpis: kpisData,
        charges_breakdown: chargesBreakdown,
        revenus_breakdown: revenusBreakdown,
        tresorerie_breakdown: tresorerieBreakdown,
        tresorerie_actuelle: tresorerieActuelle,
        updated_at: new Date().toISOString(),
        is_fallback: true
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors du fallback vers Pennylane:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}
