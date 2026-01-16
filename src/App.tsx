import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import Dashboard from './pages/Dashboard'
import Salaries from './pages/Salaries'
import Statistics from './pages/Statistics'
import Breakeven from './pages/Breakeven'
import Login from './pages/Login'
import { LogOut } from 'lucide-react'
import './index.css'

type Page = 'dashboard' | 'salaries' | 'statistics' | 'breakeven'

function App() {
  const { isAuthenticated, loading, logout } = useAuth()
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

  // Afficher la page de login si non authentifié
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation par onglets */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
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
              <button
                onClick={() => setCurrentPage('statistics')}
                className={`px-6 py-4 text-sm font-medium transition-colors ${
                  currentPage === 'statistics'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Statistiques
              </button>
              <button
                onClick={() => setCurrentPage('breakeven')}
                className={`px-6 py-4 text-sm font-medium transition-colors ${
                  currentPage === 'breakeven'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Seuil de rentabilité
              </button>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* Contenu de la page */}
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'salaries' && <Salaries />}
      {currentPage === 'statistics' && <Statistics />}
      {currentPage === 'breakeven' && <Breakeven />}
    </div>
  )
}

export default App

