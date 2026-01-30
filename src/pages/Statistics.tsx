import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getAllDataFromDatabase } from '../services/databaseApi'

interface ChartDataPoint {
  month: string
  monthLabel: string
  revenus_totaux: number | null
  charges: number | null
  charges_salariales: number | null
  charges_fixes: number | null
  charges_fixes_breakdown?: any
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
  const [showProjections, setShowProjections] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

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
      
      // Récupérer les 12 mois précédents (mois réels uniquement, pas de projections)
      const historicalMonths = historicalData
        .filter(d => !d.isProjection && d.month < monthKey)
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, 12)
      
      if (historicalMonths.length === 0) continue
      
      // Calculer la moyenne de chaque catégorie
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

            return {
              month: result.month,
              monthLabel: `${monthAbbreviations[monthIndex]} ${year}`,
              revenus_totaux: kpis.revenus_totaux || null,
              charges: kpis.charges || null,
              charges_salariales: kpis.charges_salariales || null,
              charges_fixes: kpis.charges_fixes || null,
              charges_fixes_breakdown: kpis.charges_fixes_breakdown || null
            }
          })
      }

      // Calculer les projections des 3 mois suivants si on est en mode mois
      // (on le fait après avoir récupéré toutes les données historiques)
      // Note: les projections seront ajoutées dans un useEffect séparé

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
  
  // Ajouter les projections quand showProjections change
  useEffect(() => {
    if (viewMode === 'month' && chartData.length > 0) {
      const historicalData = chartData.filter(d => !d.isProjection)
      if (showProjections) {
        const projections = calculateProjections(historicalData)
        setChartData([...historicalData, ...projections])
      } else {
        setChartData(historicalData)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showProjections])

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
    
    return displayedData.map(point => {
      const filteredPoint: any = {
        monthLabel: point.monthLabel,
        isProjection: point.isProjection || false
      }
      
      if (visibleSeries.revenus_totaux && point.revenus_totaux !== null) {
        filteredPoint.revenus_totaux = point.revenus_totaux
      }
      
      // Pour les charges : si la masse salariale est visible, on affiche les charges sans masse salariale
      // comme base, puis on empile la masse salariale par-dessus pour que la barre totale = charges
      if (visibleSeries.charges && point.charges !== null) {
        if (visibleSeries.charges_salariales && point.charges_salariales !== null) {
          // Si la masse salariale est visible, on soustrait pour avoir la base (charges sans masse salariale)
          const chargesSalariales = point.charges_salariales
          filteredPoint.charges = point.charges - chargesSalariales
        } else {
          // Si la masse salariale n'est pas visible, on affiche les charges complètes
          filteredPoint.charges = point.charges
        }
      }
      
      // La masse salariale est empilée par-dessus les charges (sans masse salariale)
      // pour que la barre totale = charges, avec une partie hachurée = masse salariale
      if (visibleSeries.charges_salariales && point.charges_salariales !== null) {
        filteredPoint.charges_salariales = point.charges_salariales
      }
      
      // Gérer les charges fixes
      if (point.charges_fixes !== null && point.charges_fixes > 0) {
        filteredPoint.charges_fixes = point.charges_fixes
        filteredPoint.charges_fixes_breakdown = point.charges_fixes_breakdown
        
        // Si seul "Achats et charges" est sélectionné, le hachuré devient les charges fixes
        if (onlyChargesSelected && point.charges !== null) {
          // On affiche les charges sans charges fixes comme base, puis les charges fixes en hachuré
          if (filteredPoint.charges !== undefined) {
            filteredPoint.charges = filteredPoint.charges - point.charges_fixes
          } else {
            filteredPoint.charges = point.charges - point.charges_fixes
          }
          filteredPoint.charges_fixes_display = point.charges_fixes
        } else if (visibleSeries.charges && point.charges !== null && !visibleSeries.charges_salariales) {
          // Si les charges sont visibles mais pas la masse salariale, on affiche les charges fixes en hachuré
          // On doit ajuster la base des charges
          if (filteredPoint.charges !== undefined) {
            filteredPoint.charges = filteredPoint.charges - point.charges_fixes
          }
          filteredPoint.charges_fixes_display = point.charges_fixes
        } else if (visibleSeries.charges && point.charges !== null) {
          // Si les charges et la masse salariale sont visibles, on affiche les charges fixes après la masse salariale
          filteredPoint.charges_fixes_display = point.charges_fixes
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
          
          {/* Toggle pour les projections (uniquement en mode mois) */}
          {viewMode === 'month' && (
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showProjections}
                  onChange={(e) => setShowProjections(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Afficher les projections des 3 mois suivants
                </span>
              </label>
            </div>
          )}
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
                        formatter={(value: number, name: string, props: any) => {
                          if (name === 'Achats et charges' && props.payload.charges_fixes_display) {
                            return `${formatCurrency(value)} (dont ${formatCurrency(props.payload.charges_fixes_display)} de charges fixes)`
                          }
                          return formatCurrency(value)
                        }}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '8px'
                        }}
                        labelFormatter={(label) => {
                          const point = getChartData().find(p => p.monthLabel === label)
                          if (point?.isProjection) {
                            return `${label} (projection)`
                          }
                          return label
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
                      {visibleSeries.charges_salariales && (
                        <Bar 
                          dataKey="charges_salariales" 
                          fill="url(#hatchPattern)"
                          name="Masse salariale (incluse dans les charges)"
                          stackId="charges"
                        />
                      )}
                      {/* Charges fixes : affichées différemment selon le contexte */}
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
        
        {/* Section de détail des calculs */}
        {viewMode === 'month' && (
          <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Détail des charges fixes
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDetails}
                  onChange={(e) => setShowDetails(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Afficher le détail des comptes et calculs
                </span>
              </label>
            </div>
            
            {showDetails && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Comptes utilisés pour les charges fixes :</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    <li><strong>60614, 62511, 62512</strong> : Essence, péage et parking</li>
                    <li><strong>612...</strong> : Leasings (tous les comptes commençant par 612)</li>
                    <li><strong>613...</strong> : Locations, logiciels et loyers (tous les comptes commençant par 613)</li>
                    <li><strong>616...</strong> : Assurances (tous les comptes commençant par 616)</li>
                    <li><strong>64...</strong> : Salaires et cotisations (tous les comptes commençant par 64)</li>
                    <li><strong>622, 6226, 62263, 62265</strong> : Honoraires divers (comptes exacts)</li>
                    <li><strong>6262</strong> : Téléphone et internet</li>
                  </ul>
                </div>
                
                {showProjections && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Calcul des projections :</h3>
                    <p className="text-sm text-gray-700">
                      Pour chaque mois projeté, la moyenne de chaque catégorie est calculée sur les 12 mois précédents, puis les moyennes sont additionnées.
                    </p>
                    <div className="mt-3 space-y-2">
                      {getChartData()
                        .filter(p => p.isProjection && p.charges_fixes_breakdown)
                        .map((projection, idx) => (
                          <div key={idx} className="bg-white rounded p-3 border border-blue-200">
                            <h4 className="font-medium text-gray-900 mb-2">{projection.monthLabel} (projection)</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>Essence/Péage/Parking : {formatCurrency(projection.charges_fixes_breakdown.essence_peage_parking)}</div>
                              <div>Leasings : {formatCurrency(projection.charges_fixes_breakdown.leasings)}</div>
                              <div>Locations/Logiciels/Loyers : {formatCurrency(projection.charges_fixes_breakdown.locations_logiciels_loyers)}</div>
                              <div>Assurances : {formatCurrency(projection.charges_fixes_breakdown.assurances)}</div>
                              <div>Salaires et cotisations : {formatCurrency(projection.charges_fixes_breakdown.salaires_cotisations)}</div>
                              <div>Honoraires divers : {formatCurrency(projection.charges_fixes_breakdown.honoraires_divers)}</div>
                              <div>Téléphone/Internet : {formatCurrency(projection.charges_fixes_breakdown.telephone_internet)}</div>
                              <div className="font-semibold">Total charges fixes : {formatCurrency(projection.charges_fixes)}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Statistics
