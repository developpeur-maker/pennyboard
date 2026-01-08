import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
  ventes: number | null
  ventesParDiagnostiqueur: number | null
  hasData: boolean
}

const Breakeven: React.FC = () => {
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month')
  const [monthOffset, setMonthOffset] = useState(0) // Offset pour la pagination (0 = 6 derniers mois)
  const [chartData, setChartData] = useState<BreakevenDataPoint[]>([])
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
    if (value === null || value === undefined) return 'N/A'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Fonction pour récupérer les données historiques
  const fetchBreakevenData = async () => {
    setLoading(true)
    setError(null)

    try {
      let chartDataPoints: BreakevenDataPoint[] = []

      if (viewMode === 'year') {
        // Mode année : récupérer toutes les années disponibles (2021 → année actuelle)
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
            month: result!.year.toString(),
            monthLabel: result!.year.toString(),
            year: result!.year,
            monthNumber: 0,
            diagnostiqueursCount: result!.avgDiagnostiqueurs,
            charges: result!.totalCharges,
            breakeven: result!.breakeven,
            ventes: result!.totalVentes,
            ventesParDiagnostiqueur: result!.ventesParDiagnostiqueur,
            hasData: result!.hasData
          }))
      } else {
        // Mode mois : récupérer tous les mois disponibles
        const allMonths = generateAllMonths()
        
        // Récupérer les données de tous les mois en parallèle
        const dataPromises = allMonths.map(async (month) => {
          const [year, monthNum] = month.split('-')
          const yearNum = parseInt(year, 10)

          // Récupérer les données Payfit depuis la BDD
          const payfitResponse = await fetch(`/api/payfit-salaries?month=${month}`)
          let employees: any[] = []
          
          if (payfitResponse.ok) {
            const payfitResponseData = await payfitResponse.json()
            if (payfitResponseData.success && payfitResponseData.employees) {
              employees = payfitResponseData.employees
            }
          }

          // Récupérer les charges et ventes depuis la base de données
          const kpiResponse = await getAllDataFromDatabase(month)
          let charges: number | null = null
          let ventes: number | null = null
          
          if (kpiResponse.success && kpiResponse.data?.kpis) {
            charges = kpiResponse.data.kpis.charges || null
            ventes = kpiResponse.data.kpis.ventes_706 || null
          }

          // Compter le nombre de diagnostiqueurs uniques (salaire > 1000€)
          const diagnostiqueursSet = new Set()
          employees.forEach((emp) => {
            if (isDiagnostiqueur(emp.employeeName, emp.operations || [], yearNum)) {
              // Ne compter que les diagnostiqueurs avec un salaire supérieur à 1000€ pour ce mois
              const salaryPaid = emp.salaryPaid || 0
              if (salaryPaid > 1000) {
                const key = `${emp.employeeName}_${emp.contractId || 'unknown'}`
                diagnostiqueursSet.add(key)
              }
            }
          })
          const diagnostiqueursCount = diagnostiqueursSet.size

          // Calculer le seuil de rentabilité et les ventes par diagnostiqueur
          let breakeven: number | null = null
          let ventesParDiagnostiqueur: number | null = null
          if (diagnostiqueursCount > 0) {
            if (charges !== null) {
              breakeven = charges / diagnostiqueursCount
            }
            if (ventes !== null) {
              ventesParDiagnostiqueur = ventes / diagnostiqueursCount
            }
          }

          return {
            month,
            year: yearNum,
            monthNumber: parseInt(monthNum, 10),
            diagnostiqueursCount,
            charges,
            breakeven,
            ventes,
            ventesParDiagnostiqueur,
            hasData: employees.length > 0 || charges !== null || ventes !== null
          }
        })

        const results = await Promise.all(dataPromises)

        // Transformer les données pour le graphique
        const monthNames = [
          'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ]

        chartDataPoints = results
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
      }

      setChartData(chartDataPoints)
    } catch (err) {
      console.error('❌ Erreur lors de la récupération des données:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setChartData([])
    } finally {
      setLoading(false)
    }
  }

  // Utiliser useMemo pour calculer les données uniquement quand nécessaire
  // Fonction pour récupérer les données cumulées d'une année
  const fetchYearData = async (year: string): Promise<{
    year: number
    totalCharges: number
    totalVentes: number
    avgDiagnostiqueurs: number
    breakeven: number | null
    ventesParDiagnostiqueur: number | null
    hasData: boolean
  } | null> => {
    try {
      const monthsToFetch: string[] = []
      for (let month = 1; month <= 12; month++) {
        const monthFormatted = month.toString().padStart(2, '0')
        monthsToFetch.push(`${year}-${monthFormatted}`)
      }

      // Récupérer les données de tous les mois de l'année
      const dataPromises = monthsToFetch.map(async (month) => {
        const [yearStr] = month.split('-')
        const yearNum = parseInt(yearStr, 10)

        // Récupérer les données Payfit
        const payfitResponse = await fetch(`/api/payfit-salaries?month=${month}`)
        let employees: any[] = []
        
        if (payfitResponse.ok) {
          const payfitResponseData = await payfitResponse.json()
          if (payfitResponseData.success && payfitResponseData.employees) {
            employees = payfitResponseData.employees
          }
        }

        // Récupérer les charges et ventes
        const kpiResponse = await getAllDataFromDatabase(month)
        let charges: number | null = null
        let ventes: number | null = null
        
        if (kpiResponse.success && kpiResponse.data?.kpis) {
          charges = kpiResponse.data.kpis.charges || null
          ventes = kpiResponse.data.kpis.ventes_706 || null
        }

        // Compter les diagnostiqueurs (salaire > 1000€)
        const diagnostiqueursSet = new Set()
        employees.forEach((emp) => {
          if (isDiagnostiqueur(emp.employeeName, emp.operations || [], yearNum)) {
            // Ne compter que les diagnostiqueurs avec un salaire supérieur à 1000€ pour ce mois
            const salaryPaid = emp.salaryPaid || 0
            if (salaryPaid > 1000) {
              const key = `${emp.employeeName}_${emp.contractId || 'unknown'}`
              diagnostiqueursSet.add(key)
            }
          }
        })

        return {
          month,
          charges,
          ventes,
          diagnostiqueursCount: diagnostiqueursSet.size
        }
      })

      const results = await Promise.all(dataPromises)
      const validResults = results.filter(r => r.charges !== null || r.ventes !== null || r.diagnostiqueursCount > 0)

      if (validResults.length === 0) {
        return null
      }

      // Calculer les totaux cumulés pour l'année
      let totalCharges = 0
      let totalVentes = 0
      let totalDiagnostiqueurs = 0
      let monthsCount = 0

      validResults.forEach((data: any) => {
        if (data.charges !== null) totalCharges += data.charges
        if (data.ventes !== null) totalVentes += data.ventes
        totalDiagnostiqueurs += data.diagnostiqueursCount
        monthsCount += 1
      })

      const avgDiagnostiqueurs = monthsCount > 0 ? totalDiagnostiqueurs / monthsCount : 0
      const breakeven = avgDiagnostiqueurs > 0 ? totalCharges / avgDiagnostiqueurs : null
      const ventesParDiagnostiqueur = avgDiagnostiqueurs > 0 ? totalVentes / avgDiagnostiqueurs : null

      return {
        year: parseInt(year, 10),
        totalCharges,
        totalVentes,
        avgDiagnostiqueurs: Math.round(avgDiagnostiqueurs * 10) / 10,
        breakeven,
        ventesParDiagnostiqueur,
        hasData: validResults.length > 0
      }
    } catch (err) {
      console.error(`❌ Erreur lors de la récupération des données pour l'année ${year}:`, err)
      return null
    }
  }

  // Charger les données au montage et quand le mode de vue change
  useEffect(() => {
    fetchBreakevenData()
  }, [viewMode])

  // Réinitialiser l'offset quand on change de mode
  useEffect(() => {
    setMonthOffset(0)
  }, [viewMode])

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

  // Fonction pour obtenir les données du graphique
  const getChartData = () => {
    return getDisplayedData().filter(point => point.hasData)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold font-poppins text-gray-900">
                Seuil de rentabilité
              </h1>
              <p className="text-gray-600 font-inter mt-2 text-lg">
                Calcul du seuil de rentabilité par technicien et comparaison avec les ventes
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

        {/* Graphique */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Évolution du seuil de rentabilité - {formatPeriod()}
          </h2>
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
                  <Bar 
                    dataKey="ventesParDiagnostiqueur" 
                    fill="#10b981"
                    name="Ventes moyennes par diagnostiqueur (€)"
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ventes moyennes par diagnostiqueur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Écart
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getDisplayedData().map((point) => {
                    const ecart = point.breakeven !== null && point.ventesParDiagnostiqueur !== null
                      ? point.ventesParDiagnostiqueur - point.breakeven
                      : null
                    const isPositive = ecart !== null && ecart > 0
                    
                    return (
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          {formatCurrency(point.ventesParDiagnostiqueur)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                          ecart !== null 
                            ? (isPositive ? 'text-green-600' : 'text-red-600')
                            : 'text-gray-500'
                        }`}>
                          {ecart !== null 
                            ? `${isPositive ? '+' : ''}${formatCurrency(ecart)}`
                            : 'N/A'
                          }
                        </td>
                      </tr>
                    )
                  })}
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
