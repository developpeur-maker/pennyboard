import { useState, useEffect } from 'react'
import pennylaneApi, { PennylaneResultatComptable, PennylaneTresorerie } from '../services/pennylaneApi'

interface KPIData {
  chiffre_affaires: number | null
  charges: number | null
  resultat_net: number | null
  solde_tresorerie: number | null
  encaissements: number | null
  decaissements: number | null
  growth: number | null
  hasData: boolean
}

interface UsePennylaneDataReturn {
  kpis: KPIData | null
  resultatComptable: PennylaneResultatComptable[]
  tresorerie: PennylaneTresorerie[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export const usePennylaneData = (): UsePennylaneDataReturn => {
  const [kpis, setKpis] = useState<KPIData | null>(null)
  const [resultatComptable, setResultatComptable] = useState<PennylaneResultatComptable[]>([])
  const [tresorerie, setTresorerie] = useState<PennylaneTresorerie[]>([])
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
      const [kpisData, resultatData, tresorerieData] = await Promise.all([
        pennylaneApi.getKPIs(),
        pennylaneApi.getResultatComptable(),
        pennylaneApi.getTresorerie()
      ])

      setKpis(kpisData)
      setResultatComptable(resultatData)
      setTresorerie(tresorerieData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      console.error('Erreur lors du chargement des données Pennylane:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return {
    kpis,
    resultatComptable,
    tresorerie,
    loading,
    error,
    refetch: fetchData
  }
}
