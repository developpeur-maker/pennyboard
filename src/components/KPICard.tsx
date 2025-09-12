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
    <div className={`kpi-card ${bgColorClasses[color]} p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="kpi-label text-lg font-medium text-gray-600 mb-3">{title}</p>
          <p className={`kpi-value ${colorClasses[color]} text-3xl font-bold mb-4`}>
            {value}
          </p>
          <div className="flex items-center gap-2">
            {changeType === 'increase' ? (
              <ArrowUpRight className="w-5 h-5 text-green-600" />
            ) : changeType === 'decrease' ? (
              <ArrowDownRight className="w-5 h-5 text-red-500" />
            ) : null}
            {changeType !== 'neutral' && (
              <>
                <span className={`text-base font-semibold ${
                  changeType === 'increase' ? 'text-green-600' : 'text-red-500'
                }`}>
                  {Math.abs(change)}%
                </span>
                <span className="text-base text-gray-500">vs mois dernier</span>
              </>
            )}
            {changeType === 'neutral' && (
              <span className="text-base text-gray-500">Données non disponibles</span>
            )}
          </div>
        </div>
        {icon && (
          <div className={`p-4 rounded-2xl ${bgColorClasses[color]} bg-opacity-50`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

export default KPICard

