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
    <div className={`kpi-card ${bgColorClasses[color]} p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <p className="kpi-label text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className={`kpi-value ${colorClasses[color]} text-3xl font-bold mb-3`}>
            {value}
          </p>
        </div>
        {icon && (
          <div className={`p-3 rounded-xl ${bgColorClasses[color]} bg-opacity-50`}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {changeType === 'increase' ? (
          <ArrowUpRight className="w-4 h-4 text-green-600" />
        ) : changeType === 'decrease' ? (
          <ArrowDownRight className="w-4 h-4 text-red-500" />
        ) : null}
        {changeType !== 'neutral' && (
          <>
            <span className={`text-sm font-semibold ${
              changeType === 'increase' ? 'text-green-600' : 'text-red-500'
            }`}>
              {Math.abs(change)}%
            </span>
            <span className="text-sm text-gray-500">vs mois dernier</span>
          </>
        )}
        {changeType === 'neutral' && (
          <span className="text-sm text-gray-400">Comparaison non disponible</span>
        )}
      </div>
    </div>
  )
}

export default KPICard

