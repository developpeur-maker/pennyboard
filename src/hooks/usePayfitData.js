import { useState, useEffect } from 'react'

export function usePayfitData(companyId, options = {}) {
  const [collaborators, setCollaborators] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    nextPageToken: null,
    hasMore: false
  })

  const fetchCollaborators = async (reset = false) => {
    if (!companyId) return

    try {
      setLoading(true)
      setError(null)

      // Construire les paramètres de requête
      const params = new URLSearchParams({
        companyId,
        ...options
      })

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
      setError(err.message)
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
