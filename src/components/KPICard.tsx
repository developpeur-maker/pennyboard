import React from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface KPICardProps {
  title: string
  period?: string // Nouvelle prop pour la période
  subtitle?: string
  value: string
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  icon?: React.ReactNode
  color?: 'green' | 'turquoise' | 'blue' | 'red' | 'cyan'
  projection?: {
    value: string
    message: string
  }
  onClick?: () => void
  previousValue?: number | null // Valeur du mois précédent
  previousYearValue?: number | null // Valeur du même mois de l'année précédente
  previousYearChange?: number | null // Pourcentage de changement par rapport à l'année précédente
  previousYearChangeType?: 'increase' | 'decrease' | 'neutral' // Type de changement par rapport à l'année précédente
  formatCurrency?: (value: number) => string // Fonction pour formater la monnaie
  invertColors?: boolean // Si true, inverse les couleurs (augmentation = rouge, diminution = vert)
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  period,
  subtitle,
  value, 
  change, 
  changeType, 
  icon,
  color = 'green',
  projection,
  onClick,
  previousValue,
  previousYearValue,
  previousYearChange,
  previousYearChangeType,
  formatCurrency,
  invertColors = false
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
    <div 
      className={`kpi-card ${bgColorClasses[color]} p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 min-h-[220px] flex flex-col justify-between ${onClick ? 'cursor-pointer hover:scale-105' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <p className="kpi-label text-lg font-semibold text-gray-700 mb-2">
            {title}
            {period && <span className="text-sm font-normal text-gray-500 ml-2">{period}</span>}
          </p>
          {subtitle && (
            <p className="kpi-subtitle text-sm text-gray-500 mb-4">{subtitle}</p>
          )}
          <p className={`kpi-value ${colorClasses[color]} text-4xl font-bold mb-2 leading-tight`}>
            {value}
          </p>
          {projection && (
            <div className="mb-4">
              <p className="text-orange-600 text-xl font-semibold mb-1">
                {projection.value}
              </p>
              <p className="text-sm text-gray-600">
                {projection.message}
              </p>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-4 rounded-xl ${bgColorClasses[color]} bg-opacity-50 ml-4`}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {previousValue !== null && previousValue !== undefined && formatCurrency ? (
          <div className="flex items-center gap-2 flex-wrap">
            {(() => {
              const displayChangeType = invertColors 
                ? (changeType === 'increase' ? 'decrease' : changeType === 'decrease' ? 'increase' : 'neutral')
                : changeType
              return displayChangeType === 'increase' ? (
                <ArrowUpRight className={`w-4 h-4 ${invertColors ? 'text-red-500' : 'text-green-600'}`} />
              ) : displayChangeType === 'decrease' ? (
                <ArrowDownRight className={`w-4 h-4 ${invertColors ? 'text-green-600' : 'text-red-500'}`} />
              ) : (
                <span className="w-4 h-4"></span>
              )
            })()}
            <span className="text-sm text-gray-600">
              Par rapport au mois précédent : {formatCurrency(previousValue)}
            </span>
            {changeType !== 'neutral' && change !== 0 && (
              <span className={`text-sm font-semibold ${
                invertColors
                  ? (changeType === 'increase' ? 'text-red-500' : 'text-green-600')
                  : (changeType === 'increase' ? 'text-green-600' : 'text-red-500')
              }`}>
                ({change >= 0 ? '+' : ''}{change.toFixed(2)}%)
              </span>
            )}
          </div>
        ) : previousValue === null && previousYearValue === null ? (
          <span className="text-sm text-gray-400">Pas de données du mois précédent</span>
        ) : null}
        {previousYearValue !== null && previousYearValue !== undefined && formatCurrency ? (
          <div className="flex items-center gap-2 flex-wrap">
            {(() => {
              const displayChangeType = invertColors 
                ? (previousYearChangeType === 'increase' ? 'decrease' : previousYearChangeType === 'decrease' ? 'increase' : 'neutral')
                : previousYearChangeType
              return displayChangeType === 'increase' ? (
                <ArrowUpRight className={`w-4 h-4 ${invertColors ? 'text-red-500' : 'text-green-600'}`} />
              ) : displayChangeType === 'decrease' ? (
                <ArrowDownRight className={`w-4 h-4 ${invertColors ? 'text-green-600' : 'text-red-500'}`} />
              ) : (
                <span className="w-4 h-4"></span>
              )
            })()}
            <span className="text-sm text-gray-600">
              Par rapport au même mois année précédente : {formatCurrency(previousYearValue)}
            </span>
            {previousYearChangeType !== 'neutral' && previousYearChange !== null && previousYearChange !== undefined && previousYearChange !== 0 && (
              <span className={`text-sm font-semibold ${
                invertColors
                  ? (previousYearChangeType === 'increase' ? 'text-red-500' : 'text-green-600')
                  : (previousYearChangeType === 'increase' ? 'text-green-600' : 'text-red-500')
              }`}>
                ({previousYearChange >= 0 ? '+' : ''}{previousYearChange.toFixed(2)}%)
              </span>
            )}
          </div>
        ) : previousYearValue === null && previousValue === null ? (
          <span className="text-sm text-gray-400">Pas de données du même mois année précédente</span>
        ) : null}
      </div>
    </div>
  )
}

export default KPICard

