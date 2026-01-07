import React, { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
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
  // Fonction pour obtenir le mois en cours
  const getCurrentMonth = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1
    const monthFormatted = month.toString().padStart(2, '0')
    return `${year}-${monthFormatted}`
  }

  // Fonction pour générer la liste des années disponibles (2021 → année actuelle)
  const generateAvailableYears = () => {
    const years = []
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const startYear = 2021
    
    for (let year = currentYear; year >= startYear; year--) {
      years.push({
        value: year.toString(),
        label: `Exercice ${year}`
      })
    }
    
    return years
  }

  // Fonction pour générer les mois d'une année spécifique
  const generateMonthsForYear = (year: string) => {
    const months = []
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]
    
    for (let month = 1; month <= 12; month++) {
      const monthFormatted = month.toString().padStart(2, '0')
      const monthKey = `${year}-${monthFormatted}`
      
      months.push({
        value: monthKey,
        label: `${monthNames[month - 1]} ${year}`
      })
    }
    
    return months
  }

  const currentMonth = getCurrentMonth()
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month')
  const [selectedYear, setSelectedYear] = useState(() => {
    const [year] = currentMonth.split('-')
    return year
  })
  
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

  // Déterminer si on est en mode année
  const isFullYear = viewMode === 'year' || selectedMonth.endsWith('-00')

  // Fonction pour formater la période affichée
  const formatPeriod = () => {
    if (isFullYear) {
      return 'Toutes les années'
    } else {
      const [year] = selectedMonth.split('-')
      return `Tous les mois de ${year}`
    }
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

  // Fonction pour récupérer les données historiques
  const fetchHistoricalData = async () => {
    setLoading(true)
    setError(null)

    try {
      const isFullYear = viewMode === 'year' || selectedMonth.endsWith('-00')
      let chartDataPoints: ChartDataPoint[] = []

      if (isFullYear) {
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
        // Mode mois : afficher tous les mois de l'année sélectionnée
        const [year] = selectedMonth.split('-')
        const monthsToFetch: string[] = []
        
        for (let month = 1; month <= 12; month++) {
          const monthFormatted = month.toString().padStart(2, '0')
          monthsToFetch.push(`${year}-${monthFormatted}`)
        }

        // Récupérer les données de tous les mois en parallèle
        const dataPromises = monthsToFetch.map(async (month) => {
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

  // Charger les données au montage et quand les filtres changent
  useEffect(() => {
    fetchHistoricalData()
  }, [selectedMonth, selectedYear, viewMode])

  // Fonction pour basculer la visibilité d'une série
  const toggleSeries = (seriesKey: keyof typeof visibleSeries) => {
    setVisibleSeries(prev => ({
      ...prev,
      [seriesKey]: !prev[seriesKey]
    }))
  }

  // Préparer les données pour le graphique (filtrer les séries non visibles)
  const getChartData = () => {
    return chartData.map(point => {
      const filteredPoint: any = {
        monthLabel: point.monthLabel
      }
      
      if (visibleSeries.revenus_totaux && point.revenus_totaux !== null) {
        filteredPoint.revenus_totaux = point.revenus_totaux
      }
      if (visibleSeries.charges && point.charges !== null) {
        filteredPoint.charges = point.charges
      }
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
              <Calendar className="w-5 h-5 text-gray-600" />
              {/* Sélecteur d'année */}
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value)
                  setSelectedMonth(`${e.target.value}-00`)
                  setViewMode('year')
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-medium"
              >
                {generateAvailableYears().map((year) => (
                  <option key={year.value} value={year.value}>
                    {year.label}
                  </option>
                ))}
              </select>
              {/* Sélecteur de mois ou année complète */}
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value)
                  if (e.target.value.endsWith('-00')) {
                    setViewMode('year')
                  } else {
                    setViewMode('month')
                  }
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-medium"
              >
                <option value={`${selectedYear}-00`}>Exercice complet</option>
                {generateMonthsForYear(selectedYear).map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
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
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={getChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="monthLabel" 
                  angle={isFullYear ? 0 : -45}
                  textAnchor={isFullYear ? "middle" : "end"}
                  height={isFullYear ? 40 : 80}
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
                  />
                )}
                {visibleSeries.charges_salariales && (
                  <Bar 
                    dataKey="charges_salariales" 
                    fill={seriesColors.charges_salariales}
                    name="Masse salariale"
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
          )}
        </div>
      </div>
    </div>
  )
}

export default Statistics

