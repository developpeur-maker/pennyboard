import React from 'react'
import { X } from 'lucide-react'

interface DetailItem {
  code: string
  label: string
  description: string
  amount: number
}

interface DetailModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle: string
  items: DetailItem[]
  totalAmount: number
}

const DetailModal: React.FC<DetailModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  items,
  totalAmount
}) => {
  if (!isOpen) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-600">{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucune donnée disponible pour cette période
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {item.label}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        {item.description}
                      </div>
                      <div className="text-xs text-gray-500">
                        Compte {item.code}
                      </div>
                    </div>
                    <div className="font-semibold text-lg text-gray-900">
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="font-bold text-xl text-gray-900">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetailModal
