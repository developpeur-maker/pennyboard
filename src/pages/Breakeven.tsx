import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Calendar } from 'lucide-react'
import { usePayfitSalaries } from '../hooks/usePayfitSalaries'
import { getAllDataFromDatabase } from '../services/databaseApi'

// Listes hardcodées des diagnostiqueurs (pour les années avant 2026)
const DIAGNOSTIQUEURS = [
  'BENJAMIN BERNARD', 'CAROLE TOULORGE', 'JEAN-LAURENT GUELTON', 'Sarah Hecketsweiler', 'Alexandre Ellul-Renuy', 
  'Servane GENTILHOMME', 'Jules Freulard', 'Jacques de Castelnau', 'Grégoire DE RICARD', 'Brice Gretha', 
  'Sylvain COHERGNE', 'Fabien BETEILLE', 'Ilan TEICHNER', 'Christophe Metzger', 'Elie Dahan', 'Simon ZERBIB', 
  'Yanis Lacroix', 'Jonathan Pichon', 'Robin Zeni', 'José GARCIA CUERDA', 'Cyril Cedileau', 'Julien Colinet', 
  'Arnaud Larregain', 'Alexandre SIMONOT', 'Theo Termessant', 'Pierre-Louis VILLA', 'Antoine Fauvet', 
  'Laurent Marty', 'Yannick MBOMA', 'Nassim Bidouche', 'Mickael ERB', 'KEVIN COURTEAUX', 'Nicolas MAGERE', 
  'Yanisse Chekireb', 'Louca ANTONIOLLI', 'Pascal ALLAMELOU', 'Léo PAYAN', 'Mohamed Berete', 'Simon Benezra Simon', 
  'Rémi NAUDET', 'Sylvain Gomes', 'Nicolas Fabre', 'Armend Letaj', 'Sabry Ouadada', 'Brice GRETHA', 
  'Guillaume FATOUX', 'Amel TOUATI PINSOLLE', 'Christophe MARCHAL', 'Anis Fekih', 'Martial Macari', 
  'Faycal Zerizer', 'Morgan Lorrain', 'Nathan Jurado', 'Corentin BANIA', 'Samir BONHUR', 'Eric Loviny', 
  'Clément BUISINE', 'Steeve JEAN-PHILIPPE', 'Guillaume Lavigne', 'Stéphane MABIALA', 'Laurent Belchi', 
  'Nicolas FABRE', 'Lucas MEZERETTE', 'Khalil BOUKLOUCHE', 'Grégory LAMBING', 'Radwane FARADJI', 
  'John RAKOTONDRABAO', 'Olivier MIRAT', 'Fabien PRÉVOT', 'Onur SONMEZ', 'Jérôme BENHAMOU', 'Pierre SIONG', 
  'Océane DIOT', 'Mickael FIGUIERES', 'Romain CINIER', 'Arnaud BOUSSIDAN', 'Lydiane CAND', 'Enzo SAYIN', 
  'Mathieu TABOULOT', 'Léo MOLITES', 'Yves GRANVILLE', 'BAPTISTE BAUET', 'Mounir MAROUANE', 'François LASRET', 
  'Osman KIZILKAYA', 'Abdeltife GARTI', 'Maxime LE BRIS', 'Christopher PITA', 'David EPINEAUX', 
  'Olivier Corsin', 'Jaouad NELSON', 'Lionel THOMASSET', 'Florian VIVES', 'Maxime LEROY', 'Maxime PELLIER', 
  'Idriss TCHINI', 'Danny FIDANZA', 'Lucille GRIFFAY', 'Sofiane ZEKRI', 'Sofiane KHELFAOUI', 'Romain GUEHO', 
  'Jérôme SAUVAGE', 'Yohann LAILLIER-JARDÉ', 'Pascal CABELEIRA', 'Aziz AOURAGH', 'Téo DOUBLIER', 
  'Sébastien SOUYRIS', 'Fabrice STECIUK', 'Jérémie JOURNAUX', 'Ariles MERAD', 'Simon PACAUD'
].map(name => name.toUpperCase().trim())

