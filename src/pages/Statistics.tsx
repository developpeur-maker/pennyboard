import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getAllDataFromDatabase } from '../services/databaseApi'

interface ChartDataPoint {
  month: string
  monthLabel: string
  revenus_totaux: number | null
  charges: number | null
  charges_salariales: number | null
  tresorerie: number | null
}

const Statistics: React.FC = () => {
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month')
  const [monthOffset, setMonthOffset] = useState(0) // Offset pour la pagination (0 = 6 derniers mois)
  
  // États pour les pastilles (séries visibles)
  const [visibleSeries, setVisibleSeries] = useState({
    revenus_totaux: true,
    charges: true,
    charges_salariales: true,
    tresorerie: true
  })

  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null)
  const prevMonthOffsetRef = useRef(0)

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

  // Fonction pour récupérer les données cumulées d'une année
  const fetchYearData = async (year: string): Promise<{
    year: string
    revenus_totaux: number | null
    charges: number | null
    charges_salariales: number | null
    tresorerie: number | null
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
      let lastTresorerie = 0

      validResults.forEach((data: any) => {
        const kpis = data.kpis || {}
        totalRevenus += kpis.revenus_totaux || 0
        totalCharges += kpis.charges || 0
        totalChargesSalariales += kpis.charges_salariales || 0
        // Trésorerie = valeur du dernier mois de l'année
        if (kpis.tresorerie !== null && kpis.tresorerie !== undefined) {
          lastTresorerie = kpis.tresorerie
        }
      })

      return {
        year,
        revenus_totaux: totalRevenus || null,
        charges: totalCharges || null,
        charges_salariales: totalChargesSalariales || null,
        tresorerie: lastTresorerie || null
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
            tresorerie: result!.tresorerie
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
        const monthNames = [
          'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ]

        chartDataPoints = validResults
          .sort((a, b) => a.month.localeCompare(b.month))
          .map((result) => {
            const [year, month] = result.month.split('-')
            const monthIndex = parseInt(month) - 1
            const kpis = result.data.kpis || {}

            return {
              month: result.month,
              monthLabel: `${monthNames[monthIndex]} ${year}`,
              revenus_totaux: kpis.revenus_totaux || null,
              charges: kpis.charges || null,
              charges_salariales: kpis.charges_salariales || null,
              tresorerie: kpis.tresorerie || null
            }
          })
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
    return displayedData.map(point => {
      const filteredPoint: any = {
        monthLabel: point.monthLabel
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
      if (visibleSeries.tresorerie && point.tresorerie !== null) {
        filteredPoint.tresorerie = point.tresorerie
      }
      
      return filteredPoint
    })
  }

  // Couleurs pour chaque série
  const seriesColors = {
    revenus_totaux: '#10b981', // green
    charges: '#ef4444', // red
    charges_salariales: '#f97316', // orange
    tresorerie: '#06b6d4' // cyan
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
          <div className="flex flex-wrap gap-3">
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
            <button
              onClick={() => toggleSeries('tresorerie')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                visibleSeries.tresorerie
                  ? 'bg-cyan-100 text-cyan-800 ring-2 ring-cyan-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Trésorerie
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
                    setSlideDirection('right')
                    setMonthOffset(prev => {
                      prevMonthOffsetRef.current = prev
                      return Math.min(prev + 1, chartData.length - 6)
                    })
                    setTimeout(() => setSlideDirection(null), 500)
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
                    setSlideDirection('left')
                    setMonthOffset(prev => {
                      prevMonthOffsetRef.current = prev
                      return Math.max(prev - 1, 0)
                    })
                    setTimeout(() => setSlideDirection(null), 500)
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
            <div className="relative overflow-hidden">
              <div 
                key={monthOffset}
                className={`transition-transform duration-500 ease-in-out ${
                  slideDirection === 'left' ? 'animate-slide-left' : 
                  slideDirection === 'right' ? 'animate-slide-right' : ''
                }`}
              >
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart data={getChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="monthLabel" 
                  angle={viewMode === 'year' ? 0 : -45}
                  textAnchor={viewMode === 'year' ? "middle" : "end"}
                  height={viewMode === 'year' ? 40 : 80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
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
                </defs>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px'
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
                {visibleSeries.tresorerie && (
                  <Bar 
                    dataKey="tresorerie" 
                    fill={seriesColors.tresorerie}
                    name="Trésorerie"
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
