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

interface PayfitAccountingData {
  [accountCode: string]: PayfitAccountingOperation[]
}

interface EmployeeSalaryData {
  employeeName: string
  contractId: string | null
  totalSalary: number
  totalContributions: number
  operations: PayfitAccountingOperation[]
}

interface UsePayfitSalariesResult {
  employees: EmployeeSalaryData[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePayfitSalaries(companyId: string, date: string): UsePayfitSalariesResult {
  const [employees, setEmployees] = useState<EmployeeSalaryData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    if (!companyId || !date) {
      setEmployees([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Convertir la date au format YYYYMM (ex: "2025-01" -> "202501")
      const dateFormatted = date.replace('-', '')
      
      const response = await fetch(`/api/payfit-accounting?companyId=${companyId}&date=${dateFormatted}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la récupération des données')
      }

      const data = await response.json()
      
      if (!data.success || !data.rawData) {
        throw new Error('Données invalides reçues de l\'API')
      }

      // Traiter les données pour regrouper par collaborateur
      const accountingData: PayfitAccountingData = data.rawData
      const employeesMap = new Map<string, EmployeeSalaryData>()

      // La structure peut être soit un objet avec des codes comptables comme clés,
      // soit directement un tableau d'opérations
      let allOperations: PayfitAccountingOperation[] = []

      if (Array.isArray(accountingData)) {
        // Si c'est directement un tableau
        allOperations = accountingData
      } else {
        // Si c'est un objet avec des codes comptables comme clés
        Object.values(accountingData).forEach((operations: any) => {
          if (Array.isArray(operations)) {
            allOperations.push(...operations)
          }
        })
      }

      // Parcourir toutes les opérations
      allOperations.forEach((operation: PayfitAccountingOperation) => {
        // Filtrer uniquement les opérations liées aux salaires et cotisations
        // Les comptes de salaires commencent généralement par 641, 645, etc.
        const accountId = String(operation.accountId || '')
        const accountName = String(operation.accountName || '').toUpperCase()
        
        const isSalaryRelated = accountId.startsWith('641') || 
                               accountId.startsWith('645') || 
                               accountId.startsWith('647') ||
                               accountName.includes('SALAIRE') ||
                               accountName.includes('COTISATION') ||
                               accountName.includes('CHARGE SOCIALE')

        if (isSalaryRelated && operation.employeeFullName) {
          const employeeName = operation.employeeFullName
          const contractId = operation.contractId || 'unknown'

          // Utiliser une clé unique combinant nom et contrat pour gérer les cas où
          // un employé a plusieurs contrats
          const employeeKey = `${employeeName}_${contractId}`

          if (!employeesMap.has(employeeKey)) {
            employeesMap.set(employeeKey, {
              employeeName,
              contractId,
              totalSalary: 0,
              totalContributions: 0,
              operations: []
            })
          }

          const employee = employeesMap.get(employeeKey)!
          employee.operations.push(operation)

          // Calculer les montants (débit = charge, crédit = produit)
          const amount = Math.abs(operation.debit || operation.credit || 0)
          
          // Les salaires sont généralement en débit (charges) - compte 641
          if (accountId.startsWith('641') || accountName.includes('SALAIRE')) {
            employee.totalSalary += amount
          }
          // Les cotisations sont généralement en débit (charges sociales) - comptes 645, 647
          else if (accountId.startsWith('645') || accountId.startsWith('647') || 
                   accountName.includes('COTISATION') || accountName.includes('CHARGE SOCIALE')) {
            employee.totalContributions += amount
          }
        }
      })

      // Convertir la Map en tableau et trier par nom
      const employeesList = Array.from(employeesMap.values()).sort((a, b) => 
        a.employeeName.localeCompare(b.employeeName)
      )

      setEmployees(employeesList)
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
  }, [companyId, date])

  return {
    employees,
    loading,
    error,
    refetch: fetchData
  }
}

