import React, { useState } from 'react'
import { 
  DollarSign, 
  CreditCard,
  RefreshCw,
  Calculator,
  PiggyBank,
  Calendar,
  Users,
  TrendingDown
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


  // Fonction pour générer la liste des années disponibles (2021 → année actuelle)
  const generateAvailableYears = () => {
    const years = []
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const startYear = 2021 // L'entreprise a débuté en 2021
    
    // Générer les années de 2021 jusqu'à l'année actuelle
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
    
    // Noms des mois en français
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]
    
    // Générer tous les mois de l'année (janvier à décembre)
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
  
  // Initialiser avec le mois en cours
  const currentMonth = getCurrentMonth()
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month')
  // Extraire l'année du mois en cours pour initialiser selectedYear
  const [selectedYear, setSelectedYear] = useState(() => {
    const [year] = currentMonth.split('-')
    return year
  })
  const [isChargesModalOpen, setIsChargesModalOpen] = useState(false)
  const [isChargesSansAmortissementsModalOpen, setIsChargesSansAmortissementsModalOpen] = useState(false)
  const [isChargesSalarialesModalOpen, setIsChargesSalarialesModalOpen] = useState(false)
  const [isRevenusModalOpen, setIsRevenusModalOpen] = useState(false)
  const [isTresorerieModalOpen, setIsTresorerieModalOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  // Déterminer si on affiche l'année complète ou un mois spécifique
  const isFullYear = viewMode === 'year' || selectedMonth.endsWith('-00')
  const actualSelectedMonth = isFullYear ? undefined : selectedMonth
  
  const { kpis, chargesBreakdown, chargesSansAmortissementsBreakdown, chargesSalarialesBreakdown, revenusBreakdown, tresorerieBreakdown, lastSyncDate, loading, error, refetch } = usePennylaneData(actualSelectedMonth, undefined, isFullYear ? 'year' : 'month', selectedYear)

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
          {/* Sélecteur conditionnel */}
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-600" />
            
            {/* Segmented control pour choisir le mode */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'month'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Mois
              </button>
              <button
                onClick={() => setViewMode('year')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'year'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Année
              </button>
            </div>

            {/* Sélecteur à deux niveaux : Année puis Mois */}
            <div className="flex items-center gap-2">
              {/* Sélecteur d'année */}
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value)
                  // Réinitialiser le mois sélectionné quand on change d'année
                  if (viewMode === 'month') {
                    setSelectedMonth(`${e.target.value}-01`)
                  }
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
              {viewMode === 'month' ? (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-medium"
                >
                  <option value={`${selectedYear}-00`}>Exercice complet</option>
                  {generateMonthsForYear(selectedYear).map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600 font-medium">
                  Exercice complet
                </div>
              )}
            </div>
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
                  Synchroniser l'API Pennylane
                </>
              )}
            </button>
            
          </div>
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
            title="Charges sans amortissements"
            period={formatPeriod()}
            subtitle="Coûts hors dotations"
            value={kpis && kpis.hasData && kpis.charges_sans_amortissements !== null ? formatCurrency(kpis.charges_sans_amortissements) : 'Aucune donnée'}
            change={0}
            changeType="neutral"
            icon={<TrendingDown className="w-5 h-5 text-indigo-600" />}
            color="blue"
            onClick={() => setIsChargesSansAmortissementsModalOpen(true)}
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

      {/* Modal de détail des charges sans amortissements */}
      <DetailModal
        isOpen={isChargesSansAmortissementsModalOpen}
        onClose={() => setIsChargesSansAmortissementsModalOpen(false)}
        title="Détail des Charges sans Amortissements"
        subtitle={formatPeriod()}
        items={chargesSansAmortissementsBreakdown}
        totalAmount={kpis?.charges_sans_amortissements || 0}
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
