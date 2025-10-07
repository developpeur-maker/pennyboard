import { PayfitCollaborator } from '../hooks/usePayfitData'

interface CollaboratorsListProps {
  collaborators: PayfitCollaborator[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
}
import { Users, Mail, Calendar, Euro, Loader2 } from 'lucide-react'

export function CollaboratorsList({ collaborators, loading, error, hasMore, loadMore }: CollaboratorsListProps) {
  if (loading && collaborators.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Chargement des collaborateurs...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold mb-2">Erreur de chargement</h3>
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (collaborators.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Aucun collaborateur trouvé</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {collaborators.map((collaborator, index) => (
          <div key={collaborator.id || index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {collaborator.firstName} {collaborator.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {collaborator.jobTitle || 'Poste non défini'}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {collaborator.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{collaborator.email}</span>
                    </div>
                  )}
                  
                  {collaborator.hireDate && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Embauché le {new Date(collaborator.hireDate).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                  
                  {collaborator.salary && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Euro className="w-4 h-4" />
                      <span>{collaborator.salary.toLocaleString('fr-FR')} €/mois</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="ml-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  collaborator.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {collaborator.status === 'active' ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement...
              </>
            ) : (
              'Charger plus'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
