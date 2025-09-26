import React, { useState } from 'react'
import { 
  DollarSign, 
  CreditCard,
  RefreshCw,
  Calculator,
  PiggyBank,
  Calendar,
  Users
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
  const [isChargesSalarialesModalOpen, setIsChargesSalarialesModalOpen] = useState(false)
  const [isRevenusModalOpen, setIsRevenusModalOpen] = useState(false)
  const [isTresorerieModalOpen, setIsTresorerieModalOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const { kpis, chargesBreakdown, chargesSalarialesBreakdown, revenusBreakdown, tresorerieBreakdown, lastSyncDate, loading, error, refetch } = usePennylaneData(selectedMonth, undefined, viewMode, selectedYear)

  // Debug pour les charges salariales
  console.log('🔍 Dashboard - chargesSalarialesBreakdown:', chargesSalarialesBreakdown)
  console.log('🔍 Dashboard - kpis.charges_salariales:', kpis?.charges_salariales)

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
  // const getHealthMessage = () => {
  //   if (!kpis || !kpis.hasData) return "Données en cours de chargement...";
    
  //   const resultat = kpis.resultat_net || 0;
  //   const tresorerie = kpis.solde_tresorerie || 0;
    
  //   if (resultat > 0 && tresorerie > 50000) {
  //     return `Excellente santé ! Vous avez généré ${formatCurrency(resultat)} de bénéfice ce mois-ci. 🎉`;
  //   } else if (resultat > 0) {
  //     return `Bonne performance ! ${formatCurrency(resultat)} de bénéfice ce mois-ci. 👍`;
  //   } else if (resultat < 0) {
  //     return `Attention : perte de ${formatCurrency(Math.abs(resultat))} ce mois-ci. 🔴`;
  //   }
  //   return "Situation équilibrée ce mois-ci. 📊";
  // };

  // Fonction pour formater les montants
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Fonction de synchronisation manuelle
  const handleManualSync = async () => {
    try {
      setIsSyncing(true)
      console.log('🔄 Début de la synchronisation manuelle...')
      
      const response = await fetch('/api/sync', {
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
        alert(`❌ Erreur de synchronisation: ${error.error || 'Erreur inconnue'}\n\nDétails: ${error.details || 'Aucun détail'}\nType: ${error.type || 'Inconnu'}`)
      }
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error)
      alert('❌ Erreur lors de la synchronisation. Veuillez réessayer.')
    } finally {
      setIsSyncing(false)
    }
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
                Synchroniser
              </>
            )}
          </button>
        </div>
      </div>


      {/* KPI Cards - Layout élargi pour mieux remplir l'écran */}
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <KPICard
            title="Ventes"
            period={formatPeriod()}
            subtitle="Prestations de services"
            value={kpis && kpis.hasData && kpis.ventes_706 !== null ? formatCurrency(kpis.ventes_706) : 'Aucune donnée'}
            change={kpis && kpis.hasData && kpis.ventes_growth !== null ? Math.abs(kpis.ventes_growth) : 0}
            changeType={kpis && kpis.hasData && kpis.ventes_growth !== null ? (kpis.ventes_growth >= 0 ? 'increase' : 'decrease') : 'neutral'}
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
            onClick={() => setIsRevenusModalOpen(true)}
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
            title="Rentabilité"
            period={formatPeriod()}
            subtitle={
              kpis && kpis.hasData && kpis.rentabilite
                ? (kpis.rentabilite.projection
                    ? `${formatCurrency(kpis.rentabilite.projection.montant)} - ${kpis.rentabilite.projection.message}`
                    : `${formatCurrency(kpis.rentabilite.montant)} - ${kpis.rentabilite.message}`
                  )
                : "En attente..."
            }
            value={
              kpis && kpis.hasData && kpis.rentabilite
                ? (kpis.rentabilite.projection
                    ? `${kpis.rentabilite.projection.ratio}%`
                    : `${kpis.rentabilite.ratio}%`
                  )
                : 'Aucune donnée'
            }
            change={0}
            changeType={
              kpis && kpis.hasData && kpis.rentabilite 
                ? (kpis.rentabilite.projection
                    ? (kpis.rentabilite.projection.ratio > 15 ? 'increase' : kpis.rentabilite.projection.ratio > 0 ? 'neutral' : 'decrease')
                    : (kpis.rentabilite.ratio > 15 ? 'increase' : kpis.rentabilite.ratio > 0 ? 'neutral' : 'decrease')
                  )
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
            onClick={() => setIsTresorerieModalOpen(true)}
          />
          <KPICard
            title="Masse Salariale"
            period={formatPeriod()}
            subtitle="Charges de personnel"
            value={kpis && kpis.hasData && kpis.charges_salariales !== null ? formatCurrency(kpis.charges_salariales) : 'Aucune donnée'}
            change={0}
            changeType="neutral"
            icon={<Users className="w-5 h-5 text-orange-600" />}
            color="red"
            onClick={() => setIsChargesSalarialesModalOpen(true)}
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

      {/* Modal de détail des charges salariales */}
      <DetailModal
        isOpen={isChargesSalarialesModalOpen}
        onClose={() => setIsChargesSalarialesModalOpen(false)}
        title="Détail de la Masse Salariale"
        subtitle={formatPeriod()}
        items={chargesSalarialesBreakdown}
        totalAmount={kpis?.charges_salariales || 0}
      />

      {/* Modal de détail des revenus */}
      <DetailModal
        isOpen={isRevenusModalOpen}
        onClose={() => setIsRevenusModalOpen(false)}
        title="Détail des Revenus Totaux"
        subtitle={formatPeriod()}
        items={revenusBreakdown}
        totalAmount={kpis?.total_produits_exploitation || 0}
      />

      {/* Modal de détail de la trésorerie */}
      <DetailModal
        isOpen={isTresorerieModalOpen}
        onClose={() => setIsTresorerieModalOpen(false)}
        title="Détail de la Trésorerie"
        subtitle={formatPeriod()}
        items={tresorerieBreakdown}
        totalAmount={kpis?.solde_tresorerie || 0}
      />
    </div>
  )
}

export default Dashboard
