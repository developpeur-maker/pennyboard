import React from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  icon?: React.ReactNode
  color?: 'green' | 'turquoise' | 'blue'
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
    blue: 'text-blue-800'
  }

  const bgColorClasses = {
    green: 'bg-green-50',
    turquoise: 'bg-cyan-50',
    blue: 'bg-blue-50'
  }

  return (
    <div className={`kpi-card ${bgColorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="kpi-label">{title}</p>
          <p className={`kpi-value ${colorClasses[color]} mt-2`}>
            {value}
          </p>
          <div className="flex items-center gap-1 mt-2">
            {changeType === 'increase' ? (
              <ArrowUpRight className="w-4 h-4 text-green-600" />
            ) : changeType === 'decrease' ? (
              <ArrowDownRight className="w-4 h-4 text-red-500" />
            ) : null}
            {changeType !== 'neutral' && (
              <>
                <span className={`text-sm font-medium ${
                  changeType === 'increase' ? 'text-green-600' : 'text-red-500'
                }`}>
                  {Math.abs(change)}%
                </span>
                <span className="text-sm text-gray-500">vs mois dernier</span>
              </>
            )}
            {changeType === 'neutral' && (
              <span className="text-sm text-gray-500">Données non disponibles</span>
            )}
          </div>
        </div>
        {icon && (
          <div className={`p-3 rounded-xl ${bgColorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

export default KPICard

