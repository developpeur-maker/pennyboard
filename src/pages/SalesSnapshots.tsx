import React, { useState, useMemo } from 'react'
import { Calendar, Search, TrendingDown, ArrowLeft, ArrowRight, X } from 'lucide-react'

// ============================================================================
// DONNÉES DE TEST - À REMPLACER PAR LES DONNÉES DE LA BDD
// ============================================================================
// TODO: Remplacer ces données de test par un appel API vers /api/sales-snapshots
// qui récupérera les données depuis la table sales_snapshots de la BDD
// ============================================================================

// Générer des données de test pour 2025
const generateTestData = () => {
  const commerciaux = ['Jean Dupont', 'Marie Martin', 'Pierre Durand', 'Sophie Bernard']
  const data: Array<{
    commercial: string
    date: string // Format: YYYY-MM-DD
    ca_snapshot: number
    ca_reel: number
  }> = []

  // Générer des données pour quelques semaines en décembre 2025
  const weeks = [
    { start: '2025-12-01' }, // Semaine: 01/12 au 06/12
    { start: '2025-12-08' }, // Semaine: 08/12 au 13/12
    { start: '2025-12-15' }, // Semaine: 15/12 au 20/12
    { start: '2025-12-22' }, // Semaine: 22/12 au 27/12
  ]

  weeks.forEach(({ start }) => {
    const startDate = new Date(start)
    
    // Pour chaque jour de la semaine (lundi à samedi)
    for (let dayOffset = 0; dayOffset < 6; dayOffset++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + dayOffset)
      const dateStr = currentDate.toISOString().split('T')[0]
      
      commerciaux.forEach(commercial => {
        // Générer des CA snapshot aléatoires entre 1000 et 45000
        const caSnapshot = Math.floor(Math.random() * 44000) + 1000
        
        // Générer un CA réel légèrement inférieur (simule les annulations)
        // Perte entre 15% et 25%
        const lossPercentage = 0.15 + Math.random() * 0.10
        const caReel = Math.floor(caSnapshot * (1 - lossPercentage))
        
        data.push({
          commercial,
          date: dateStr,
          ca_snapshot: caSnapshot,
          ca_reel: caReel
        })
      })
    }
  })

  return data
}

const testData = generateTestData()

// ============================================================================
// FIN DES DONNÉES DE TEST
// ============================================================================

// Fonction pour obtenir le numéro de semaine ISO
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// Fonction pour obtenir le lundi d'une semaine
const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Ajuster pour lundi = 1
  return new Date(d.setDate(diff))
}

// Fonction pour formater une date
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

// Fonction pour formater une période de semaine
const formatWeekPeriod = (monday: Date): string => {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 5) // Samedi (6 jours après lundi)
  const weekNum = getWeekNumber(monday)
  return `Week ${weekNum} (${formatDate(monday.toISOString().split('T')[0])} au ${formatDate(sunday.toISOString().split('T')[0])})`
}

// Fonction pour obtenir toutes les semaines uniques
const getUniqueWeeks = (data: typeof testData): Date[] => {
  const weeks = new Set<string>()
  data.forEach(item => {
    const date = new Date(item.date)
    const monday = getMondayOfWeek(date)
    weeks.add(monday.toISOString().split('T')[0])
  })
  return Array.from(weeks)
    .map(d => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime())
}

// Fonction pour obtenir tous les commerciaux uniques
const getUniqueCommerciaux = (data: typeof testData): string[] => {
  return Array.from(new Set(data.map(item => item.commercial))).sort()
}

type ViewMode = 'year' | 'week' | 'custom'

