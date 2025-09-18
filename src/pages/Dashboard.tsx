import React, { useState } from 'react'
import { 
  DollarSign, 
  CreditCard,
  RefreshCw,
  Calculator,
  PiggyBank,
  Calendar
} from 'lucide-react'
import KPICard from '../components/KPICard'
import DetailModal from '../components/DetailModal'
import { usePennylaneData } from '../hooks/usePennylaneData'

const Dashboard: React.FC = () => {
  // Fonction pour obtenir le mois en cours basé sur la date du jour
  const getCurrentMonth = () => {
    const today = new Date() // Date du jour 
    const year = today.getFullYear() // 2025
    const month = today.getMonth() + 1 // getMonth() retourne 0-11, donc +1 pour avoir 1-12
    const monthFormatted = month.toString().padStart(2, '0') // Format "09" pour septembre
    
    console.log('Date du jour:', today.toLocaleDateString('fr-FR'))
    console.log('Mois en cours détecté:', `${year}-${monthFormatted}`)
    
    return `${year}-${monthFormatted}`
  }
  
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month')
  const [selectedYear, setSelectedYear] = useState('2025')
  const [isChargesModalOpen, setIsChargesModalOpen] = useState(false)
  const { kpis, chargesBreakdown, loading, error, refetch } = usePennylaneData(selectedMonth, undefined, viewMode, selectedYear)

  // Fonction pour formater la période affichée
  const formatPeriod = () => {
    if (viewMode === 'year') {
      return `exercice ${selectedYear}`
    } else {
      const [year, month] = selectedMonth.split('-')
      const monthNames = [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
      ]
      const monthName = monthNames[parseInt(month) - 1]
      return `${monthName} ${year}`
    }
  }

  // Fonction pour obtenir le message de santé financière
  const getHealthMessage = () => {
    if (!kpis || !kpis.hasData) return "Données en cours de chargement...";
    
    const resultat = kpis.resultat_net || 0;
    const tresorerie = kpis.solde_tresorerie || 0;
    
    if (resultat > 0 && tresorerie > 50000) {
      return `Excellente santé ! Vous avez généré ${formatCurrency(resultat)} de bénéfice ce mois-ci. 🎉`;
    } else if (resultat > 0) {
      return `Bonne performance ! ${formatCurrency(resultat)} de bénéfice ce mois-ci. 👍`;
    } else if (resultat < 0) {
      return `Attention : perte de ${formatCurrency(Math.abs(resultat))} ce mois-ci. 🔴`;
    }
    return "Situation équilibrée ce mois-ci. 📊";
  };

  // Fonction pour formater les montants
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }


  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des données Pennylane...</p>
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
            PennyBoard
          </h1>
          <p className="text-gray-600 font-inter mt-2 text-lg">
            Tableau de bord Entreprise 
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Toggle Vue mensuelle / annuelle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mois
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'year'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Année
            </button>
          </div>

          {/* Sélecteur conditionnel */}
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-600" />
            {viewMode === 'month' ? (
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
            ) : (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-medium"
              >
                <option value="2025">Année 2025</option>
                <option value="2024">Année 2024</option>
                <option value="2023">Année 2023</option>
              </select>
            )}
          </div>
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <RefreshCw className="w-5 h-5" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Message de santé financière */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-lg mb-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">ℹ️</span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-blue-900">
              {getHealthMessage()}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards - Layout élargi pour mieux remplir l'écran */}
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <KPICard
            title="Ventes"
            period={formatPeriod()}
            subtitle="Chiffre d'affaires net"
            value={kpis && kpis.hasData && kpis.chiffre_affaires !== null ? formatCurrency(kpis.chiffre_affaires) : 'Aucune donnée'}
            change={kpis && kpis.hasData && kpis.ca_growth !== null ? Math.abs(kpis.ca_growth) : 0}
            changeType={kpis && kpis.hasData && kpis.ca_growth !== null ? (kpis.ca_growth >= 0 ? 'increase' : 'decrease') : 'neutral'}
            icon={<DollarSign className="w-5 h-5 text-green-600" />}
            color="green"
          />
          <KPICard
            title="Revenus Totaux"
            period={formatPeriod()}
            subtitle="Tous les produits"
            value={kpis && kpis.hasData && kpis.total_produits_exploitation !== null ? formatCurrency(kpis.total_produits_exploitation) : 'Aucune donnée'}
            change={kpis && kpis.hasData && kpis.total_produits_growth !== null ? Math.abs(kpis.total_produits_growth) : 0}
            changeType={kpis && kpis.hasData && kpis.total_produits_growth !== null ? (kpis.total_produits_growth >= 0 ? 'increase' : 'decrease') : 'neutral'}
            icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
            color="green"
          />
          <KPICard
            title="Achats & Charges"
            period={formatPeriod()}
            subtitle="Coûts d'exploitation"
            value={kpis && kpis.hasData && kpis.charges !== null ? formatCurrency(kpis.charges) : 'Aucune donnée'}
            change={kpis && kpis.hasData && kpis.charges_growth !== null ? Math.abs(kpis.charges_growth) : 0}
            changeType={kpis && kpis.hasData && kpis.charges_growth !== null ? (kpis.charges_growth >= 0 ? 'increase' : 'decrease') : 'neutral'}
            icon={<CreditCard className="w-5 h-5 text-red-600" />}
            color="red"
            onClick={() => setIsChargesModalOpen(true)}
          />
          <KPICard
            title="Bénéfice"
            period={formatPeriod()}
            subtitle="Résultat net"
            value={kpis && kpis.hasData && kpis.resultat_net !== null ? formatCurrency(kpis.resultat_net) : 'Aucune donnée'}
            change={kpis && kpis.hasData && kpis.resultat_growth !== null ? Math.abs(kpis.resultat_growth) : 0}
            changeType={kpis && kpis.hasData && kpis.resultat_growth !== null ? (kpis.resultat_growth >= 0 ? 'increase' : 'decrease') : 'neutral'}
            icon={<Calculator className="w-5 h-5 text-blue-600" />}
            color="blue"
          />
          <KPICard
            title="Rentabilité"
            period={formatPeriod()}
            subtitle={kpis && kpis.hasData && kpis.rentabilite ? kpis.rentabilite.message : "En attente..."}
            value={kpis && kpis.hasData && kpis.rentabilite ? `${kpis.rentabilite.ratio}% (${formatCurrency(kpis.rentabilite.montant)})` : 'Aucune donnée'}
            projection={
              kpis && kpis.hasData && kpis.rentabilite?.projection 
                ? {
                    value: `${kpis.rentabilite.projection.ratio}% (projection)`,
                    message: kpis.rentabilite.projection.message
                  }
                : undefined
            }
            change={0}
            changeType={
              kpis && kpis.hasData && kpis.rentabilite 
                ? (kpis.rentabilite.ratio > 15 ? 'increase' : kpis.rentabilite.ratio > 0 ? 'neutral' : 'decrease')
                : 'neutral'
            }
            icon={<Calculator className="w-5 h-5 text-purple-600" />}
            color="turquoise"
          />
          <KPICard
            title="Trésorerie"
            period={formatPeriod()}
            subtitle="Liquidités disponibles"
            value={kpis && kpis.hasData && kpis.solde_tresorerie !== null ? formatCurrency(kpis.solde_tresorerie) : 'Aucune donnée'}
            change={kpis && kpis.hasData && kpis.tresorerie_growth !== null ? Math.abs(kpis.tresorerie_growth) : 0}
            changeType={kpis && kpis.hasData && kpis.tresorerie_growth !== null ? (kpis.tresorerie_growth >= 0 ? 'increase' : 'decrease') : 'neutral'}
            icon={<PiggyBank className="w-5 h-5 text-cyan-600" />}
            color="cyan"
          />
        </div>
      </div>

      {/* Modal de détail des charges */}
      <DetailModal
        isOpen={isChargesModalOpen}
        onClose={() => setIsChargesModalOpen(false)}
        title="Détail des Achats & Charges"
        subtitle={formatPeriod()}
        items={chargesBreakdown}
        totalAmount={kpis?.charges || 0}
      />
    </div>
  )
}

export default Dashboard
