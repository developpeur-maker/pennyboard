import React from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  icon?: React.ReactNode
  color?: 'green' | 'turquoise' | 'blue' | 'red' | 'cyan'
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  change, 
  changeType, 
  icon,
  color = 'green'
}) => {
  const colorClasses = {
    green: 'text-green-600',
    turquoise: 'text-cyan-600',
    blue: 'text-blue-600',
    red: 'text-red-600',
    cyan: 'text-cyan-600'
  }

  const bgColorClasses = {
    green: 'bg-green-50',
    turquoise: 'bg-cyan-50',
    blue: 'bg-blue-50',
    red: 'bg-red-50',
    cyan: 'bg-cyan-50'
  }

  return (
    <div className={`kpi-card ${bgColorClasses[color]} p-10 rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 min-h-[200px] flex flex-col justify-between`}>
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <p className="kpi-label text-xl font-semibold text-gray-700 mb-4">{title}</p>
          <p className={`kpi-value ${colorClasses[color]} text-5xl font-bold mb-6`}>
            {value}
          </p>
        </div>
        {icon && (
          <div className={`p-6 rounded-3xl ${bgColorClasses[color]} bg-opacity-60`}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {changeType === 'increase' ? (
          <ArrowUpRight className="w-6 h-6 text-green-600" />
        ) : changeType === 'decrease' ? (
          <ArrowDownRight className="w-6 h-6 text-red-500" />
        ) : null}
        {changeType !== 'neutral' && (
          <>
            <span className={`text-lg font-bold ${
              changeType === 'increase' ? 'text-green-600' : 'text-red-500'
            }`}>
              {Math.abs(change)}%
            </span>
            <span className="text-lg text-gray-600">vs mois dernier</span>
          </>
        )}
        {changeType === 'neutral' && (
          <span className="text-lg text-gray-500">Données non disponibles</span>
        )}
      </div>
    </div>
  )
}

export default KPICard