const SalesSnapshots: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [lossPercentageFilter, setLossPercentageFilter] = useState('')
  const [lossPercentageOperator, setLossPercentageOperator] = useState<'greater' | 'less'>('greater')

  // Obtenir toutes les semaines uniques
  const allWeeks = useMemo(() => getUniqueWeeks(testData), [])
  
  // Initialiser selectedWeekIndex à la dernière semaine
  React.useEffect(() => {
    if (allWeeks.length > 0 && selectedWeekIndex === 0) {
      setSelectedWeekIndex(allWeeks.length - 1)
    }
  }, [allWeeks.length])

  // Filtrer les données selon la période sélectionnée
  const filteredData = useMemo(() => {
    let filtered = [...testData]

    // Filtrer par période
    if (viewMode === 'year') {
      // Filtrer pour l'année en cours
      const currentYear = new Date().getFullYear()
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.date)
        return itemDate.getFullYear() === currentYear
      })
    } else if (viewMode === 'week') {
      if (allWeeks.length > 0 && selectedWeekIndex >= 0 && selectedWeekIndex < allWeeks.length) {
        const selectedMonday = allWeeks[selectedWeekIndex]
        const selectedSunday = new Date(selectedMonday)
        selectedSunday.setDate(selectedMonday.getDate() + 5)
        
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.date)
          return itemDate >= selectedMonday && itemDate <= selectedSunday
        })
      }
    } else if (viewMode === 'custom') {
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate)
        const end = new Date(customEndDate)
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.date)
          return itemDate >= start && itemDate <= end
        })
      } else {
        filtered = []
      }
    }

    // Filtrer par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(item => 
        item.commercial.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [testData, viewMode, selectedWeekIndex, allWeeks, customStartDate, customEndDate, searchQuery])

  // Obtenir la période sélectionnée pour l'affichage
  const selectedPeriod = useMemo(() => {
    if (viewMode === 'year') {
      const currentYear = new Date().getFullYear()
      return `Année ${currentYear}`
    } else if (viewMode === 'week' && allWeeks.length > 0 && selectedWeekIndex >= 0 && selectedWeekIndex < allWeeks.length) {
      return formatWeekPeriod(allWeeks[selectedWeekIndex])
    } else if (viewMode === 'custom' && customStartDate && customEndDate) {
      return `${formatDate(customStartDate)} au ${formatDate(customEndDate)}`
    }
    return ''
  }, [viewMode, selectedWeekIndex, allWeeks, customStartDate, customEndDate])

  // Préparer les données pour la vue globale (un commercial = une ligne)
  const summaryData = useMemo(() => {
    const commerciaux = getUniqueCommerciaux(filteredData)
    const summary: Array<{
      commercial: string
      period: string
      totalInitial: number
      caFinal: number
      perteAbsolue: number
      pertePourcentage: number
      detailDays: Array<{
        day: string
        date: string
        ca_snapshot: number
        ca_reel: number
      }>
    }> = []

    commerciaux.forEach(commercial => {
      const commercialData = filteredData.filter(item => item.commercial === commercial)
      
      // Préparer les jours pour le détail
      const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
      const detailDays = commercialData.map(item => {
        const date = new Date(item.date)
        const dayIndex = (date.getDay() + 6) % 7
        return {
          day: dayNames[dayIndex] || '',
          date: item.date,
          ca_snapshot: item.ca_snapshot,
          ca_reel: item.ca_reel
        }
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Calculer les totaux
      const totalInitial = commercialData.reduce((sum, item) => sum + item.ca_snapshot, 0)
      const caFinal = commercialData.reduce((sum, item) => sum + item.ca_reel, 0)
      const perteAbsolue = caFinal - totalInitial
      const pertePourcentage = totalInitial > 0 ? (perteAbsolue / totalInitial) * 100 : 0

      summary.push({
        commercial,
        period: selectedPeriod,
        totalInitial,
        caFinal,
        perteAbsolue,
        pertePourcentage,
        detailDays
      })
    })

    return summary
  }, [filteredData, selectedPeriod])

  // Filtrer les données selon le pourcentage de perte
  const filteredSummaryData = useMemo(() => {
    let filtered = [...summaryData]

    // Filtrer par pourcentage de perte
    if (lossPercentageFilter.trim()) {
      const percentageValue = parseFloat(lossPercentageFilter)
      if (!isNaN(percentageValue)) {
        filtered = filtered.filter(item => {
          if (lossPercentageOperator === 'greater') {
            // Afficher les pertes supérieures ou égales au pourcentage (plus négatif)
            return item.pertePourcentage <= -percentageValue
          } else {
            // Afficher les pertes inférieures ou égales au pourcentage (moins négatif)
            return item.pertePourcentage >= -percentageValue
          }
        })
      }
    }

    return filtered
  }, [summaryData, lossPercentageFilter, lossPercentageOperator])

  // État pour le modal de détail
  const [selectedCommercial, setSelectedCommercial] = useState<typeof summaryData[0] | null>(null)

  // Formater les montants
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Navigation entre les semaines
  const canGoPrevious = selectedWeekIndex > 0
  const canGoNext = selectedWeekIndex < allWeeks.length - 1

  const handlePreviousWeek = () => {
    if (canGoPrevious) {
      setSelectedWeekIndex(selectedWeekIndex - 1)
    }
  }

  const handleNextWeek = () => {
    if (canGoNext) {
      setSelectedWeekIndex(selectedWeekIndex + 1)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold font-poppins text-gray-900">
            Snapshots ventes
          </h1>
          <p className="text-gray-600 font-inter mt-2 text-lg">
            Suivi des ventes par commercial et analyse des pertes
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        {/* Mode d'affichage */}
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-600" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('year')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'year'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cette année
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Par semaine
            </button>
            <button
              onClick={() => setViewMode('custom')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Période personnalisée
            </button>
          </div>
        </div>

        {/* Sélecteur de semaine */}
        {viewMode === 'week' && allWeeks.length > 0 && (
          <div className="flex items-center gap-4">
            <button
              onClick={handlePreviousWeek}
              disabled={!canGoPrevious}
              className={`p-2 rounded-lg transition-colors ${
                canGoPrevious
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 text-center">
              <p className="text-sm font-medium text-gray-700">
                {formatWeekPeriod(allWeeks[selectedWeekIndex])}
              </p>
            </div>
            <button
              onClick={handleNextWeek}
              disabled={!canGoNext}
              className={`p-2 rounded-lg transition-colors ${
                canGoNext
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Période personnalisée */}
        {viewMode === 'custom' && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Du:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Au:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un commercial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
          />
        </div>

        {/* Filtre par pourcentage de perte */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Filtrer par % de perte:
          </label>
          <div className="flex items-center gap-2">
            <select
              value={lossPercentageOperator}
              onChange={(e) => setLossPercentageOperator(e.target.value as 'greater' | 'less')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700"
            >
              <option value="greater">Supérieur ou égal à</option>
              <option value="less">Inférieur ou égal à</option>
            </select>
            <input
              type="number"
              placeholder="20"
              value={lossPercentageFilter}
              onChange={(e) => setLossPercentageFilter(e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700"
              min="0"
              step="0.1"
            />
            <span className="text-sm text-gray-600">%</span>
            {lossPercentageFilter && (
              <button
                onClick={() => {
                  setLossPercentageFilter('')
                  setLossPercentageOperator('greater')
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tableau global */}
      {filteredSummaryData.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <TrendingDown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {viewMode === 'custom' && (!customStartDate || !customEndDate)
              ? 'Veuillez sélectionner une période'
              : 'Aucune donnée trouvée pour cette période'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commercial
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Période
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total initial
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CA final
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Perte absolue
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % Perte
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSummaryData.map((item, index) => (
                  <tr 
                    key={index} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedCommercial(item)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.commercial}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.period}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(item.totalInitial)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(item.caFinal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-red-900">
                      {formatCurrency(item.perteAbsolue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-red-900">
                      {item.pertePourcentage.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    Total
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(filteredSummaryData.reduce((sum, item) => sum + item.totalInitial, 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(filteredSummaryData.reduce((sum, item) => sum + item.caFinal, 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-red-900">
                    {formatCurrency(filteredSummaryData.reduce((sum, item) => sum + item.perteAbsolue, 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-red-900">
                    {filteredSummaryData.reduce((sum, item) => sum + item.totalInitial, 0) > 0
                      ? ((filteredSummaryData.reduce((sum, item) => sum + item.perteAbsolue, 0) / filteredSummaryData.reduce((sum, item) => sum + item.totalInitial, 0)) * 100).toFixed(2)
                      : '0.00'}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal de détail */}
      {selectedCommercial && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setSelectedCommercial(null)}
          />
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Détail des ventes</h2>
                  <p className="text-sm text-gray-600">{selectedCommercial.commercial} - {selectedCommercial.period}</p>
                </div>
                <button
                  onClick={() => setSelectedCommercial(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              {/* Content */}
              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Jour
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          CA snapshot
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedCommercial.detailDays.map((day, dayIndex) => (
                        <tr key={dayIndex} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {day.day}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {formatCurrency(day.ca_snapshot)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          Total initial
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(selectedCommercial.totalInitial)}
                        </td>
                      </tr>
                      <tr className="bg-gray-100">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          CA final
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(selectedCommercial.caFinal)}
                        </td>
                      </tr>
                      <tr className="bg-red-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-900">
                          Perte absolue
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-red-900">
                          {formatCurrency(selectedCommercial.perteAbsolue)}
                        </td>
                      </tr>
                      <tr className="bg-red-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-900">
                          % Perte
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-red-900">
                          {selectedCommercial.pertePourcentage.toFixed(2)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note sur les données de test */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> Cette page utilise actuellement des données de test pour 2025. 
          Les données réelles seront récupérées depuis la base de données une fois la synchronisation Pipedrive configurée.
        </p>
      </div>
    </div>
  )
}

export default SalesSnapshots
