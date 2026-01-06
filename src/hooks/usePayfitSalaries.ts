import { useState, useEffect } from 'react'

interface PayfitAccountingOperation {
  debit: number | null
  credit: number | null
  operationDate: string
  employeeFullName: string | null
  contractId: string | null
  accountId: string
  accountName: string
  analyticCodes?: Array<{
    type: string
    value: string | null
    code: string | null
  }>
}

interface EmployeeSalaryData {
  employeeName: string
  contractId: string | null
  salaryPaid: number           // 421 + 425 (salaire réellement versé)
  totalPrimes: number           // 6413000 uniquement
  totalContributions: number    // Tous les comptes de cotisations
  totalGrossCost: number        // Masse salariale (tous les comptes de charges)
  operations: PayfitAccountingOperation[]
}

interface UsePayfitSalariesResult {
  employees: EmployeeSalaryData[]
  loading: boolean
  error: string | null
  lastSyncDate: string | null
  totals: {
    totalSalaryPaid: number     // 421 + 425 (salaire versé)
    totalPrimes: number          // 6413000 uniquement
    totalContributions: number   // Tous les comptes de cotisations
    totalGrossCost: number       // Masse salariale (tous les comptes de charges)
    employeesCount: number
  } | null
  refetch: () => void
}

export function usePayfitSalaries(date: string): UsePayfitSalariesResult {
  const [employees, setEmployees] = useState<EmployeeSalaryData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null)
  const [totals, setTotals] = useState<{
    totalSalaries: number
    totalContributions: number
    totalCost: number
    employeesCount: number
  } | null>(null)

  const fetchData = async () => {
    if (!date) {
      setEmployees([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Récupérer les données depuis la base de données (au lieu de l'API Payfit directement)
      const response = await fetch(`/api/payfit-salaries?month=${date}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          // Aucune donnée trouvée pour ce mois
          setEmployees([])
          setError(null) // Pas d'erreur, juste pas de données
          return
        }
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la récupération des données')
      }

      const data = await response.json()
      
      if (!data.success || !data.employees) {
        setEmployees([])
        return
      }

      // Les données sont déjà traitées et formatées depuis la BDD
      setEmployees(data.employees)
      setLastSyncDate(data.lastSyncDate)
      setTotals(data.totals)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(errorMessage)
      setEmployees([])
      console.error('❌ Erreur lors de la récupération des salaires:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [date])

  return {
    employees,
    loading,
    error,
    lastSyncDate,
    totals,
    refetch: fetchData
  }
}

