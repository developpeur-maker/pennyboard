import React, { useState } from 'react'
import { DollarSign, Users, Calendar, RefreshCw, TrendingUp } from 'lucide-react'
import { usePayfitSalaries } from '../hooks/usePayfitSalaries'

const Salaries: React.FC = () => {
  // Obtenir le mois en cours par défaut
  const getCurrentMonth = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1
    const monthFormatted = month.toString().padStart(2, '0')
    return `${year}-${monthFormatted}`
  }

  // Générer les années disponibles (2021 → année actuelle)
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

  // Générer les mois d'une année spécifique
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
  const [selectedYear, setSelectedYear] = useState(() => {
    const [year] = currentMonth.split('-')
    return year
  })

  const { employees, loading, error, lastSyncDate, totals, refetch } = usePayfitSalaries(selectedMonth)
  
  // État pour la synchronisation
  const [isSyncing, setIsSyncing] = useState(false)

  // Fonction de synchronisation manuelle
  const handleManualSync = async () => {
    try {
      setIsSyncing(true)
      console.log('🔄 Début de la synchronisation Payfit...')
      
      const response = await fetch('/api/sync-payfit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'pennyboard_secret_key_2025'
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Synchronisation réussie:', result)
        
        // Actualiser les données après synchronisation
        await refetch()
        
        alert('✅ Synchronisation réussie ! Les données ont été mises à jour.')
      } else {
        const error = await response.json()
        console.error('❌ Erreur de synchronisation:', error)
        alert(`❌ Erreur de synchronisation: ${error.error || 'Erreur inconnue'}\n\nDétails: ${error.details || 'Aucun détail'}`)
      }
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error)
      alert('❌ Erreur lors de la synchronisation. Veuillez réessayer.')
    } finally {
      setIsSyncing(false)
    }
  }

  // Formater les montants
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Utiliser les totaux depuis la BDD ou calculer depuis les employés
  const totalSalaries = totals?.totalSalaries ?? employees.reduce((sum, emp) => sum + emp.totalSalary, 0)
  const totalContributions = totals?.totalContributions ?? employees.reduce((sum, emp) => sum + emp.totalContributions, 0)
  const totalCost = totals?.totalCost ?? (totalSalaries + totalContributions)

  // Formater la période
  const formatPeriod = () => {
    const [year, month] = selectedMonth.split('-')
    const monthNames = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ]
    const monthName = monthNames[parseInt(month) - 1]
    return `${monthName} ${year}`
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des données de salaires...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">Erreur de chargement</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold font-poppins text-gray-900">
            Salaires et cotisations
          </h1>
          <p className="text-gray-600 font-inter mt-2 text-lg">
            Détail des salaires et cotisations par collaborateur
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Sélecteurs de période */}
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-600" />
            
            {/* Sélecteur d'année */}
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value)
                setSelectedMonth(`${e.target.value}-01`)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-medium"
            >
              {generateAvailableYears().map((year) => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </select>

            {/* Sélecteur de mois */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-medium"
            >
              {generateMonthsForYear(selectedYear).map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Indicateur de synchronisation */}
      <div className={`border rounded-lg p-3 ${lastSyncDate ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {lastSyncDate ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700">Dernière synchronisation : {new Date(lastSyncDate).toLocaleString('fr-FR')}</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-yellow-700">Aucune synchronisation récente</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-3 py-1 text-white text-xs rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                lastSyncDate 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  Synchroniser l'API Payfit
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Salaires</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalSalaries)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cotisations</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalContributions)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Coût Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalCost)}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Liste des collaborateurs */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Détail par collaborateur - {formatPeriod()}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {employees.length} collaborateur{employees.length > 1 ? 's' : ''} trouvé{employees.length > 1 ? 's' : ''}
          </p>
        </div>

        {employees.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucune donnée de salaire trouvée pour cette période</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Collaborateur
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salaires
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cotisations
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee, index) => (
                  <tr key={`${employee.employeeName}-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.employeeName}
                      </div>
                      {employee.contractId && employee.contractId !== 'unknown' && (
                        <div className="text-xs text-gray-500">
                          Contrat: {employee.contractId.substring(0, 8)}...
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(employee.totalSalary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(employee.totalContributions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(employee.totalSalary + employee.totalContributions)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    Total
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(totalSalaries)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(totalContributions)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(totalCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Salaries

