import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Salaries from './pages/Salaries'
import './index.css'

type Page = 'dashboard' | 'salaries'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation par onglets */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-1">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                currentPage === 'dashboard'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tableau de bord
            </button>
            <button
              onClick={() => setCurrentPage('salaries')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                currentPage === 'salaries'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Salaires et cotisations
            </button>
          </div>
        </div>
      </div>

      {/* Contenu de la page */}
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'salaries' && <Salaries />}
    </div>
  )
}

export default App

