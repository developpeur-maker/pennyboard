import { useState, useEffect } from 'react'
import { PennylaneResultatComptable, PennylaneTresorerie } from '../services/pennylaneApi'
import { 
  getAllDataFromDatabase
} from '../services/databaseApi'

interface KPIData {
  ventes_706: number | null // VRAIES VENTES (compte 706 uniquement)
  chiffre_affaires: number | null // CA Net (comptes 701-708 moins 709)
  total_produits_exploitation: number | null // Total des produits d'exploitation (tous les comptes 7)
  charges: number | null
  charges_salariales: number | null // Charges salariales (comptes 64x)
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
  chargesSalarialesBreakdown: Array<{code: string, label: string, description: string, amount: number}>
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
  const [chargesSalarialesBreakdown, setChargesSalarialesBreakdown] = useState<Array<{code: string, label: string, description: string, amount: number}>>([])
  const [revenusBreakdown, setRevenusBreakdown] = useState<Array<{code: string, label: string, description: string, amount: number}>>([])
  const [tresorerieBreakdown, setTresorerieBreakdown] = useState<Array<{code: string, label: string, description: string, amount: number}>>([])
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔄 Chargement des données...', { viewMode, selectedMonth, selectedYear })

      if (viewMode === 'year') {
        // Mode "Année" : récupérer toutes les données de l'année et les cumuler
        console.log('📊 Mode Année : récupération des données cumulées pour', selectedYear)
        await fetchYearData(selectedYear)
      } else {
        // Mode "Mois" : récupérer les données du mois sélectionné
        console.log('📊 Mode Mois : récupération des données pour', selectedMonth)
        await fetchMonthData(selectedMonth)
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
      setKpis(null)
      setChargesBreakdown([])
      setChargesSalarialesBreakdown([])
      setRevenusBreakdown([])
      setTresorerieBreakdown([])
      setLastSyncDate(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchMonthData = async (month: string) => {
    try {
      // Essayer d'abord la base de données
      console.log('📊 Tentative de récupération depuis la base de données...')
      const dbResponse = await getAllDataFromDatabase(month)
      
      console.log('🔍 Réponse de la base de données:', {
        success: dbResponse.success,
        hasData: !!dbResponse.data,
        error: dbResponse.error
      })
      
      if (dbResponse.success && dbResponse.data) {
        console.log('✅ Données récupérées depuis la base de données')
        console.log('📊 Données reçues:', {
          month: dbResponse.data.month,
          hasKpis: !!dbResponse.data.kpis,
          kpis: dbResponse.data.kpis
        })
        
        // Utiliser les données de la base (elles sont déjà synchronisées)
        await processDatabaseData(dbResponse.data)
        return
      }
      
      // Pas de fallback - afficher "Aucune donnée"
      console.log('⚠️ Aucune donnée disponible dans la base de données')
      console.log('🔍 Raison:', dbResponse.error || 'Données non trouvées')
      setKpis({
        ventes_706: null,
        chiffre_affaires: null,
        total_produits_exploitation: null,
        charges: null,
        charges_salariales: null,
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
      setChargesSalarialesBreakdown([])
      setRevenusBreakdown([])
      setTresorerieBreakdown([])
      setLastSyncDate(null)

    } catch (error) {
      console.error('❌ Erreur lors du chargement des données du mois:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    }
  }

  const fetchYearData = async (year: string) => {
    try {
      console.log('📊 Récupération des données annuelles pour', year)
      
      // Générer tous les mois de l'année (janvier à décembre)
      const yearMonths = []
      for (let month = 1; month <= 12; month++) {
        const monthFormatted = month.toString().padStart(2, '0')
        yearMonths.push(`${year}-${monthFormatted}`)
      }
      
      console.log('📅 Mois à récupérer:', yearMonths)
      
      // Récupérer les données de tous les mois en parallèle (beaucoup plus rapide !)
      console.log('🚀 Lancement des requêtes parallèles...')
      const monthPromises = yearMonths.map(async (month) => {
        try {
          const monthData = await getAllDataFromDatabase(month)
          if (monthData.success && monthData.data) {
            console.log(`✅ Données récupérées pour ${month}`)
            return monthData.data
          } else {
            console.log(`⚠️ Aucune donnée pour ${month}`)
            return null
          }
        } catch (monthError) {
          console.log(`❌ Erreur pour ${month}:`, monthError)
          return null
        }
      })
      
      // Attendre toutes les requêtes en parallèle
      const monthResults = await Promise.all(monthPromises)
      
      // Filtrer les résultats valides et trouver la dernière date de sync
      const yearData = monthResults.filter(data => data !== null)
      let lastSyncDate: string | null = null
      
      yearData.forEach(data => {
        if (!lastSyncDate || data.updated_at > lastSyncDate) {
          lastSyncDate = data.updated_at
        }
      })
      
      if (yearData.length > 0) {
        console.log('✅ Données annuelles récupérées:', yearData.length, 'mois sur 12')
        
        // Cumuler les KPIs de tous les mois
        const cumulativeKpis = calculateCumulativeKPIs(yearData)
        const cumulativeBreakdowns = calculateCumulativeBreakdowns(yearData)
        
        // Traiter les données cumulées
        await processCumulativeData(cumulativeKpis, cumulativeBreakdowns, lastSyncDate || new Date().toISOString())
      } else {
        console.log('⚠️ Aucune donnée disponible pour l\'année', year)
        setKpis({
          ventes_706: null,
          chiffre_affaires: null,
          total_produits_exploitation: null,
          charges: null,
          charges_salariales: null,
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
        setChargesSalarialesBreakdown([])
        setRevenusBreakdown([])
        setTresorerieBreakdown([])
        setLastSyncDate(null)
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données annuelles:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    }
  }

  // Traiter les données de la base de données
  const processDatabaseData = async (data: any) => {
    try {
      console.log('🔄 Traitement des données de la base de données...')
      console.log('🔍 Toutes les données reçues:', data)
      console.log('🔍 charges_salariales_breakdown existe?', !!data.charges_salariales_breakdown)
      console.log('🔍 charges_salariales_breakdown valeur:', data.charges_salariales_breakdown)
      
      // Utiliser les breakdowns directement depuis les données reçues
      if (data.charges_breakdown) {
        setChargesBreakdown(convertBreakdownToArray(data.charges_breakdown))
      }
      if (data.charges_salariales_breakdown) {
        console.log('🔍 Charges salariales breakdown reçu:', data.charges_salariales_breakdown)
        const chargesSalarialesArray = convertBreakdownToArray(data.charges_salariales_breakdown)
        console.log('🔍 Charges salariales array converti:', chargesSalarialesArray)
        setChargesSalarialesBreakdown(chargesSalarialesArray)
      } else if (data.charges_breakdown) {
        // Solution temporaire : filtrer les comptes 64 depuis les charges
        console.log('⚠️ charges_salariales_breakdown non trouvé, filtrage depuis charges_breakdown')
        const allCharges = convertBreakdownToArray(data.charges_breakdown)
        // Pour la masse salariale : seulement les comptes 64 avec solde positif
        const chargesSalariales = allCharges.filter(item => 
          item.code.startsWith('64') && item.amount > 0
        )
        console.log('🔍 Charges salariales filtrées (positifs uniquement):', chargesSalariales)
        setChargesSalarialesBreakdown(chargesSalariales)
      }
      if (data.revenus_breakdown) {
        setRevenusBreakdown(convertBreakdownToArray(data.revenus_breakdown))
      }
      if (data.tresorerie_breakdown) {
        setTresorerieBreakdown(convertTresorerieBreakdownToArray(data.tresorerie_breakdown))
      }

      // Récupérer la date de dernière synchronisation
      if (data.updated_at) {
        setLastSyncDate(data.updated_at)
        console.log('📅 Dernière synchronisation:', data.updated_at)
      }

      // Traiter les KPIs
      const kpisData = data.kpis || {}
      console.log('📊 KPIs reçus de la base:', kpisData)
      
      const processedKpis: KPIData = {
        ventes_706: kpisData.ventes_706 || 0,
        chiffre_affaires: kpisData.chiffre_affaires || 0,
        total_produits_exploitation: kpisData.revenus_totaux || 0,
        charges: kpisData.charges || 0,
        charges_salariales: kpisData.charges_salariales || 0,
        resultat_net: kpisData.resultat_net || 0,
        solde_tresorerie: kpisData.tresorerie || 0,
        growth: 0, // À calculer si nécessaire
        hasData: true,
        rentabilite: kpisData.resultat_net && kpisData.revenus_totaux ? {
          ratio: Math.round(((kpisData.resultat_net / kpisData.revenus_totaux) * 100) * 100) / 100,
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

      console.log('📊 KPIs traités:', processedKpis)
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
      if (data && typeof data === 'object') {
        // Gérer les deux structures possibles
        const amount = data.amount || data.total || 0
        let label = data.label || `${code} - ${getClassDescription(code)}`
        
        // Utiliser le label tel qu'il est stocké dans la base de données
        
        // Inclure tous les montants (positifs, négatifs et zéro)
        result.push({
          code,
          label: label,
          description: label,
          amount: amount
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

  // Calculer les KPIs cumulés pour une année
  const calculateCumulativeKPIs = (yearData: any[]): KPIData => {
    let cumulativeVentes706 = 0
    let cumulativeChiffreAffaires = 0
    let cumulativeTotalProduits = 0
    let cumulativeCharges = 0
    let cumulativeChargesSalariales = 0
    let cumulativeResultatNet = 0
    let cumulativeTresorerie = 0

    yearData.forEach(monthData => {
      if (monthData.kpis) {
        cumulativeVentes706 += monthData.kpis.ventes_706 || 0
        cumulativeChiffreAffaires += monthData.kpis.chiffre_affaires || 0
        cumulativeTotalProduits += monthData.kpis.revenus_totaux || 0
        cumulativeCharges += monthData.kpis.charges || 0
        cumulativeChargesSalariales += monthData.kpis.charges_salariales || 0
        cumulativeResultatNet += monthData.kpis.resultat_net || 0
        cumulativeTresorerie += monthData.kpis.tresorerie || 0
      }
    })

    // Calculer la rentabilité sur les totaux cumulés
    const rentabilite = cumulativeTotalProduits > 0 ? {
      ratio: Math.round(((cumulativeResultatNet / cumulativeTotalProduits) * 100) * 100) / 100,
      message: 'Rentabilité annuelle',
      montant: cumulativeResultatNet
    } : null

    return {
      ventes_706: cumulativeVentes706,
      chiffre_affaires: cumulativeChiffreAffaires,
      total_produits_exploitation: cumulativeTotalProduits,
      charges: cumulativeCharges,
      charges_salariales: cumulativeChargesSalariales,
      resultat_net: cumulativeResultatNet,
      solde_tresorerie: cumulativeTresorerie,
      growth: null, // Pas de croissance pour les données annuelles
      hasData: true,
      rentabilite,
      ventes_growth: null,
      ca_growth: null,
      total_produits_growth: null,
      charges_growth: null,
      resultat_growth: null,
      tresorerie_growth: null
    }
  }

  // Calculer les breakdowns cumulés pour une année
  const calculateCumulativeBreakdowns = (yearData: any[]) => {
    const cumulativeCharges: { [key: string]: { amount: number, label: string } } = {}
    const cumulativeChargesSalariales: { [key: string]: { amount: number, label: string } } = {}
    const cumulativeRevenus: { [key: string]: { amount: number, label: string } } = {}
    const cumulativeTresorerie: { [key: string]: { balance: number, label: string } } = {}

    yearData.forEach(monthData => {
      // Cumuler les charges
      if (monthData.charges_breakdown) {
        Object.entries(monthData.charges_breakdown).forEach(([code, data]: [string, any]) => {
          if (!cumulativeCharges[code]) {
            cumulativeCharges[code] = { amount: 0, label: data.label || `Compte ${code}` }
          }
          cumulativeCharges[code].amount += data.amount || 0
        })
      }

      // Cumuler les charges salariales
      if (monthData.charges_salariales_breakdown) {
        Object.entries(monthData.charges_salariales_breakdown).forEach(([code, data]: [string, any]) => {
          if (!cumulativeChargesSalariales[code]) {
            cumulativeChargesSalariales[code] = { amount: 0, label: data.label || `Compte ${code}` }
          }
          cumulativeChargesSalariales[code].amount += data.amount || 0
        })
      }

      // Cumuler les revenus
      if (monthData.revenus_breakdown) {
        Object.entries(monthData.revenus_breakdown).forEach(([code, data]: [string, any]) => {
          if (!cumulativeRevenus[code]) {
            cumulativeRevenus[code] = { amount: 0, label: data.label || `Compte ${code}` }
          }
          cumulativeRevenus[code].amount += data.amount || 0
        })
      }

      // Cumuler la trésorerie
      if (monthData.tresorerie_breakdown) {
        Object.entries(monthData.tresorerie_breakdown).forEach(([code, data]: [string, any]) => {
          if (!cumulativeTresorerie[code]) {
            cumulativeTresorerie[code] = { balance: 0, label: data.label || `Compte ${code}` }
          }
          cumulativeTresorerie[code].balance += data.balance || 0
        })
      }
    })

    return {
      charges: cumulativeCharges,
      chargesSalariales: cumulativeChargesSalariales,
      revenus: cumulativeRevenus,
      tresorerie: cumulativeTresorerie
    }
  }

  // Traiter les données cumulées
  const processCumulativeData = async (kpis: KPIData, breakdowns: any, lastSync: string) => {
    setKpis(kpis)
    setChargesBreakdown(convertBreakdownToArray(breakdowns.charges))
    setChargesSalarialesBreakdown(convertBreakdownToArray(breakdowns.chargesSalariales))
    setRevenusBreakdown(convertBreakdownToArray(breakdowns.revenus))
    setTresorerieBreakdown(convertTresorerieBreakdownToArray(breakdowns.tresorerie))
    setLastSyncDate(lastSync)
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
    chargesSalarialesBreakdown,
    revenusBreakdown,
    tresorerieBreakdown,
    lastSyncDate,
    loading,
    error,
    refetch: fetchData
  }
}
