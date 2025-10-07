import { useState, useEffect } from 'react'

interface PayfitOptions {
  nextPageToken?: string
  maxResults?: number
  includeInProgressContracts?: boolean
  email?: string
}

interface PayfitPagination {
  nextPageToken: string | null
  hasMore: boolean
}

export interface PayfitCollaborator {
  id: string
  firstName: string
  lastName: string
  email?: string
  jobTitle?: string
  hireDate?: string
  salary?: number
  status: 'active' | 'inactive'
}

export function usePayfitData(companyId: string, options: PayfitOptions = {}) {
  const [collaborators, setCollaborators] = useState<PayfitCollaborator[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PayfitPagination>({
    nextPageToken: null,
    hasMore: false
  })

  const fetchCollaborators = async (reset: boolean = false) => {
    if (!companyId) return

    try {
      setLoading(true)
      setError(null)

      // Construire les paramètres de requête
      const params = new URLSearchParams()
      params.append('companyId', companyId)
      
      if (options.nextPageToken) {
        params.append('nextPageToken', options.nextPageToken)
      }
      if (options.maxResults) {
        params.append('maxResults', options.maxResults.toString())
      }
      if (options.includeInProgressContracts !== undefined) {
        params.append('includeInProgressContracts', options.includeInProgressContracts.toString())
      }
      if (options.email) {
        params.append('email', options.email)
      }

      const response = await fetch(`/api/payfit?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Erreur lors de la récupération des collaborateurs')
      }

      const data = await response.json()
      
      if (reset) {
        setCollaborators(data.collaborators || [])
      } else {
        setCollaborators(prev => [...prev, ...(data.collaborators || [])])
      }
      
      setPagination({
        nextPageToken: data.pagination?.nextPageToken,
        hasMore: data.pagination?.hasMore || false
      })

    } catch (err) {
      console.error('Erreur lors de la récupération des collaborateurs Payfit:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (pagination.hasMore && !loading) {
      fetchCollaborators(false)
    }
  }

  const refresh = () => {
    fetchCollaborators(true)
  }

  useEffect(() => {
    if (companyId) {
      fetchCollaborators(true)
    }
  }, [companyId])

  return {
    collaborators,
    loading,
    error,
    pagination,
    loadMore,
    refresh,
    hasMore: pagination.hasMore
  }
}
