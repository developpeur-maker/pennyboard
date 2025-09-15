import React, { useState } from 'react'
import { 
  Calendar,
  RefreshCw,
  ArrowLeft,
  FileText
} from 'lucide-react'
import { usePennylaneData } from '../hooks/usePennylaneData'

interface IncomeStatementProps {
  onNavigate?: (page: string) => void
}

const IncomeStatement: React.FC<IncomeStatementProps> = ({ onNavigate }) => {
  const [selectedMonth, setSelectedMonth] = useState('2025-09')
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>('')
  const [viewMode, setViewMode] = useState<'month' | 'fiscal-year'>('month')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const { loading, error, refetch, incomeStatement, fiscalYears } = usePennylaneData(selectedMonth, selectedFiscalYear)

  // Fonction pour formater les montants sans devise (pour les tableaux)
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Fonction pour obtenir le nom du mois précédent
  const getPreviousMonthName = (selectedMonth: string) => {
    const [year, month] = selectedMonth.split('-')
    const currentDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const previousDate = new Date(currentDate)
    previousDate.setMonth(previousDate.getMonth() - 1)
    
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]
    
    return `${monthNames[previousDate.getMonth()]} ${previousDate.getFullYear()}`
  }

  // Fonction pour obtenir le nom du mois actuel
  const getCurrentMonthName = (selectedMonth: string) => {
    const [year, month] = selectedMonth.split('-')
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]
    
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  // Fonction pour basculer l'expansion d'une ligne
  const toggleRowExpansion = (rowId: string) => {
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(rowId)) {
      newExpandedRows.delete(rowId)
    } else {
      newExpandedRows.add(rowId)
    }
    setExpandedRows(newExpandedRows)
  }

  // Fonction helper pour rendre une ligne du tableau avec comparaisons
  const renderTableRow = (label: string, data: any, isTotal: boolean = false, rowId?: string, hasDetails: boolean = false) => {
    if (!incomeStatement || !data) {
      return (
        <tr>
          <td className={`px-6 py-4 ${isTotal ? 'pl-4' : 'pl-8'} text-sm ${isTotal ? 'font-bold' : ''} text-gray-700`}>
            {label}
          </td>
          <td className="px-6 py-4 text-sm text-gray-900 text-right">N/A</td>
          <td className="px-6 py-4 text-sm text-gray-900 text-right">N/A</td>
          <td className="px-6 py-4 text-sm text-gray-900 text-right">N/A</td>
        </tr>
      )
    }

    const variationColor = data.variation > 0 ? 'text-green-600' : data.variation < 0 ? 'text-red-600' : 'text-gray-900'
    const isExpanded = rowId ? expandedRows.has(rowId) : false

    return (
      <>
        <tr 
          className={`${hasDetails ? 'cursor-pointer hover:bg-gray-50' : ''}`}
          onClick={hasDetails && rowId ? () => toggleRowExpansion(rowId) : undefined}
        >
          <td className={`px-6 py-4 ${isTotal ? 'pl-4' : 'pl-8'} text-sm ${isTotal ? 'font-bold' : ''} text-gray-700`}>
            <div className="flex items-center">
              {hasDetails && (
                <span className="mr-2 text-gray-400">
                  {isExpanded ? '▼' : '▶'}
                </span>
              )}
              {label}
            </div>
          </td>
          <td className={`px-6 py-4 text-sm ${isTotal ? 'font-bold' : ''} text-gray-900 text-right`}>
            {formatAmount(data.current)}
          </td>
          <td className={`px-6 py-4 text-sm ${isTotal ? 'font-bold' : ''} text-gray-900 text-right`}>
            {formatAmount(data.previous)}
          </td>
          <td className={`px-6 py-4 text-sm ${isTotal ? 'font-bold' : ''} text-right font-medium ${variationColor}`}>
            {formatAmount(data.variation)}
          </td>
        </tr>
        
        {/* Lignes de détail si expandées */}
        {hasDetails && isExpanded && data.details && data.details.length > 0 && (
          <>
            {data.details.map((detail: any, index: number) => (
              <tr key={`${rowId}-detail-${index}`} className="bg-gray-50">
                <td className="px-6 py-2 pl-16 text-xs text-gray-600">
                  {detail.number} - {detail.name}
                </td>
                <td className="px-6 py-2 text-xs text-gray-900 text-right">
                  {formatAmount(detail.current)}
                </td>
                <td className="px-6 py-2 text-xs text-gray-900 text-right">
                  {formatAmount(detail.previous)}
                </td>
                <td className={`px-6 py-2 text-xs text-right font-medium ${
                  detail.variation > 0 ? 'text-green-600' : detail.variation < 0 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {formatAmount(detail.variation)}
                </td>
              </tr>
            ))}
          </>
        )}
      </>
    )
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement du compte de résultat...</p>
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
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate?.('dashboard')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <div>
            <h1 className="text-4xl font-bold font-poppins text-gray-900 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              Compte de Résultat
            </h1>
            <p className="text-gray-600 font-inter mt-2 text-lg">
              DIMO DIAGNOSTIC - Vue détaillée
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Mode de vue */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Vue :</span>
            <div className="flex rounded-lg shadow-sm">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-2 text-sm font-medium rounded-l-lg border ${
                  viewMode === 'month'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setViewMode('fiscal-year')}
                className={`px-3 py-2 text-sm font-medium rounded-r-lg border ${
                  viewMode === 'fiscal-year'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Exercice
              </button>
            </div>
          </div>

          {/* Sélecteur selon le mode */}
          {viewMode === 'month' ? (
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-medium"
              >
                <option value="2025-09">Septembre 2025</option>
                <option value="2025-08">Août 2025</option>
                <option value="2025-07">Juillet 2025</option>
                <option value="2025-06">Juin 2025</option>
                <option value="2025-05">Mai 2025</option>
                <option value="2025-04">Avril 2025</option>
                <option value="2025-03">Mars 2025</option>
                <option value="2025-02">Février 2025</option>
                <option value="2025-01">Janvier 2025</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <select
                value={selectedFiscalYear}
                onChange={(e) => setSelectedFiscalYear(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-medium"
              >
                <option value="">Sélectionner un exercice</option>
                {fiscalYears.map((fy) => (
                  <option key={fy.id} value={fy.id}>
                    {fy.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={refetch}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <RefreshCw className="w-5 h-5" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Compte de Résultat */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          {/* En-tête du tableau */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Compte de Résultat - {
                viewMode === 'month' 
                  ? getCurrentMonthName(selectedMonth)
                  : selectedFiscalYear 
                    ? fiscalYears.find(fy => fy.id === selectedFiscalYear)?.name || 'Exercice sélectionné'
                    : 'Période sélectionnée'
              }
            </h2>
          </div>

          {/* Tableau du compte de résultat */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Postes
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {viewMode === 'month' 
                      ? getCurrentMonthName(selectedMonth)
                      : selectedFiscalYear 
                        ? fiscalYears.find(fy => fy.id === selectedFiscalYear)?.name || 'Exercice actuel'
                        : 'Période actuelle'
                    }
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {viewMode === 'month' 
                      ? getPreviousMonthName(selectedMonth)
                      : 'Exercice précédent'
                    }
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variation (€)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* PRODUITS D'EXPLOITATION */}
                <tr className="bg-blue-50">
                  <td className="px-6 py-4 text-sm font-semibold text-blue-900">
                    PRODUITS D'EXPLOITATION
                  </td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                </tr>
                
                {renderTableRow('Vente de marchandises', incomeStatement?.produits.vente_marchandises)}
                {renderTableRow('Production vendue de biens', incomeStatement?.produits.production_vendue_biens)}
                {renderTableRow('Production vendue de services', incomeStatement?.produits.production_vendue_services)}
                {renderTableRow('MONTANT NET DU CHIFFRE D\'AFFAIRES', incomeStatement?.produits.montant_net_ca, true)}

                {renderTableRow('Production stockée', incomeStatement?.produits.production_stockee)}
                {renderTableRow('Production immobilisée', incomeStatement?.produits.production_immobilisee)}
                {renderTableRow('Subventions', incomeStatement?.produits.subventions)}
                {renderTableRow('Reprises sur amortissements, dépréciations et provisions', incomeStatement?.produits.reprises_amortissements)}
                {renderTableRow('Autres produits', incomeStatement?.produits.autres_produits)}
                {renderTableRow('TOTAL DES PRODUITS D\'EXPLOITATION (I)', incomeStatement?.produits.total_produits_exploitation, true)}

                {/* CHARGES D'EXPLOITATION */}
                <tr className="bg-red-50">
                  <td className="px-6 py-4 text-sm font-semibold text-red-900">
                    CHARGES D'EXPLOITATION
                  </td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                </tr>

                {renderTableRow('Achats de marchandises', incomeStatement?.charges.achats_marchandises)}
                {renderTableRow(
                  'Autres achats et charges externes', 
                  incomeStatement?.charges.autres_achats_charges_externes, 
                  false, 
                  'autres-achats-charges-externes',
                  true
                )}
                {renderTableRow(
                  'Impôts, taxes, et versements assimilés', 
                  incomeStatement?.charges.impots_taxes,
                  false,
                  'impots-taxes',
                  true
                )}
                {renderTableRow(
                  'Salaires', 
                  incomeStatement?.charges.salaires,
                  false,
                  'salaires',
                  true
                )}
                {renderTableRow(
                  'Cotisations sociales', 
                  incomeStatement?.charges.cotisations_sociales,
                  false,
                  'cotisations-sociales',
                  true
                )}
                {renderTableRow('Dotations aux amortissements et aux provisions', incomeStatement?.charges.dotations_amortissements)}
                {renderTableRow(
                  'Autres charges', 
                  incomeStatement?.charges.autres_charges,
                  false,
                  'autres-charges',
                  true
                )}
                {renderTableRow('TOTAL DES CHARGES D\'EXPLOITATION (II)', incomeStatement?.charges.total_charges_exploitation, true)}
                {renderTableRow('RÉSULTAT D\'EXPLOITATION (I - II)', incomeStatement?.resultat_exploitation, true)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IncomeStatement
