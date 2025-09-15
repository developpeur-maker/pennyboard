import React, { useState } from 'react'
import { 
  DollarSign, 
  CreditCard,
  RefreshCw,
  Calculator,
  PiggyBank,
  Calendar,
  FileText
} from 'lucide-react'
import KPICard from '../components/KPICard'
import { usePennylaneData } from '../hooks/usePennylaneData'

interface DashboardProps {
  onNavigate?: (page: string) => void
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [selectedMonth, setSelectedMonth] = useState('2025-09')
  const { kpis, loading, error, refetch } = usePennylaneData(selectedMonth)

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
            Tableau de bord DIMO DIAGNOSTIC
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Sélecteur de mois */}
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
          <button
            onClick={() => onNavigate?.('income-statement')}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <FileText className="w-5 h-5" />
            Compte de Résultat
          </button>
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <RefreshCw className="w-5 h-5" />
            Actualiser
          </button>
        </div>
      </div>

      {/* KPI Cards - Layout centré et propre */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <KPICard
            title="Ventes"
            subtitle="Chiffre d'affaires net"
            value={kpis && kpis.hasData && kpis.chiffre_affaires !== null ? formatCurrency(kpis.chiffre_affaires) : 'Aucune donnée'}
            change={kpis && kpis.hasData && kpis.growth !== null ? Math.abs(kpis.growth) : 0}
            changeType={kpis && kpis.hasData && kpis.growth !== null && kpis.growth >= 0 ? 'increase' : 'decrease'}
            icon={<DollarSign className="w-5 h-5 text-green-600" />}
            color="green"
          />
          <KPICard
            title="Revenus Totaux"
            subtitle="Tous les produits"
            value={kpis && kpis.hasData && kpis.total_produits_exploitation !== null ? formatCurrency(kpis.total_produits_exploitation) : 'Aucune donnée'}
            change={0}
            changeType="neutral"
            icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
            color="green"
          />
          <KPICard
            title="Achats & Charges"
            subtitle="Coûts d'exploitation"
            value={kpis && kpis.hasData && kpis.charges !== null ? formatCurrency(kpis.charges) : 'Aucune donnée'}
            change={0}
            changeType="neutral"
            icon={<CreditCard className="w-5 h-5 text-red-600" />}
            color="red"
          />
          <KPICard
            title="Bénéfice"
            subtitle="Résultat net"
            value={kpis && kpis.hasData && kpis.resultat_net !== null ? formatCurrency(kpis.resultat_net) : 'Aucune donnée'}
            change={0}
            changeType="neutral"
            icon={<Calculator className="w-5 h-5 text-blue-600" />}
            color="blue"
          />
          <KPICard
            title="Trésorerie"
            subtitle="Liquidités disponibles"
            value={kpis && kpis.hasData && kpis.solde_tresorerie !== null ? formatCurrency(kpis.solde_tresorerie) : 'Aucune donnée'}
            change={0}
            changeType="neutral"
            icon={<PiggyBank className="w-5 h-5 text-cyan-600" />}
            color="cyan"
          />
        </div>
      </div>
    </div>
  )
}

export default Dashboard
