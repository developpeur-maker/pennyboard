import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getAllDataFromDatabase } from '../services/databaseApi'

// Éclatement de la masse salariale (quand seul le filtre Masse salariale est sélectionné)
interface MasseSalarialeBreakdown {
  salaire_net: number      // 6411
  cotisations: number      // 645..., 646...
  conges_payes: number     // 6412
  avantages_nature: number // 6414, 6417, 6476
  primes_pourboires: number // 6413, 6431
  autres: number
}

interface ChartDataPoint {
  month: string
  monthLabel: string
  revenus_totaux: number | null
  charges: number | null
  charges_salariales: number | null
  charges_fixes: number | null
  charges_fixes_breakdown?: any
  charges_salariales_breakdown?: MasseSalarialeBreakdown
  isProjection?: boolean
}

const Statistics: React.FC = () => {
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month')
  const [monthOffset, setMonthOffset] = useState(0) // Offset pour la pagination (0 = 6 derniers mois)
  
  // États pour les pastilles (séries visibles)
  const [visibleSeries, setVisibleSeries] = useState({
    revenus_totaux: true,
    charges: true,
    charges_salariales: true
  })

  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fonction pour générer tous les mois disponibles depuis 2021
  const generateAllMonths = () => {
    const months: string[] = []
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1
    const startYear = 2021

    for (let year = startYear; year <= currentYear; year++) {
      const maxMonth = year === currentYear ? currentMonth : 12
      for (let month = 1; month <= maxMonth; month++) {
        const monthFormatted = month.toString().padStart(2, '0')
        months.push(`${year}-${monthFormatted}`)
      }
    }

    return months
  }

  // Fonction pour formater les montants en devise
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '0 €'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Comptes exclus de la masse salariale (aligné sur le backend)
  const EXCLUDED_FROM_MASSE_SALARIALE = ['646', '646001', '64114', '64115']
  const isExcludedFromMasseSalariale = (accountNumber: string) =>
    EXCLUDED_FROM_MASSE_SALARIALE.some(excluded => accountNumber === excluded || accountNumber.startsWith(excluded + '.') || accountNumber.startsWith(excluded + '-'))

  // Éclater la masse salariale par catégorie à partir du trial balance
  const computeMasseSalarialeBreakdown = (trialBalance: any): MasseSalarialeBreakdown | null => {
    if (!trialBalance?.items?.length) return null
    const items = trialBalance.items as Array<{ number?: string; debits?: string; credits?: string; debit?: string; credit?: string }>
    const breakdown: MasseSalarialeBreakdown = {
      salaire_net: 0,
      cotisations: 0,
      conges_payes: 0,
      avantages_nature: 0,
      primes_pourboires: 0,
      autres: 0
    }
    for (const item of items) {
      const accountNumber = (item.number || '').trim()
      if (!accountNumber.startsWith('64') || isExcludedFromMasseSalariale(accountNumber)) continue
      const debit = parseFloat((item.debits ?? item.debit ?? '0') as string) || 0
      const credit = parseFloat((item.credits ?? item.credit ?? '0') as string) || 0
      const solde = debit - credit
      if (solde <= 0) continue
      const amount = Math.round(solde * 100) / 100
      if (accountNumber.startsWith('6411')) {
        breakdown.salaire_net += amount
      } else if (accountNumber.startsWith('6412')) {
        breakdown.conges_payes += amount
      } else if (accountNumber.startsWith('645') || accountNumber.startsWith('646')) {
        breakdown.cotisations += amount
      } else if (accountNumber.startsWith('6414') || accountNumber.startsWith('6417') || accountNumber.startsWith('6476')) {
        breakdown.avantages_nature += amount
      } else if (accountNumber.startsWith('6413') || accountNumber.startsWith('6431')) {
        breakdown.primes_pourboires += amount
      } else {
        breakdown.autres += amount
      }
    }
    return breakdown
  }

  // Fonction pour calculer les projections des 3 mois suivants
  const calculateProjections = (historicalData: ChartDataPoint[]): ChartDataPoint[] => {
    if (historicalData.length === 0) return []
    
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1
    const currentMonthKey = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`
    
    // Générer les 3 mois suivants
    const projections: ChartDataPoint[] = []
    const monthAbbreviations = [
      'Jan.', 'Fév.', 'Mars', 'Avr.', 'Mai', 'Juin',
      'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'
    ]
    
    for (let i = 1; i <= 3; i++) {
      let targetMonth = currentMonth + i
      let targetYear = currentYear
      
      if (targetMonth > 12) {
        targetMonth -= 12
        targetYear += 1
      }
      
      const monthFormatted = targetMonth.toString().padStart(2, '0')
      const monthKey = `${targetYear}-${monthFormatted}`
      
      // Vérifier que ce mois est dans le futur
      if (monthKey <= currentMonthKey) continue
      
      // Récupérer les 3 derniers mois AVANT le mois en cours (sans compter le mois en cours)
      // Ex: en janvier, pour la projection de février on utilise oct, nov, déc
      const historicalMonths = historicalData
        .filter(d => !d.isProjection && d.month < currentMonthKey)
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, 3)
      
      if (historicalMonths.length === 0) continue
      
      // Calculer la moyenne de chaque catégorie sur les 3 derniers mois
      const validMonths = historicalMonths.filter(d => d.charges_fixes !== null && d.charges_fixes !== undefined)
      if (validMonths.length === 0) continue
      
      const avgChargesFixes = validMonths.reduce((sum, d) => sum + (d.charges_fixes || 0), 0) / validMonths.length
      
      // Calculer le breakdown moyen
      const breakdowns = validMonths
        .filter(d => d.charges_fixes_breakdown)
        .map(d => d.charges_fixes_breakdown)
      
      const avgBreakdown = breakdowns.length > 0 ? {
        essence_peage_parking: breakdowns.reduce((sum, b) => sum + (b.essence_peage_parking || 0), 0) / breakdowns.length,
        leasings: breakdowns.reduce((sum, b) => sum + (b.leasings || 0), 0) / breakdowns.length,
        locations_logiciels_loyers: breakdowns.reduce((sum, b) => sum + (b.locations_logiciels_loyers || 0), 0) / breakdowns.length,
        assurances: breakdowns.reduce((sum, b) => sum + (b.assurances || 0), 0) / breakdowns.length,
        salaires_cotisations: breakdowns.reduce((sum, b) => sum + (b.salaires_cotisations || 0), 0) / breakdowns.length,
        honoraires_divers: breakdowns.reduce((sum, b) => sum + (b.honoraires_divers || 0), 0) / breakdowns.length,
        telephone_internet: breakdowns.reduce((sum, b) => sum + (b.telephone_internet || 0), 0) / breakdowns.length
      } : null
      
      projections.push({
        month: monthKey,
        monthLabel: `${monthAbbreviations[targetMonth - 1]} ${targetYear}`,
        revenus_totaux: null, // Pas de projection pour les revenus
        charges: null, // Pas de projection pour les charges totales
        charges_salariales: null, // Pas de projection pour la masse salariale
        charges_fixes: Math.round(avgChargesFixes * 100) / 100,
        charges_fixes_breakdown: avgBreakdown,
        isProjection: true
      })
    }
    
    return projections
  }

  // Fonction pour récupérer les données cumulées d'une année
  const fetchYearData = async (year: string): Promise<{
    year: string
    revenus_totaux: number | null
    charges: number | null
    charges_salariales: number | null
    charges_fixes: number | null
  } | null> => {
    try {
      const monthsToFetch: string[] = []
      for (let month = 1; month <= 12; month++) {
        const monthFormatted = month.toString().padStart(2, '0')
        monthsToFetch.push(`${year}-${monthFormatted}`)
      }

      // Récupérer les données de tous les mois de l'année
      const dataPromises = monthsToFetch.map(async (month) => {
        const response = await getAllDataFromDatabase(month)
        if (response.success && response.data) {
          return response.data
        }
        return null
      })

      const results = await Promise.all(dataPromises)
      const validResults = results.filter(r => r !== null)

      if (validResults.length === 0) {
        return null
      }

      // Calculer les totaux cumulés pour l'année
      let totalRevenus = 0
      let totalCharges = 0
      let totalChargesSalariales = 0
      let totalChargesFixes = 0

      validResults.forEach((data: any) => {
        const kpis = data.kpis || {}
        totalRevenus += kpis.revenus_totaux || 0
        totalCharges += kpis.charges || 0
        totalChargesSalariales += kpis.charges_salariales || 0
        totalChargesFixes += kpis.charges_fixes || 0
      })

      return {
        year,
        revenus_totaux: totalRevenus || null,
        charges: totalCharges || null,
        charges_salariales: totalChargesSalariales || null,
        charges_fixes: totalChargesFixes || null
      }
    } catch (err) {
      console.error(`❌ Erreur lors de la récupération des données pour l'année ${year}:`, err)
      return null
    }
  }

  // Fonction pour récupérer les données historiques
  const fetchHistoricalData = async () => {
    setLoading(true)
    setError(null)

    try {
      let chartDataPoints: ChartDataPoint[] = []

      if (viewMode === 'year') {
        // Mode année : afficher toutes les années disponibles (2021 → année actuelle)
        const currentDate = new Date()
        const currentYear = currentDate.getFullYear()
        const startYear = 2021
        
        // Récupérer les données de toutes les années
        const yearPromises = []
        for (let year = startYear; year <= currentYear; year++) {
          yearPromises.push(fetchYearData(year.toString()))
        }
        
        const yearResults = await Promise.all(yearPromises)
        chartDataPoints = yearResults
          .filter(r => r !== null)
          .map((result) => ({
            month: result!.year,
            monthLabel: result!.year,
            revenus_totaux: result!.revenus_totaux,
            charges: result!.charges,
            charges_salariales: result!.charges_salariales,
            charges_fixes: result!.charges_fixes
          }))
      } else {
        // Mode mois : récupérer tous les mois disponibles
        const allMonths = generateAllMonths()
        
        // Récupérer les données de tous les mois en parallèle
        const dataPromises = allMonths.map(async (month) => {
          const response = await getAllDataFromDatabase(month)
          if (response.success && response.data) {
            return {
              month,
              data: response.data
            }
          }
          return null
        })

        const results = await Promise.all(dataPromises)
        const validResults = results.filter(r => r !== null) as Array<{ month: string; data: any }>

        // Transformer les données pour le graphique
        const monthAbbreviations = [
          'Jan.', 'Fév.', 'Mars', 'Avr.', 'Mai', 'Juin',
          'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'
        ]

        chartDataPoints = validResults
          .sort((a, b) => a.month.localeCompare(b.month))
          .map((result) => {
            const [year, month] = result.month.split('-')
            const monthIndex = parseInt(month) - 1
            const kpis = result.data.kpis || {}
            const trialBalance = result.data.trial_balance
            const charges_salariales_breakdown = trialBalance ? computeMasseSalarialeBreakdown(trialBalance) : null

            return {
              month: result.month,
              monthLabel: `${monthAbbreviations[monthIndex]} ${year}`,
              revenus_totaux: kpis.revenus_totaux || null,
              charges: kpis.charges || null,
              charges_salariales: kpis.charges_salariales || null,
              charges_fixes: kpis.charges_fixes || null,
              charges_fixes_breakdown: kpis.charges_fixes_breakdown || null,
              charges_salariales_breakdown: charges_salariales_breakdown || undefined
            }
          })
      }

      // Calculer les projections des 3 mois suivants si on est en mode mois
      if (viewMode === 'month') {
        const projections = calculateProjections(chartDataPoints)
        chartDataPoints = [...chartDataPoints, ...projections]
      }

      setChartData(chartDataPoints)
    } catch (err) {
      console.error('❌ Erreur lors de la récupération des données:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // Charger les données au montage et quand le mode de vue change
  useEffect(() => {
    fetchHistoricalData()
  }, [viewMode])

  // Réinitialiser l'offset quand on change de mode
  useEffect(() => {
    setMonthOffset(0)
  }, [viewMode])

  // Fonction pour basculer la visibilité d'une série
  const toggleSeries = (seriesKey: keyof typeof visibleSeries) => {
    setVisibleSeries(prev => ({
      ...prev,
      [seriesKey]: !prev[seriesKey]
    }))
  }

  // Fonction pour obtenir les données à afficher (pagination pour le mode mois)
  const getDisplayedData = () => {
    if (viewMode === 'year') {
      return chartData
    } else {
      // Mode mois : afficher 6 mois à la fois selon l'offset
      const startIndex = Math.max(0, chartData.length - 6 - monthOffset)
      const endIndex = startIndex + 6
      return chartData.slice(startIndex, endIndex)
    }
  }

  // Fonction pour vérifier si on peut naviguer vers la gauche (mois plus récents)
  const canNavigateLeft = () => {
    if (viewMode === 'year') return false
    return monthOffset < chartData.length - 6
  }

  // Fonction pour vérifier si on peut naviguer vers la droite (mois plus anciens)
  const canNavigateRight = () => {
    if (viewMode === 'year') return false
    return monthOffset > 0
  }

  // Fonction pour formater la période affichée
  const formatPeriod = () => {
    if (viewMode === 'year') {
      return 'Toutes les années'
    } else {
      const displayed = getDisplayedData()
      if (displayed.length === 0) return 'Aucune donnée'
      const firstMonth = displayed[0].monthLabel
      const lastMonth = displayed[displayed.length - 1].monthLabel
      return `${firstMonth} - ${lastMonth}`
    }
  }

  // Préparer les données pour le graphique (filtrer les séries non visibles)
  const getChartData = () => {
    const displayedData = getDisplayedData()
    const onlyChargesSelected = visibleSeries.charges && !visibleSeries.charges_salariales && !visibleSeries.revenus_totaux
    const onlyMasseSalarialeSelected = visibleSeries.charges_salariales && !visibleSeries.charges && !visibleSeries.revenus_totaux
    
    return displayedData.map(point => {
      const filteredPoint: any = {
        monthLabel: point.monthLabel,
        isProjection: point.isProjection || false
      }
      
      if (visibleSeries.revenus_totaux && point.revenus_totaux !== null) {
        filteredPoint.revenus_totaux = point.revenus_totaux
      }
      
      // Logique pour les charges : 
      // - charges = le TOTAL des charges (barre complète = 428k€ par exemple)
      // - charges_salariales = partie hachurée orange (incluse dans charges, ex: 200k€)
      // - charges_fixes = partie hachurée violette (incluse dans charges, peut chevaucher avec masse salariale, ex: 300k€)
      // IMPORTANT: Les charges fixes et masse salariale sont des PARTIES des charges, pas des additions
      // Le total de la barre doit TOUJOURS être égal aux charges totales
      
      // Stocker le total original pour le tooltip
      if (point.charges !== null) {
        filteredPoint.charges_total = point.charges
      }
      
      // Cas des mois projetés : on n'a que charges_fixes, on affiche une barre = projection des charges fixes
      if (point.isProjection && point.charges_fixes != null && visibleSeries.charges) {
        filteredPoint.charges_total = point.charges_fixes
        filteredPoint.charges = 0
        filteredPoint.charges_fixes_display = point.charges_fixes
        filteredPoint.charges_fixes_breakdown = point.charges_fixes_breakdown
      } else if (visibleSeries.charges && point.charges !== null) {
        const totalCharges = point.charges
        const chargesSalariales = point.charges_salariales || 0
        const chargesFixes = point.charges_fixes || 0
        
        // Les charges fixes incluent TOUS les comptes 64..., donc elles incluent la masse salariale
        // On doit calculer la partie des charges fixes qui n'est PAS dans la masse salariale
        // charges_fixes_hors_masse = charges_fixes - charges_salariales (si charges_fixes > charges_salariales)
        const chargesFixesHorsMasse = Math.max(0, chargesFixes - chargesSalariales)
        
        if (onlyChargesSelected) {
          // Si seul "Achats et charges" est sélectionné, le hachuré violet = charges fixes
          // Base = charges totales - charges fixes
          filteredPoint.charges = Math.max(0, totalCharges - chargesFixes)
          filteredPoint.charges_fixes_display = chargesFixes
          filteredPoint.charges_fixes_breakdown = point.charges_fixes_breakdown
        } else if (visibleSeries.charges_salariales && chargesSalariales > 0) {
          // Si masse salariale ET charges fixes sont visibles
          // Base = charges totales - masse salariale - charges fixes hors masse
          filteredPoint.charges = Math.max(0, totalCharges - chargesSalariales - chargesFixesHorsMasse)
          // Les charges fixes affichées = la partie qui n'est pas dans la masse salariale
          filteredPoint.charges_fixes_display = chargesFixesHorsMasse
          filteredPoint.charges_fixes_breakdown = point.charges_fixes_breakdown
        } else {
          // Si seulement les charges sont visibles (sans masse salariale ni charges fixes visibles)
          filteredPoint.charges = totalCharges
        }
      }
      
      // Masse salariale : si seul filtre "Masse salariale" et breakdown dispo → éclater en catégories
      if (visibleSeries.charges_salariales && !point.isProjection) {
        if (onlyMasseSalarialeSelected && point.charges_salariales_breakdown) {
          const b = point.charges_salariales_breakdown
          if (b.salaire_net > 0) filteredPoint.salaire_net = b.salaire_net
          if (b.cotisations > 0) filteredPoint.cotisations = b.cotisations
          if (b.conges_payes > 0) filteredPoint.conges_payes = b.conges_payes
          if (b.avantages_nature > 0) filteredPoint.avantages_nature = b.avantages_nature
          if (b.primes_pourboires > 0) filteredPoint.primes_pourboires = b.primes_pourboires
          if (b.autres > 0) filteredPoint.autres = b.autres
        } else if (point.charges_salariales !== null) {
          filteredPoint.charges_salariales = point.charges_salariales
        }
      }
      
      return filteredPoint
    })
  }

  // Couleurs pour chaque série
  const seriesColors = {
    revenus_totaux: '#10b981', // green
    charges: '#ef4444', // red
    charges_salariales: '#f97316', // orange
    charges_fixes: '#9333ea' // purple
  }
  
  const onlyChargesSelected = visibleSeries.charges && !visibleSeries.charges_salariales && !visibleSeries.revenus_totaux
  const onlyMasseSalarialeSelected = visibleSeries.charges_salariales && !visibleSeries.charges && !visibleSeries.revenus_totaux
  const hasMasseSalarialeBreakdown = onlyMasseSalarialeSelected && getChartData().some(p => (p.salaire_net ?? 0) > 0 || (p.cotisations ?? 0) > 0 || (p.conges_payes ?? 0) > 0 || (p.avantages_nature ?? 0) > 0 || (p.primes_pourboires ?? 0) > 0 || (p.autres ?? 0) > 0)

  // Couleurs pour l'éclatement masse salariale
  const masseSalarialeBreakdownColors = {
    salaire_net: '#22c55e',
    cotisations: '#3b82f6',
    conges_payes: '#8b5cf6',
    avantages_nature: '#f59e0b',
    primes_pourboires: '#ec4899',
    autres: '#64748b'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold font-poppins text-gray-900">
                Statistiques
              </h1>
              <p className="text-gray-600 font-inter mt-2 text-lg">
                Évolution des KPIs sur la période sélectionnée
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Toggle entre vue année et vue mensuelle */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => {
                    setViewMode('year')
                    setMonthOffset(0)
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'year'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Année
                </button>
                <button
                  onClick={() => {
                    setViewMode('month')
                    setMonthOffset(0)
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'month'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Mois
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pastilles pour afficher/masquer les séries */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Séries à afficher - {formatPeriod()}
          </h2>
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={() => toggleSeries('revenus_totaux')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                visibleSeries.revenus_totaux
                  ? 'bg-green-100 text-green-800 ring-2 ring-green-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Revenus totaux
            </button>
            <button
              onClick={() => toggleSeries('charges')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                visibleSeries.charges
                  ? 'bg-red-100 text-red-800 ring-2 ring-red-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Achats et charges
            </button>
            <button
              onClick={() => toggleSeries('charges_salariales')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                visibleSeries.charges_salariales
                  ? 'bg-orange-100 text-orange-800 ring-2 ring-orange-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Masse salariale
            </button>
          </div>
        </div>

        {/* Graphique */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Navigation avec flèches (uniquement en mode mois) */}
          {viewMode === 'month' && chartData.length > 6 && (
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => {
                  if (canNavigateLeft()) {
                    setMonthOffset(prev => Math.min(prev + 1, chartData.length - 6))
                  }
                }}
                disabled={!canNavigateLeft()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  canNavigateLeft()
                    ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Précédent
              </button>
              <span className="text-sm text-gray-600 font-medium">
                {formatPeriod()}
              </span>
              <button
                onClick={() => {
                  if (canNavigateRight()) {
                    setMonthOffset(prev => Math.max(prev - 1, 0))
                  }
                }}
                disabled={!canNavigateRight()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  canNavigateRight()
                    ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement des données...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-red-600 text-lg font-semibold mb-2">Erreur</p>
                <p className="text-gray-600">{error}</p>
              </div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <p className="text-gray-600 text-lg">Aucune donnée disponible pour cette période</p>
            </div>
          ) : (
            <div className="relative w-full" style={{ height: '500px' }}>
              <div key={monthOffset} className="transition-opacity duration-300 ease-in-out">
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart data={getChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="monthLabel" 
                        angle={0}
                        textAnchor="middle"
                        height={40}
                        tick={{ fontSize: 12, fontWeight: 'bold' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fontWeight: 'bold' }}
                        tickFormatter={(value) => {
                          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M€`
                          if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`
                          return `${value}€`
                        }}
                      />
                      <defs>
                        <pattern id="hatchPattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                          <path d="M 0,8 l 8,-8 M -2,2 l 4,-4 M 6,10 l 4,-4" stroke={seriesColors.charges_salariales} strokeWidth="1.5" />
                        </pattern>
                        <pattern id="hatchPatternFixed" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                          <path d="M 0,8 l 8,-8 M -2,2 l 4,-4 M 6,10 l 4,-4" stroke={onlyChargesSelected ? seriesColors.charges_fixes : seriesColors.charges_fixes} strokeWidth="1.5" />
                        </pattern>
                      </defs>
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload || !payload.length) return null
                          // Retirer la ligne "Charges fixes" / "Charges fixes (incluse...)" du tooltip (déjà dans "Achats et charges")
                          const filteredPayload = payload.filter(
                            (entry: any) => entry.name !== 'Charges fixes' && entry.name !== 'Charges fixes (incluse dans les charges)'
                          )
                          if (filteredPayload.length === 0) return null
                          const point = getChartData().find(p => p.monthLabel === label)
                          const labelDisplay = point?.isProjection ? `${label} (projection)` : label
                          return (
                            <div
                              className="bg-white border border-gray-200 rounded-lg shadow-lg p-3"
                              style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px' }}
                            >
                              <p className="font-semibold text-gray-900 mb-2">{labelDisplay}</p>
                              {filteredPayload.map((entry: any) => {
                                let displayValue: string
                                if (entry.name === 'Achats et charges') {
                                  const totalCharges = entry.payload.charges_total ||
                                    ((entry.payload.charges || 0) + (entry.payload.charges_salariales || 0) + (entry.payload.charges_fixes_display || 0))
                                  const originalPoint = chartData.find((p: ChartDataPoint) => p.monthLabel === entry.payload.monthLabel)
                                  const chargesFixes = originalPoint?.charges_fixes ?? entry.payload.charges_fixes_display ?? 0
                                  if (chargesFixes > 0) {
                                    displayValue = `${formatCurrency(totalCharges)} (dont ${formatCurrency(chargesFixes)} de charges fixes)`
                                  } else {
                                    displayValue = formatCurrency(totalCharges)
                                  }
                                } else {
                                  displayValue = formatCurrency(entry.value)
                                }
                                return (
                                  <p key={entry.dataKey} style={{ color: entry.color, margin: '2px 0' }}>
                                    {entry.name} : {displayValue}
                                  </p>
                                )
                              })}
                            </div>
                          )
                        }}
                      />
                      <Legend />
                      {visibleSeries.revenus_totaux && (
                        <Bar 
                          dataKey="revenus_totaux" 
                          fill={seriesColors.revenus_totaux}
                          name="Revenus totaux"
                        />
                      )}
                      {visibleSeries.charges && (
                        <Bar 
                          dataKey="charges" 
                          fill={seriesColors.charges}
                          name="Achats et charges"
                          stackId="charges"
                        />
                      )}
                      {/* Masse salariale : éclatée en catégories si seul filtre sélectionné */}
                      {visibleSeries.charges_salariales && hasMasseSalarialeBreakdown && (
                        <>
                          <Bar dataKey="salaire_net" fill={masseSalarialeBreakdownColors.salaire_net} name="Salaire net (6411)" stackId="masse_salariale" />
                          <Bar dataKey="cotisations" fill={masseSalarialeBreakdownColors.cotisations} name="Cotisations (645..., 646...)" stackId="masse_salariale" />
                          <Bar dataKey="conges_payes" fill={masseSalarialeBreakdownColors.conges_payes} name="Congés payés (6412)" stackId="masse_salariale" />
                          <Bar dataKey="avantages_nature" fill={masseSalarialeBreakdownColors.avantages_nature} name="Avantages en nature (6414, 6417, 6476)" stackId="masse_salariale" />
                          <Bar dataKey="primes_pourboires" fill={masseSalarialeBreakdownColors.primes_pourboires} name="Primes et pourboires (6413, 6431)" stackId="masse_salariale" />
                          <Bar dataKey="autres" fill={masseSalarialeBreakdownColors.autres} name="Autres" stackId="masse_salariale" />
                        </>
                      )}
                      {visibleSeries.charges_salariales && !hasMasseSalarialeBreakdown && (
                        <Bar 
                          dataKey="charges_salariales" 
                          fill="url(#hatchPattern)"
                          name="Masse salariale (incluse dans les charges)"
                          stackId="charges"
                        />
                      )}
                      {/* Charges fixes : affichées en hachuré violet */}
                      {visibleSeries.charges && getChartData().some(p => p.charges_fixes_display !== undefined && p.charges_fixes_display > 0) && (
                        <Bar 
                          dataKey="charges_fixes_display"
                          fill="url(#hatchPatternFixed)"
                          name={onlyChargesSelected ? "Charges fixes" : "Charges fixes (incluse dans les charges)"}
                          stackId="charges"
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Statistics
