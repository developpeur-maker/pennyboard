import { useState, useEffect } from 'react'
import { pennylaneApi, PennylaneResultatComptable, PennylaneTresorerie } from '../services/pennylaneApi'

interface KPIData {
  chiffre_affaires: number | null // CA Net (comptes 701-708 moins 709)
  total_produits_exploitation: number | null // Total des produits d'exploitation (tous les comptes 7)
  charges: number | null
  resultat_net: number | null
  solde_tresorerie: number | null
  growth: number | null
  hasData: boolean
}

interface UsePennylaneDataReturn {
  kpis: KPIData | null
  resultatComptable: PennylaneResultatComptable[]
  tresorerie: PennylaneTresorerie[]
  incomeStatement: any | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export const usePennylaneData = (selectedMonth: string = '2025-09'): UsePennylaneDataReturn => {
  const [kpis, setKpis] = useState<KPIData | null>(null)
  const [resultatComptable, setResultatComptable] = useState<PennylaneResultatComptable[]>([])
  const [tresorerie, setTresorerie] = useState<PennylaneTresorerie[]>([])
  const [incomeStatement, setIncomeStatement] = useState<any | null>(null)
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

      // Charger toutes les données en parallèle
      const [kpisData, resultatData, tresorerieData, trialBalanceData, previousTrialBalanceData] = await Promise.all([
        pennylaneApi.getKPIs(selectedMonth),
        pennylaneApi.getResultatComptable(selectedMonth),
        pennylaneApi.getTresorerie(selectedMonth),
        pennylaneApi.getTrialBalanceData(selectedMonth),
        pennylaneApi.getPreviousMonthData(selectedMonth)
      ])

      // Calculer le compte de résultat avec comparaisons
      const incomeStatementData = pennylaneApi.calculateIncomeStatement(trialBalanceData, previousTrialBalanceData)

      setKpis(kpisData)
      setResultatComptable(resultatData)
      setTresorerie(tresorerieData)
      setIncomeStatement(incomeStatementData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      console.error('Erreur lors du chargement des données Pennylane:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedMonth])

  return {
    kpis,
    resultatComptable,
    tresorerie,
    incomeStatement,
    loading,
    error,
    refetch: fetchData
  }
}
