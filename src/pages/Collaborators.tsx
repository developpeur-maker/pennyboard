import { useState } from 'react'
import { Users, Search, Filter, RefreshCw } from 'lucide-react'
import { usePayfitData } from '../hooks/usePayfitData'
import { CollaboratorsList } from '../components/CollaboratorsList'

export default function Collaborators() {
  const [searchEmail, setSearchEmail] = useState('')
  const [includeInProgress, setIncludeInProgress] = useState(false)
  const [maxResults, setMaxResults] = useState(10)

  // Utiliser l'ID de l'entreprise depuis les variables d'environnement
  const companyId = process.env.NEXT_PUBLIC_PAYFIT_COMPANY_ID || 'default-company-id'

  const { 
    collaborators, 
    loading, 
    error, 
    hasMore, 
    loadMore, 
    refresh 
  } = usePayfitData(companyId, {
    maxResults,
    includeInProgressContracts: includeInProgress,
    email: searchEmail || undefined
  })

  const handleSearch = () => {
    refresh()
  }

  const handleClearSearch = () => {
    setSearchEmail('')
    refresh()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold font-poppins text-gray-900">
            Collaborateurs
          </h1>
          <p className="text-gray-600 font-inter mt-2 text-lg">
            Gestion des employés avec Payfit
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filtres</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recherche par email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher par email
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="email@exemple.com"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Rechercher
              </button>
            </div>
            {searchEmail && (
              <button
                onClick={handleClearSearch}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Effacer la recherche
              </button>
            )}
          </div>

          {/* Nombre de résultats */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de résultats
            </label>
            <select
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </div>

          {/* Contrats en cours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Options
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeInProgress}
                onChange={(e) => setIncludeInProgress(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Inclure les contrats en cours</span>
            </label>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-blue-800">Total collaborateurs</p>
              <p className="text-2xl font-bold text-blue-900">{collaborators.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-green-800">Actifs</p>
              <p className="text-2xl font-bold text-green-900">
                {collaborators.filter((c: any) => c.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-gray-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-800">Inactifs</p>
              <p className="text-2xl font-bold text-gray-900">
                {collaborators.filter((c: any) => c.status !== 'active').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des collaborateurs */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Liste des collaborateurs</h2>
        </div>
        
        <CollaboratorsList
          collaborators={collaborators}
          loading={loading}
          error={error}
          hasMore={hasMore}
          loadMore={loadMore}
        />
      </div>
    </div>
  )
}
