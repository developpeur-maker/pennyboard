import React from 'react'
import { 
  DollarSign, 
  CreditCard,
  RefreshCw,
  Calculator,
  PiggyBank
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts'
import KPICard from '../components/KPICard'
import ChartCard from '../components/ChartCard'
import { usePennylaneData } from '../hooks/usePennylaneData'

const Dashboard: React.FC = () => {
  const { kpis, resultatComptable, tresorerie, loading, error, refetch } = usePennylaneData()

  // Transformer les données pour les graphiques
  const resultatData = resultatComptable.map(item => ({
    month: new Date(item.period).toLocaleDateString('fr-FR', { month: 'short' }),
    chiffre_affaires: item.chiffre_affaires,
    charges: item.charges,
    resultat_net: item.resultat_net
  }))

  const tresorerieData = tresorerie.map(item => ({
    month: new Date(item.period).toLocaleDateString('fr-FR', { month: 'short' }),
    solde_final: item.solde_final,
    encaissements: item.encaissements,
    decaissements: item.decaissements
  }))

  const pieData = [
    { name: 'Chiffre d\'affaires', value: kpis?.chiffre_affaires || 0, color: '#16a34a' },
    { name: 'Charges', value: kpis?.charges || 0, color: '#dc2626' },
    { name: 'Résultat net', value: kpis?.resultat_net || 0, color: '#0891b2' },
  ]

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
          <h1 className="text-3xl font-bold font-poppins text-gray-900">
            Dashboard
          </h1>
          <p className="text-gray-600 font-inter mt-2">
            Vue d'ensemble de votre activité DIMO DIAGNOSTIC
          </p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Chiffre d'Affaires"
          value={kpis && kpis.hasData && kpis.chiffre_affaires !== null ? formatCurrency(kpis.chiffre_affaires) : 'Aucune donnée'}
          change={kpis && kpis.hasData && kpis.growth !== null ? Math.abs(kpis.growth) : 0}
          changeType={kpis && kpis.hasData && kpis.growth !== null && kpis.growth >= 0 ? 'increase' : 'decrease'}
          icon={<DollarSign className="w-6 h-6 text-green-600" />}
          color="green"
        />
        <KPICard
          title="Charges"
          value={kpis && kpis.hasData && kpis.charges !== null ? formatCurrency(kpis.charges) : 'Aucune donnée'}
          change={0}
          changeType="neutral"
          icon={<CreditCard className="w-6 h-6 text-red-600" />}
          color="turquoise"
        />
        <KPICard
          title="Résultat Net"
          value={kpis && kpis.hasData && kpis.resultat_net !== null ? formatCurrency(kpis.resultat_net) : 'Aucune donnée'}
          change={0}
          changeType="neutral"
          icon={<Calculator className="w-6 h-6 text-blue-600" />}
          color="green"
        />
        <KPICard
          title="Trésorerie"
          value={kpis && kpis.hasData && kpis.solde_tresorerie !== null ? formatCurrency(kpis.solde_tresorerie) : 'Aucune donnée'}
          change={0}
          changeType="neutral"
          icon={<PiggyBank className="w-6 h-6 text-cyan-600" />}
          color="blue"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Résultat Comptable Chart */}
        <ChartCard title="Résultat Comptable" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={resultatData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="chiffre_affaires" 
                stroke="#16a34a" 
                strokeWidth={3}
                dot={{ fill: '#16a34a', strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: '#16a34a', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="charges" 
                stroke="#dc2626" 
                strokeWidth={3}
                dot={{ fill: '#dc2626', strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: '#dc2626', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="resultat_net" 
                stroke="#0891b2" 
                strokeWidth={3}
                dot={{ fill: '#0891b2', strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: '#0891b2', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Trésorerie Chart */}
        <ChartCard title="Évolution de la Trésorerie">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={tresorerieData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }} 
              />
              <Bar 
                dataKey="solde_final" 
                fill="#0891b2" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Répartition des Flux */}
        <ChartCard title="Répartition des Flux">
          <ResponsiveContainer width="100%" height={250}>
            <RechartsPieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }} 
              />
            </RechartsPieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {pieData.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-600">{item.name}</span>
                <span className="ml-auto font-medium">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}

export default Dashboard
