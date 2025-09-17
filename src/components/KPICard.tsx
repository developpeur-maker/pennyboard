import React from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface KPICardProps {
  title: string
  subtitle?: string
  value: string
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  icon?: React.ReactNode
  color?: 'green' | 'turquoise' | 'blue' | 'red' | 'cyan'
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  subtitle,
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
    <div className={`kpi-card ${bgColorClasses[color]} p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 min-h-[220px] flex flex-col justify-between`}>
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <p className="kpi-label text-lg font-semibold text-gray-700 mb-2">{title}</p>
          {subtitle && (
            <p className="kpi-subtitle text-sm text-gray-500 mb-4">{subtitle}</p>
          )}
          <p className={`kpi-value ${colorClasses[color]} text-4xl font-bold mb-4 leading-tight`}>
            {value}
          </p>
        </div>
        {icon && (
          <div className={`p-4 rounded-xl ${bgColorClasses[color]} bg-opacity-50 ml-4`}>
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
        {changeType !== 'neutral' && change !== 0 && (
          <>
            <span className={`text-sm font-semibold ${
              changeType === 'increase' ? 'text-green-600' : 'text-red-500'
            }`}>
              {changeType === 'increase' ? '+' : ''}{change.toFixed(2)}%
            </span>
            <span className="text-sm text-gray-500">
              {changeType === 'increase' ? 'en hausse' : 'en baisse'} vs le mois dernier
            </span>
          </>
        )}
        {(changeType === 'neutral' || change === 0) && (
          <span className="text-sm text-gray-400">Pas de données du mois précédent</span>
        )}
      </div>
    </div>
  )
}

export default KPICard

