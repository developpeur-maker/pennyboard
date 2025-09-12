import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import './index.css'

function App() {
  const [activeItem, setActiveItem] = useState('dashboard')

  const renderContent = () => {
    switch (activeItem) {
      case 'dashboard':
        return <Dashboard />
      case 'reports':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold font-poppins text-gray-900">Rapports</h1>
            <p className="text-gray-600 font-inter mt-2">Page des rapports en cours de développement...</p>
          </div>
        )
      case 'expenses':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold font-poppins text-gray-900">Dépenses</h1>
            <p className="text-gray-600 font-inter mt-2">Page des dépenses en cours de développement...</p>
          </div>
        )
      case 'revenue':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold font-poppins text-gray-900">Revenus</h1>
            <p className="text-gray-600 font-inter mt-2">Page des revenus en cours de développement...</p>
          </div>
        )
      case 'settings':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold font-poppins text-gray-900">Paramètres</h1>
            <p className="text-gray-600 font-inter mt-2">Page des paramètres en cours de développement...</p>
          </div>
        )
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  )
}

export default App