// Fonction pour normaliser un nom
const normalizeName = (name: string): string => {
  if (!name) return ''
  return name
    .toUpperCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

// Fonction pour déterminer si un employé est diagnostiqueur
// Utilise les tags analyticCodes si disponibles (années >= 2026), sinon les listes hardcodées
const isDiagnostiqueur = (employeeName: string, operations: any[], year: number): boolean => {
  const normalizedName = normalizeName(employeeName)
  
  // Pour les années >= 2026, utiliser les tags analyticCodes
  if (year >= 2026 && operations && Array.isArray(operations)) {
    for (const op of operations) {
      if (op.analyticCodes && Array.isArray(op.analyticCodes)) {
        for (const code of op.analyticCodes) {
          if (code.type === 'Équipe' || code.type === 'equipe' || code.type === 'Equipe' || code.type === 'Team') {
            const value = (code.value || '').toUpperCase().trim()
            if (value === 'DIAGNOSTIQUEUR' || value === 'DIAGNOSTIQUEURS') {
              return true
            }
          }
        }
      }
    }
  }
  
  // Pour les années < 2026 ou si pas de tags, utiliser les listes hardcodées
  return DIAGNOSTIQUEURS.some(name => normalizeName(name) === normalizedName)
}

interface BreakevenDataPoint {
  month: string
  monthLabel: string
  year: number
  monthNumber: number
  diagnostiqueursCount: number
  charges: number | null
  breakeven: number | null
  hasData: boolean
}

const Breakeven: React.FC = () => {
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month')
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const currentDate = new Date()
    return currentDate.getFullYear().toString()
  })
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1
    const monthFormatted = month.toString().padStart(2, '0')
    return `${year}-${monthFormatted}`
  })

  const [chartData, setChartData] = useState<BreakevenDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Utiliser le hook pour récupérer les données Payfit depuis la BDD
  const payfitData = usePayfitSalaries(
    viewMode === 'month' ? selectedMonth : undefined,
    viewMode === 'year' ? selectedYear : undefined
  )

  // Fonction pour générer les années disponibles (2021 → année actuelle)
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

  // Fonction pour formater les montants en devise
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Fonction pour récupérer les données
  const fetchBreakevenData = async () => {
    setLoading(true)
    setError(null)

    try {
      let monthsToFetch: string[] = []

      if (viewMode === 'month') {
        monthsToFetch = [selectedMonth]
      } else {
        // Mode année : tous les mois de l'année
        for (let month = 1; month <= 12; month++) {
          const monthFormatted = month.toString().padStart(2, '0')
          monthsToFetch.push(`${selectedYear}-${monthFormatted}`)
        }
      }

      // Récupérer les données Payfit et les charges pour chaque mois
      // Note: Pour le mode mois, on utilise directement les données du hook
      // Pour le mode année, on doit récupérer chaque mois individuellement
      const dataPromises = monthsToFetch.map(async (month) => {
        const [year, monthNum] = month.split('-')
        const yearNum = parseInt(year, 10)

        // Récupérer les données Payfit depuis la BDD
        let employees: any[] = []
        
        // Pour le mode mois, utiliser directement les données du hook
        if (viewMode === 'month' && month === selectedMonth && payfitData.employees.length > 0) {
          employees = payfitData.employees
        } else {
          // Pour le mode année ou si les données du hook ne sont pas disponibles, faire un appel API
          // (qui lit depuis la BDD, donc c'est OK)
          const payfitResponse = await fetch(`/api/payfit-salaries?month=${month}`)
          if (payfitResponse.ok) {
            const payfitResponseData = await payfitResponse.json()
            if (payfitResponseData.success && payfitResponseData.employees) {
              employees = payfitResponseData.employees
            }
          }
        }

        // Récupérer les charges depuis la base de données
        const chargesResponse = await getAllDataFromDatabase(month)
        let charges: number | null = null
        
        if (chargesResponse.success && chargesResponse.data?.kpis) {
          charges = chargesResponse.data.kpis.charges || null
        }

        // Compter le nombre de diagnostiqueurs uniques
        const diagnostiqueursSet = new Set()
        employees.forEach((emp) => {
          if (isDiagnostiqueur(emp.employeeName, emp.operations || [], yearNum)) {
            const key = `${emp.employeeName}_${emp.contractId || 'unknown'}`
            diagnostiqueursSet.add(key)
          }
        })
        const diagnostiqueursCount = diagnostiqueursSet.size

        // Calculer le seuil de rentabilité
        let breakeven: number | null = null
        if (charges !== null && diagnostiqueursCount > 0) {
          breakeven = charges / diagnostiqueursCount
        }

        return {
          month,
          year: yearNum,
          monthNumber: parseInt(monthNum, 10),
          diagnostiqueursCount,
          charges,
          breakeven,
          hasData: employees.length > 0 || charges !== null
        }
      })

      const results = await Promise.all(dataPromises)

      // Transformer les données pour le graphique
      const monthNames = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
      ]

      let transformedData: BreakevenDataPoint[] = results
        .sort((a, b) => {
          if (a.month < b.month) return -1
          if (a.month > b.month) return 1
          return 0
        })
        .map((point) => {
          const [year, month] = point.month.split('-')
          const monthIndex = parseInt(month) - 1

          return {
            ...point,
            monthLabel: `${monthNames[monthIndex]} ${year}`
          }
        })

      // Si mode année, agréger les données par année
      if (viewMode === 'year') {
        const yearMap = new Map<number, {
          year: number
          totalCharges: number
          totalDiagnostiqueurs: number
          monthsCount: number
          hasData: boolean
        }>()

        transformedData.forEach((point) => {
          if (!yearMap.has(point.year)) {
            yearMap.set(point.year, {
              year: point.year,
              totalCharges: 0,
              totalDiagnostiqueurs: 0,
              monthsCount: 0,
              hasData: false
            })
          }

          const yearData = yearMap.get(point.year)!
          if (point.hasData && point.charges !== null && point.diagnostiqueursCount > 0) {
            yearData.totalCharges += point.charges
            yearData.totalDiagnostiqueurs += point.diagnostiqueursCount
            yearData.monthsCount += 1
            yearData.hasData = true
          }
        })

        // Calculer le seuil de rentabilité agrégé par année
        transformedData = Array.from(yearMap.values())
          .map((yearData) => {
            const avgDiagnostiqueurs = yearData.monthsCount > 0 
              ? yearData.totalDiagnostiqueurs / yearData.monthsCount 
              : 0
            const breakeven = avgDiagnostiqueurs > 0 
              ? yearData.totalCharges / avgDiagnostiqueurs 
              : null

            return {
              month: `${yearData.year}-00`,
              monthLabel: yearData.year.toString(),
              year: yearData.year,
              monthNumber: 0,
              diagnostiqueursCount: Math.round(avgDiagnostiqueurs * 10) / 10,
              charges: yearData.totalCharges,
              breakeven,
              hasData: yearData.hasData
            }
          })
          .sort((a, b) => a.year - b.year)
      }

      setChartData(transformedData)
    } catch (err) {
      console.error('❌ Erreur lors de la récupération des données:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setChartData([])
    } finally {
      setLoading(false)
    }
  }

  // Utiliser useMemo pour calculer les données uniquement quand nécessaire
  useEffect(() => {
    // Attendre que les données Payfit soient chargées (pour le mode mois)
    if (viewMode === 'month' && payfitData.loading) {
      return
    }
    fetchBreakevenData()
  }, [viewMode, selectedYear, selectedMonth, payfitData.employees, payfitData.loading])

  // Fonction pour formater la période affichée
  const formatPeriod = () => {
    if (viewMode === 'year') {
      return `Exercice ${selectedYear}`
    } else {
      const [year, month] = selectedMonth.split('-')
      const monthNames = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
      ]
      const monthIndex = parseInt(month) - 1
      return `${monthNames[monthIndex]} ${year}`
    }
  }

  // Fonction pour obtenir les données du graphique
  const getChartData = () => {
    return chartData.filter(point => point.hasData)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Seuil de rentabilité</h1>
          <p className="text-gray-600">
            Calcul du seuil de rentabilité par technicien (Charges totales / Nombre de diagnostiqueurs)
          </p>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            {/* Toggle Mois/Année */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Mois
              </button>
              <button
                onClick={() => setViewMode('year')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'year'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Année
              </button>
            </div>

            {/* Sélecteur de période */}
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              {viewMode === 'month' ? (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {generateMonthsForYear(selectedMonth.split('-')[0]).map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {generateAvailableYears().map((year) => (
                    <option key={year.value} value={year.value}>
                      {year.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Graphique */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Évolution du seuil de rentabilité - {formatPeriod()}
          </h2>
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
            <div className="transition-opacity duration-300 ease-in-out">
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
                  <Bar 
                    dataKey="breakeven" 
                    fill="#3b82f6"
                    name="Seuil de rentabilité (€)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Détails par période - {formatPeriod()}
          </h2>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement des données...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-600 text-lg font-semibold mb-2">Erreur</p>
                <p className="text-gray-600">{error}</p>
              </div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-600 text-lg">Aucune donnée disponible pour cette période</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Période
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre de diagnostiqueurs
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Charges totales
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seuil de rentabilité
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {chartData.map((point) => (
                    <tr key={point.month} className={point.hasData ? '' : 'opacity-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {point.monthLabel}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {point.diagnostiqueursCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(point.charges)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(point.breakeven)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Breakeven
