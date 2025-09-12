import React from 'react'
import { 
  BarChart3, 
  FileText, 
  CreditCard, 
  TrendingUp, 
  Settings,
  CheckCircle
} from 'lucide-react'

interface SidebarProps {
  activeItem: string
  onItemClick: (item: string) => void
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem, onItemClick }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'reports', label: 'Rapports', icon: FileText },
    { id: 'expenses', label: 'Dépenses', icon: CreditCard },
    { id: 'revenue', label: 'Revenus', icon: TrendingUp },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ]

  return (
    <div className="w-64 bg-blue-800 h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-poppins text-white">PennyBoard</h1>
            <p className="text-xs text-white/60 font-inter">DIMO DIAGNOSTIC</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <button
                  onClick={() => onItemClick(item.id)}
                  className={`sidebar-item w-full text-left ${
                    activeItem === item.id ? 'active' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-white/60 font-inter">
          <p>Version 1.0.0</p>
          <p>© 2024 DIMO DIAGNOSTIC</p>
        </div>
      </div>
    </div>
  )
}

export default Sidebar

