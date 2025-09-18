import { useState, useEffect } from 'react'
import { pennylaneApi, PennylaneTresorerie } from '../services/pennylaneApi'

interface KPIData {
  ventes_706: number | null // VRAIES VENTES (compte 706 uniquement)
  chiffre_affaires: number | null // CA Net (comptes 701-708 moins 709)
  total_produits_exploitation: number | null // Total des produits d'exploitation (tous les comptes 7)
  charges: number | null
  resultat_net: number | null
  solde_tresorerie: number | null
  growth: number | null
  hasData: boolean
  rentabilite: {
    ratio: number
    message: string
    montant: number
    projection?: {
      ratio: number
      message: string
      montant: number
    }
  } | null
  // Nouvelles comparaisons
  ventes_growth: number | null // Croissance des vraies ventes
  ca_growth: number | null
  total_produits_growth: number | null
  charges_growth: number | null
  resultat_growth: number | null
  tresorerie_growth: number | null
}

interface UsePennylaneDataReturn {
  kpis: KPIData | null
  tresorerie: PennylaneTresorerie[]
  fiscalYears: Array<{id: string, name: string, start_date: string, end_date: string}>
  chargesBreakdown: Array<{code: string, label: string, description: string, amount: number}>
  revenusBreakdown: Array<{code: string, label: string, description: string, amount: number}>
  tresorerieBreakdown: Array<{code: string, label: string, description: string, amount: number}>
  loading: boolean
  error: string | null
  refetch: () => void
}

export const usePennylaneData = (
  selectedMonth: string = '2025-09', 
  selectedFiscalYear?: string,
  viewMode: 'month' | 'year' = 'month',
  selectedYear: string = '2025'
): UsePennylaneDataReturn => {
  const [kpis, setKpis] = useState<KPIData | null>(null)
  const [tresorerie, setTresorerie] = useState<PennylaneTresorerie[]>([])
  const [fiscalYears, setFiscalYears] = useState<Array<{id: string, name: string, start_date: string, end_date: string}>>([])
  const [chargesBreakdown, setChargesBreakdown] = useState<Array<{code: string, label: string, description: string, amount: number}>>([])
  const [revenusBreakdown, setRevenusBreakdown] = useState<Array<{code: string, label: string, description: string, amount: number}>>([])
  const [tresorerieBreakdown, setTresorerieBreakdown] = useState<Array<{code: string, label: string, description: string, amount: number}>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Tester la connexion d'abord
      console.log('🔍 Test de connexion à l\'API Pennylane...')
      const connectionTest = await pennylaneApi.testConnection()
      
      if (!connectionTest) {
        throw new Error('Impossible de se connecter à l\'API Pennylane. Vérifiez votre clé API.')
      }

      console.log('✅ Connexion réussie, chargement des données...')

      // Charger les exercices fiscaux d'abord
      const fiscalYearsData = await pennylaneApi.getFiscalYears()
      setFiscalYears(fiscalYearsData)

      // APPROCHE SIMPLE: Appels séparés et clairs
      console.log('📊 Récupération des données...')
      
      const [kpisData, chargesBreakdownData, revenusBreakdownData, tresorerieData, tresorerieBreakdownData] = await Promise.all([
        pennylaneApi.getKPIs(selectedMonth),
        pennylaneApi.processChargesBreakdownFromMonth(selectedMonth),
        pennylaneApi.processRevenusBreakdownFromMonth(selectedMonth),
        pennylaneApi.getTresorerieActuelle(), // Trésorerie fixe au jour actuel
        pennylaneApi.processTresorerieBreakdownFromMonth(selectedMonth)
      ])
      
      setKpis(kpisData)
      setTresorerie(tresorerieData)
      setChargesBreakdown(chargesBreakdownData)
      setRevenusBreakdown(revenusBreakdownData)
      setTresorerieBreakdown(tresorerieBreakdownData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      console.error('Erreur lors du chargement des données Pennylane:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedMonth, selectedFiscalYear, viewMode, selectedYear])

  return {
    kpis,
    tresorerie,
    fiscalYears,
    chargesBreakdown,
    revenusBreakdown,
    tresorerieBreakdown,
    loading,
    error,
    refetch: fetchData
  }
}
