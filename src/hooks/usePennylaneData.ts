import { useState, useEffect } from 'react'
import { PennylaneResultatComptable, PennylaneTresorerie } from '../services/pennylaneApi'
import { 
  getBreakdownsFromDatabase,
  getAllDataFromDatabase
} from '../services/databaseApi'

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
  resultatComptable: PennylaneResultatComptable[]
  tresorerie: PennylaneTresorerie[]
  incomeStatement: any | null
  fiscalYears: Array<{id: string, name: string, start_date: string, end_date: string}>
  chargesBreakdown: Array<{code: string, label: string, description: string, amount: number}>
  revenusBreakdown: Array<{code: string, label: string, description: string, amount: number}>
  tresorerieBreakdown: Array<{code: string, label: string, description: string, amount: number}>
  lastSyncDate: string | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// Fonction pour obtenir le mois actuel au format YYYY-MM
const getCurrentMonth = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  return `${year}-${month}`
}

export const usePennylaneData = (
  selectedMonth: string = getCurrentMonth(), 
  selectedFiscalYear?: string,
  viewMode: 'month' | 'year' = 'month',
  selectedYear: string = new Date().getFullYear().toString()
): UsePennylaneDataReturn => {
  const [kpis, setKpis] = useState<KPIData | null>(null)
  const [resultatComptable] = useState<PennylaneResultatComptable[]>([])
  const [tresorerie] = useState<PennylaneTresorerie[]>([])
  const [incomeStatement] = useState<any | null>(null)
  const [fiscalYears] = useState<Array<{id: string, name: string, start_date: string, end_date: string}>>([])
  const [chargesBreakdown, setChargesBreakdown] = useState<Array<{code: string, label: string, description: string, amount: number}>>([])
  const [revenusBreakdown, setRevenusBreakdown] = useState<Array<{code: string, label: string, description: string, amount: number}>>([])
  const [tresorerieBreakdown, setTresorerieBreakdown] = useState<Array<{code: string, label: string, description: string, amount: number}>>([])
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔄 Chargement des données...')

      // Essayer d'abord la base de données
      console.log('📊 Tentative de récupération depuis la base de données...')
      const dbResponse = await getAllDataFromDatabase(selectedMonth)
      
      if (dbResponse.success && dbResponse.data) {
        console.log('✅ Données récupérées depuis la base de données')
        
        // Utiliser les données de la base (elles sont déjà synchronisées)
        await processDatabaseData(dbResponse.data)
        return
      }
      
      // Pas de fallback - afficher "Aucune donnée"
      console.log('⚠️ Aucune donnée disponible dans la base de données')
      setKpis({
        ventes_706: null,
        chiffre_affaires: null,
        total_produits_exploitation: null,
        charges: null,
        resultat_net: null,
        solde_tresorerie: null,
        growth: null,
        hasData: false,
        rentabilite: null,
        ventes_growth: null,
        ca_growth: null,
        total_produits_growth: null,
        charges_growth: null,
        resultat_growth: null,
        tresorerie_growth: null
      })
      setChargesBreakdown([])
      setRevenusBreakdown([])
      setTresorerieBreakdown([])
      setLastSyncDate(null)

    } catch (error) {
      console.error('❌ Erreur lors du chargement des données:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // Traiter les données de la base de données
  const processDatabaseData = async (data: any) => {
    try {
      // Récupérer les breakdowns depuis la base
      const breakdownResponse = await getBreakdownsFromDatabase(selectedMonth)
      
      if (breakdownResponse.success && breakdownResponse.data) {
        setChargesBreakdown(convertBreakdownToArray(breakdownResponse.data.charges_breakdown))
        setRevenusBreakdown(convertBreakdownToArray(breakdownResponse.data.revenus_breakdown))
        setTresorerieBreakdown(convertTresorerieBreakdownToArray(breakdownResponse.data.tresorerie_breakdown))
      }

      // Récupérer la date de dernière synchronisation
      if (data.updated_at) {
        setLastSyncDate(data.updated_at)
        console.log('📅 Dernière synchronisation:', data.updated_at)
      }

      // Traiter les KPIs
      const kpisData = data.kpis || {}
      const processedKpis: KPIData = {
        ventes_706: kpisData.ventes_706 || 0,
        chiffre_affaires: kpisData.chiffre_affaires || 0,
        total_produits_exploitation: kpisData.chiffre_affaires || 0,
        charges: kpisData.charges || 0,
        resultat_net: kpisData.resultat_net || 0,
        solde_tresorerie: kpisData.tresorerie || 0,
        growth: 0, // À calculer si nécessaire
        hasData: true,
        rentabilite: kpisData.resultat_net && kpisData.chiffre_affaires ? {
          ratio: (kpisData.resultat_net / kpisData.chiffre_affaires) * 100,
          message: 'Rentabilité calculée',
          montant: kpisData.resultat_net
        } : null,
        ventes_growth: 0,
        ca_growth: 0,
        total_produits_growth: 0,
        charges_growth: 0,
        resultat_growth: 0,
        tresorerie_growth: 0
      }

      setKpis(processedKpis)
      console.log('✅ Données de la base de données traitées avec succès')
      
    } catch (error) {
      console.error('❌ Erreur lors du traitement des données de la base:', error)
      throw error
    }
  }


  // Convertir les breakdowns en format array
  const convertBreakdownToArray = (breakdown: any): Array<{code: string, label: string, description: string, amount: number}> => {
    const result: Array<{code: string, label: string, description: string, amount: number}> = []
    
    Object.entries(breakdown).forEach(([code, data]: [string, any]) => {
      if (data && typeof data === 'object' && data.total > 0) {
        result.push({
          code,
          label: `${code} - ${getClassDescription(code)}`,
          description: getClassDescription(code),
          amount: data.total
        })
      }
    })
    
    return result.sort((a, b) => b.amount - a.amount)
  }

  // Convertir les breakdowns de trésorerie en format array
  const convertTresorerieBreakdownToArray = (breakdown: any): Array<{code: string, label: string, description: string, amount: number}> => {
    const result: Array<{code: string, label: string, description: string, amount: number}> = []
    
    Object.entries(breakdown).forEach(([code, data]: [string, any]) => {
      if (data && typeof data === 'object' && data.balance !== 0) {
        result.push({
          code,
          label: `${code} - ${data.label || 'Compte bancaire'}`,
          description: data.label || 'Compte bancaire',
          amount: Math.abs(data.balance)
        })
      }
    })
    
    return result.sort((a, b) => b.amount - a.amount)
  }

  // Obtenir la description d'une classe comptable
  const getClassDescription = (code: string): string => {
    const descriptions: { [key: string]: string } = {
      '60': 'Achats',
      '61': 'Services extérieurs',
      '62': 'Autres services extérieurs',
      '63': 'Impôts et taxes',
      '64': 'Charges de personnel',
      '65': 'Autres charges',
      '66': 'Charges financières',
      '67': 'Charges exceptionnelles',
      '68': 'Dotations aux amortissements',
      '69': 'Participation des salariés',
      '70': 'Ventes',
      '71': 'Production stockée',
      '72': 'Production immobilisée',
      '73': 'Variations de stocks',
      '74': 'Subventions d\'exploitation',
      '75': 'Autres produits de gestion courante',
      '76': 'Produits financiers',
      '77': 'Produits exceptionnels',
      '78': 'Reprises sur amortissements',
      '79': 'Transferts de charges'
    }
    
    return descriptions[code] || 'Classe comptable'
  }

  useEffect(() => {
    fetchData()
  }, [selectedMonth, selectedFiscalYear, viewMode, selectedYear])

  return {
    kpis,
    resultatComptable,
    tresorerie,
    incomeStatement,
    fiscalYears,
    chargesBreakdown,
    revenusBreakdown,
    tresorerieBreakdown,
    lastSyncDate,
    loading,
    error,
    refetch: fetchData
  }
}
