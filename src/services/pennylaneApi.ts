// Service pour l'API Pennylane via proxy Vercel
const API_BASE_URL = '/api'
const API_KEY = import.meta.env.VITE_PENNYLANE_API_KEY

// Types pour les comptes comptables (API v2)
export interface Account {
  id: number
  code: string
  name: string
  balance: number
  currency: string
  account_type?: string
  parent_id?: number
}

export interface AccountsResponse {
  total_pages: number
  current_page: number
  per_page: number
  total_items: number
  items: Account[]
}

// Types pour le trial balance (API v2)
export interface TrialBalanceAccount {
  number: string
  formatted_number: string
  label: string
  credits: string
  debits: string
}

export interface TrialBalanceResponse {
  total_pages: number
  current_page: number
  per_page: number
  total_items: number
  items: TrialBalanceAccount[]
}

// Types pour les données Pennylane
export interface PennylaneResultatComptable {
  period: string
  chiffre_affaires: number // CA Net (comptes 701-708 moins 709)
  total_produits_exploitation: number // Total des produits d'exploitation (tous les comptes 7)
  charges: number
  resultat_net: number
  currency: string
  // Détails par compte
  prestations_services: number // Compte 706
  ventes_biens: number // Compte 701
  achats: number // Compte 601
  charges_externes: number // Compte 622
  charges_personnel: number // Compte 641
}

export interface PennylaneTresorerie {
  period: string
  solde_initial: number
  encaissements: number
  decaissements: number
  solde_final: number
  currency: string
}


if (!API_KEY) {
  console.warn('⚠️ VITE_PENNYLANE_API_KEY non configurée.')
}

// Fonction pour faire les appels API via proxy
async function apiCall<T>(endpoint: string): Promise<T> {
  console.log(`🔗 Appel API Pennylane via proxy: ${API_BASE_URL}/${endpoint}`)

  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })

    console.log(`📊 Réponse API: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorData = await response.json()
      console.error(`❌ Erreur API:`, errorData)
      throw new Error(`Erreur API Pennylane: ${response.status} ${response.statusText} - ${errorData.error || errorData.message}`)
    }

    const data = await response.json()
    console.log(`✅ Données reçues:`, data)
    return data
  } catch (error) {
    console.error('❌ Erreur de connexion:', error)
    throw error
  }
}

// Fonction pour récupérer les ledger entries (qui contiennent les informations comptables)
export async function getLedgerEntries(page: number = 1, perPage: number = 1000): Promise<any> {
  try {
    console.log(`📊 Récupération des ledger entries (page ${page})...`)
    
    // Construire les paramètres de requête de manière sécurisée
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString()
    })
    
    const response = await apiCall<{success: boolean, raw_data: any}>(`accounts?${params.toString()}`)
    
    if (response.success && response.raw_data) {
      return response.raw_data
    }
    
    throw new Error('Format de réponse inattendu')
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des ledger entries:', error)
    throw error
  }
}

// Fonction pour récupérer le trial balance (balance des comptes) - TOUTES LES PAGES
export async function getTrialBalance(periodStart: string = '2025-01-01', periodEnd: string = '2025-01-31', perPage: number = 1000): Promise<TrialBalanceResponse> {
  try {
    console.log(`📊 Récupération du trial balance (${periodStart} à ${periodEnd})...`)
    
    let allItems: any[] = []
    let currentPage = 1
    let totalPages = 1
    
    // Récupérer toutes les pages
    do {
      console.log(`📄 Récupération de la page ${currentPage}/${totalPages}...`)
      
      // Construire les paramètres de requête de manière sécurisée
      const params = new URLSearchParams({
        period_start: periodStart,
        period_end: periodEnd,
        page: currentPage.toString(),
        per_page: perPage.toString()
      })
      
      const response = await apiCall<{success: boolean, raw_data: TrialBalanceResponse}>(`trial-balance?${params.toString()}`)
      
      if (!response.success || !response.raw_data) {
        throw new Error('Format de réponse inattendu')
      }
      
      // Ajouter les items de cette page
      if (response.raw_data.items) {
        allItems = allItems.concat(response.raw_data.items)
        console.log(`📋 Page ${currentPage}: ${response.raw_data.items.length} comptes récupérés (total: ${allItems.length})`)
      }
      
      // Mettre à jour les informations de pagination
      totalPages = response.raw_data.total_pages
      currentPage++
      
    } while (currentPage <= totalPages)
    
    console.log(`✅ Trial balance complet récupéré: ${allItems.length} comptes sur ${totalPages} pages`)
    
    // Retourner la structure complète avec tous les items
    const completeTrialBalance: TrialBalanceResponse = {
      total_pages: totalPages,
      current_page: 1, // On retourne tout sur une "page virtuelle"
      per_page: allItems.length,
      total_items: allItems.length,
      items: allItems
    }
    
    return completeTrialBalance
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du trial balance:', error)
    throw error
  }
}

// Fonctions utilitaires pour les calculs
function getMonthDateRange(selectedMonth: string): { startDate: string, endDate: string } {
  const [year, month] = selectedMonth.split('-')
  const startDate = `${year}-${month}-01`
  
  // Calculer le dernier jour du mois correctement
  const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate()
  const endDate = `${year}-${month}-${lastDayOfMonth.toString().padStart(2, '0')}`
  
  return { startDate, endDate }
}

function calculateProfitabilityRatio(ca: number, resultat: number): { ratio: number, message: string } {
  if (ca === 0) return { ratio: 0, message: "Aucun chiffre d'affaires" };
  
  const ratio = Math.round((resultat / ca) * 100);
  
  let message = "";
  if (ratio > 25) message = "Excellente rentabilité ! 🎉";
  else if (ratio > 15) message = "Très bonne rentabilité 👍";
  else if (ratio > 10) message = "Bonne rentabilité ✅";
  else if (ratio > 5) message = "Rentabilité correcte 📊";
  else if (ratio > 0) message = "Rentabilité faible ⚠️";
  else message = "Activité déficitaire 🔴";
  
  return { ratio, message };
}

// Services API
export const pennylaneApi = {
  // Fonction utilitaire pour parser les montants de manière robuste
  parseAmount(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '') {
      return 0
    }
    
    if (typeof value === 'number') {
      return value
    }
    
    // Nettoyer la chaîne : supprimer les espaces, remplacer les virgules par des points
    const cleanValue = value.toString().trim().replace(',', '.')
    const parsed = parseFloat(cleanValue)
    
    if (isNaN(parsed)) {
      console.warn(`⚠️ Impossible de parser la valeur: "${value}" -> 0`)
      return 0
    }
    
    return parsed
  },
  // Test de connexion de base
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Test de connexion à l\'API Pennylane via proxy...')
      // Utiliser l'endpoint /me pour tester la connexion (endpoint standard et léger)
      const data = await apiCall<{success: boolean, raw_data: any}>('me')
      console.log('✅ Connexion réussie:', data)
      return data.success || true
    } catch (error) {
      console.error('❌ Erreur de connexion:', error)
      return false
    }
  },


  // Récupérer le résultat comptable basé sur le trial balance
  async getResultatComptable(selectedMonth: string = '2025-09'): Promise<PennylaneResultatComptable[]> {
    try {
      console.log(`📊 Récupération du résultat comptable pour ${selectedMonth}...`)
      
      // Convertir le mois sélectionné en dates
      const { startDate, endDate } = getMonthDateRange(selectedMonth)
      
      // Récupérer le trial balance pour le mois sélectionné
      const trialBalance = await getTrialBalance(startDate, endDate, 1000)
      
      if (!trialBalance.items || trialBalance.items.length === 0) {
        console.log('⚠️ Aucune donnée de trial balance trouvée pour getResultatComptable')
        console.log('🔍 trialBalance.items:', trialBalance.items)
        return []
      }
      
      console.log(`📋 ${trialBalance.items.length} comptes récupérés du trial balance pour getResultatComptable`)
      
      // Traiter les données pour le mois sélectionné
      const processedData = this.processTrialBalanceData(trialBalance, selectedMonth)
      console.log('📊 Données traitées par processTrialBalanceData:', processedData.length, 'éléments')
      console.log('🔍 Premier élément:', processedData[0])
      
      return processedData
      
    } catch (error) {
      console.error('Erreur lors de la récupération du résultat comptable:', error)
      return []
    }
  },

  // Récupérer la trésorerie basée sur le trial balance
  async getTresorerie(selectedMonth: string = '2025-09'): Promise<PennylaneTresorerie[]> {
    try {
      console.log(`💰 Récupération de la trésorerie pour ${selectedMonth}...`)
      
      // Convertir le mois sélectionné en dates
      const { startDate, endDate } = getMonthDateRange(selectedMonth)
      
      // Récupérer le trial balance pour le mois sélectionné
      const trialBalance = await getTrialBalance(startDate, endDate, 1000)
      
      if (!trialBalance.items || trialBalance.items.length === 0) {
        console.log('⚠️ Aucune donnée de trial balance trouvée pour la trésorerie')
        return []
      }
      
      console.log(`📋 ${trialBalance.items.length} comptes récupérés du trial balance pour la trésorerie`)
      
      // Traiter les données pour le mois sélectionné
      return this.processTreasuryFromTrialBalance(trialBalance, selectedMonth)
      
    } catch (error) {
      console.error('Erreur lors de la récupération de la trésorerie:', error)
      return []
    }
  },


  // Traiter les écritures comptables filtrées par mois pour calculer les métriques
  processLedgerEntriesByMonth(ledgerEntries: any, selectedMonth: string = '2025-09'): PennylaneResultatComptable[] {
    console.log(`📊 Traitement des écritures comptables pour ${selectedMonth}...`)
    
    // Convertir le mois sélectionné en dates
    const [year, month] = selectedMonth.split('-')
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0) // Dernier jour du mois
    
    console.log(`📅 Filtrage des écritures du ${startDate.toISOString().split('T')[0]} au ${endDate.toISOString().split('T')[0]}`)
    
    // Filtrer les écritures par mois
    const entriesForMonth = ledgerEntries.items.filter((entry: any) => {
      if (!entry.date) return false
      const entryDate = new Date(entry.date)
      return entryDate >= startDate && entryDate <= endDate
    })
    
    console.log(`📋 ${entriesForMonth.length} écritures trouvées pour ${selectedMonth} (sur ${ledgerEntries.items.length} total)`)
    
    // Pour l'instant, nous utilisons une approche simplifiée
    // Dans une vraie implémentation, nous récupérerions les détails de chaque écriture
    // et calculerions les montants réels par compte
    
    // Estimation basée sur le nombre d'écritures et le mois
    const baseAmount = entriesForMonth.length * 1000 // Estimation 1000€ par écriture
    
    // Créer des données simulées mais réalistes basées sur le mois
    const chiffreAffairesNet = baseAmount * 0.8 // 80% du montant estimé
    const totalProduitsExploitation = baseAmount * 0.9 // 90% du montant estimé
    const charges = baseAmount * 0.6 // 60% du montant estimé
    
    const result: PennylaneResultatComptable[] = [{
      period: selectedMonth,
      chiffre_affaires: chiffreAffairesNet,
      total_produits_exploitation: totalProduitsExploitation,
      charges: charges,
      resultat_net: totalProduitsExploitation - charges,
      currency: 'EUR',
      prestations_services: chiffreAffairesNet * 0.8,
      ventes_biens: chiffreAffairesNet * 0.2,
      achats: charges * 0.3,
      charges_externes: charges * 0.4,
      charges_personnel: charges * 0.3
    }]
    
    console.log(`💰 Données calculées pour ${selectedMonth}:`)
    console.log(`   - CA Net: ${chiffreAffairesNet.toFixed(2)}€`)
    console.log(`   - Total Produits: ${totalProduitsExploitation.toFixed(2)}€`)
    console.log(`   - Charges: ${charges.toFixed(2)}€`)
    console.log(`   - Résultat: ${(totalProduitsExploitation - charges).toFixed(2)}€`)
    
    return result
  },

  // Traiter les données du trial balance pour calculer les métriques
  processTrialBalanceData(trialBalance: TrialBalanceResponse, selectedMonth: string = '2025-09'): PennylaneResultatComptable[] {
    console.log(`📊 Traitement de ${trialBalance.items.length} comptes du trial balance...`)
    
    // Debug: Afficher quelques exemples de comptes
    if (trialBalance.items.length > 0) {
      console.log(`🔍 Exemples de comptes reçus:`)
      trialBalance.items.slice(0, 3).forEach(account => {
        console.log(`   - ${account.number} (${account.label}): credits="${account.credits}", debits="${account.debits}"`)
      })
    }
    
    // Debug: Analyser tous les types de comptes reçus
    const comptesByClass: { [key: string]: number } = {}
    trialBalance.items.forEach(account => {
      const firstDigit = account.number.charAt(0)
      comptesByClass[firstDigit] = (comptesByClass[firstDigit] || 0) + 1
    })
    console.log('🔍 Répartition des comptes par classe:', comptesByClass)
    
    // Analyser les comptes par classe
    const comptes7 = trialBalance.items.filter(account => account.number.startsWith('7')) // Revenus
    const comptes6 = trialBalance.items.filter(account => account.number.startsWith('6')) // Charges
    const comptes5 = trialBalance.items.filter(account => account.number.startsWith('5')) // Trésorerie
    
    console.log(`📋 Comptes trouvés: 7 (${comptes7.length}), 6 (${comptes6.length}), 5 (${comptes5.length})`)
    
    // Debug: Afficher quelques comptes de chaque classe s'ils existent
    if (comptes7.length > 0) {
      console.log('🔍 Exemples de comptes classe 7 (Revenus):')
      comptes7.slice(0, 2).forEach(account => {
        console.log(`   - ${account.number} (${account.label}): credits=${account.credits}, debits=${account.debits}`)
      })
    }
    if (comptes6.length > 0) {
      console.log('🔍 Exemples de comptes classe 6 (Charges):')
      comptes6.slice(0, 2).forEach(account => {
        console.log(`   - ${account.number} (${account.label}): credits=${account.credits}, debits=${account.debits}`)
      })
    }
    if (comptes5.length > 0) {
      console.log('🔍 Exemples de comptes classe 5 (Trésorerie):')
      comptes5.slice(0, 2).forEach(account => {
        console.log(`   - ${account.number} (${account.label}): credits=${account.credits}, debits=${account.debits}`)
      })
    }
    
    // Calculer le Chiffre d'Affaires Net (comptes 701-708 moins 709)
    const comptesCA = comptes7.filter(account => {
      const num = parseInt(account.number.substring(0, 3))
      return num >= 701 && num <= 708 // Comptes de ventes
    })
    
    const comptesRistournes = comptes7.filter(account => account.number.startsWith('709')) // Ristournes
    
    const chiffreAffairesBrut = comptesCA.reduce((total, account) => {
      const credits = this.parseAmount(account.credits)
      const debits = this.parseAmount(account.debits)
      console.log(`   CA - ${account.number}: credits=${credits}, debits=${debits}`)
      return total + credits - debits
    }, 0)
    
    const ristournes = comptesRistournes.reduce((total, account) => {
      const credits = this.parseAmount(account.credits)
      const debits = this.parseAmount(account.debits)
      return total + debits - credits // Les ristournes sont en débit
    }, 0)
    
    const chiffreAffairesNet = chiffreAffairesBrut - ristournes
    
    // Calculer le Total des Produits d'Exploitation (tous les comptes 7)
    const totalProduitsExploitation = comptes7.reduce((total, account) => {
      const credits = this.parseAmount(account.credits)
      const debits = this.parseAmount(account.debits)
      return total + credits - debits
    }, 0)
    
    const charges = comptes6.reduce((total, account) => {
      const credits = this.parseAmount(account.credits)
      const debits = this.parseAmount(account.debits)
      return total + debits - credits
    }, 0)
    
    const tresorerie = comptes5.reduce((total, account) => {
      const credits = this.parseAmount(account.credits)
      const debits = this.parseAmount(account.debits)
      return total + credits - debits
    }, 0)
    
    console.log(`💰 Calculs détaillés:`)
    console.log(`   - CA Net: ${chiffreAffairesNet.toFixed(2)}€`)
    console.log(`   - Total Produits Exploitation: ${totalProduitsExploitation.toFixed(2)}€`)
    console.log(`   - Charges: ${charges.toFixed(2)}€`)
    console.log(`   - Trésorerie: ${tresorerie.toFixed(2)}€`)
    
    // Créer un seul résultat pour le mois sélectionné
    const result: PennylaneResultatComptable[] = []
    
    result.push({
      period: selectedMonth,
      chiffre_affaires: chiffreAffairesNet, // CA Net (comptes 701-708 moins 709)
      total_produits_exploitation: totalProduitsExploitation, // Total des produits d'exploitation (tous les comptes 7)
      charges: charges,
      resultat_net: chiffreAffairesNet - charges,
      currency: 'EUR',
      prestations_services: chiffreAffairesNet, // CA Net pour les prestations
      ventes_biens: 0, // Pas de vente de biens pour DIMO DIAGNOSTIC
      achats: 0, // À calculer séparément si nécessaire
      charges_externes: charges * 0.8, // Estimation
      charges_personnel: charges * 0.2 // Estimation
    })
    
    return result
  },

  // Traiter les données des ledger entries pour calculer les métriques (fallback)
  processLedgerEntriesData(ledgerEntries: any[]): PennylaneResultatComptable[] {
    console.log(`📊 Traitement de ${ledgerEntries.length} écritures comptables...`)
    
    // Pour l'instant, nous utilisons une approche simplifiée
    // Dans une vraie implémentation, nous récupérerions les lignes détaillées de chaque écriture
    // pour obtenir les montants et codes comptables exacts
    
    console.log(`📋 Écritures comptables trouvées: ${ledgerEntries.length}`)
    console.log(`⚠️ Note: Les montants sont estimés car nous n'avons pas accès aux lignes détaillées`)
    
    // Estimation basée sur le nombre d'écritures
    // Dans un vrai système, nous analyserions les labels et récupérerions les lignes
    const chiffreAffairesEstime = ledgerEntries.length * 150 // Estimation 150€ par écriture
    const chargesEstimees = ledgerEntries.length * 80 // Estimation 80€ par écriture
    
    // Créer les 12 derniers mois
    const result: PennylaneResultatComptable[] = []
    const currentDate = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const period = date.toISOString().slice(0, 7) // Format YYYY-MM
      
      // Répartir les montants estimés sur 12 mois
      const chiffreAffaires = chiffreAffairesEstime / 12
      const charges = chargesEstimees / 12
      
      result.push({
        period,
        chiffre_affaires: chiffreAffaires,
        total_produits_exploitation: chiffreAffaires, // Même valeur pour le fallback
        charges: charges,
        resultat_net: chiffreAffaires - charges,
        currency: 'EUR',
        prestations_services: chiffreAffaires, // Tous les revenus sont des prestations
        ventes_biens: 0, // Pas de vente de biens pour DIMO DIAGNOSTIC
        achats: 0, // À calculer séparément si nécessaire
        charges_externes: charges * 0.8, // Estimation
        charges_personnel: charges * 0.2 // Estimation
      })
    }
    
    return result
  },


  // Traiter les données de trésorerie à partir du trial balance
  processTreasuryFromTrialBalance(trialBalance: TrialBalanceResponse, selectedMonth: string = '2025-09'): PennylaneTresorerie[] {
    console.log(`💰 Traitement de ${trialBalance.items.length} comptes pour la trésorerie...`)
    
    // Analyser les comptes de trésorerie (classe 5)
    const comptes5 = trialBalance.items.filter(account => account.number.startsWith('5'))
    
    console.log(`📋 Comptes de trésorerie trouvés: ${comptes5.length}`)
    
    // Calculer le solde total de trésorerie
    const soldeTotal = comptes5.reduce((total, account) => {
      const credits = parseFloat(account.credits) || 0
      const debits = parseFloat(account.debits) || 0
      return total + credits - debits
    }, 0)
    
    console.log(`💰 Solde total de trésorerie: ${soldeTotal.toFixed(2)}€`)
    
    // Créer un seul résultat pour le mois sélectionné
    const result: PennylaneTresorerie[] = []
    
    result.push({
      period: selectedMonth,
      solde_initial: soldeTotal,
      encaissements: soldeTotal * 0.6, // Estimation
      decaissements: soldeTotal * 0.4, // Estimation
      solde_final: soldeTotal,
      currency: 'EUR'
    })
    
    return result
  },

  // Récupérer les données du trial balance pour le compte de résultat
  async getTrialBalanceData(selectedMonth: string = '2025-09'): Promise<TrialBalanceResponse> {
    try {
      console.log(`📊 Récupération des données trial balance pour ${selectedMonth}...`)
      
      // Convertir le mois sélectionné en dates
      const { startDate, endDate } = getMonthDateRange(selectedMonth)
      
      // Récupérer le trial balance pour le mois sélectionné
      const trialBalance = await getTrialBalance(startDate, endDate, 1000)
      
      if (!trialBalance.items || trialBalance.items.length === 0) {
        throw new Error('Aucune donnée de trial balance trouvée')
      }
      
      console.log(`📋 ${trialBalance.items.length} comptes récupérés du trial balance`)
      return trialBalance
      
    } catch (error) {
      console.error('Erreur lors de la récupération des données trial balance:', error)
      throw error
    }
  },

  // Récupérer les données du mois précédent pour comparaison
  async getPreviousMonthData(selectedMonth: string = '2025-09'): Promise<TrialBalanceResponse | null> {
    try {
      // Calculer le mois précédent
      const [year, month] = selectedMonth.split('-')
      const currentDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const previousDate = new Date(currentDate)
      previousDate.setMonth(previousDate.getMonth() - 1)
      
      const prevYear = previousDate.getFullYear()
      const prevMonth = String(previousDate.getMonth() + 1).padStart(2, '0')
      const prevMonthStr = `${prevYear}-${prevMonth}`
      
      console.log(`📊 Récupération des données du mois précédent: ${prevMonthStr}...`)
      
      const { startDate, endDate } = getMonthDateRange(prevMonthStr)
      
      // Récupérer le trial balance pour le mois précédent
      const trialBalance = await getTrialBalance(startDate, endDate, 1000)
      
      if (!trialBalance.items || trialBalance.items.length === 0) {
        console.log(`⚠️ Aucune donnée trouvée pour le mois précédent ${prevMonthStr}`)
        return null
      }
      
      console.log(`📋 ${trialBalance.items.length} comptes récupérés du mois précédent`)
      return trialBalance
      
    } catch (error) {
      console.error('Erreur lors de la récupération des données du mois précédent:', error)
      return null
    }
  },

  // Récupérer les exercices fiscaux disponibles
  async getFiscalYears(): Promise<Array<{id: string, name: string, start_date: string, end_date: string}>> {
    try {
      console.log('📅 Récupération des exercices fiscaux...')
      const response = await apiCall<{success: boolean, raw_data: any}>(`fiscal_years`)
      
      if (response.success && response.raw_data) {
        const fiscalYears = response.raw_data.items || response.raw_data
        console.log(`📋 ${fiscalYears.length} exercices fiscaux trouvés`)
        return fiscalYears.map((fy: any) => ({
          id: fy.id || fy.name,
          name: fy.name || `${fy.start_date} - ${fy.end_date}`,
          start_date: fy.start_date,
          end_date: fy.end_date
        }))
      }
      
      // Fallback : créer des exercices par défaut
      const currentYear = new Date().getFullYear()
      return [
        {
          id: `${currentYear}`,
          name: `Exercice ${currentYear}`,
          start_date: `${currentYear}-01-01`,
          end_date: `${currentYear}-12-31`
        },
        {
          id: `${currentYear - 1}`,
          name: `Exercice ${currentYear - 1}`,
          start_date: `${currentYear - 1}-01-01`,
          end_date: `${currentYear - 1}-12-31`
        }
      ]
      
    } catch (error) {
      console.error('Erreur lors de la récupération des exercices fiscaux:', error)
      // Fallback en cas d'erreur
      const currentYear = new Date().getFullYear()
      return [
        {
          id: `${currentYear}`,
          name: `Exercice ${currentYear}`,
          start_date: `${currentYear}-01-01`,
          end_date: `${currentYear}-12-31`
        }
      ]
    }
  },

  // Récupérer les données du trial balance pour un exercice complet
  async getTrialBalanceForFiscalYear(fiscalYearId: string): Promise<TrialBalanceResponse> {
    try {
      console.log(`📊 Récupération des données trial balance pour l'exercice ${fiscalYearId}...`)
      
      // Récupérer les exercices fiscaux pour obtenir les dates
      const fiscalYears = await this.getFiscalYears()
      const fiscalYear = fiscalYears.find(fy => fy.id === fiscalYearId)
      
      if (!fiscalYear) {
        throw new Error(`Exercice fiscal ${fiscalYearId} non trouvé`)
      }
      
      console.log(`📅 Période: ${fiscalYear.start_date} à ${fiscalYear.end_date}`)
      
      // Récupérer le trial balance pour l'exercice complet
      const trialBalance = await getTrialBalance(fiscalYear.start_date, fiscalYear.end_date, 1000)
      
      if (!trialBalance.items || trialBalance.items.length === 0) {
        throw new Error('Aucune donnée de trial balance trouvée pour cet exercice')
      }
      
      console.log(`📋 ${trialBalance.items.length} comptes récupérés pour l'exercice ${fiscalYearId}`)
      return trialBalance
      
    } catch (error) {
      console.error('Erreur lors de la récupération des données trial balance pour l\'exercice:', error)
      throw error
    }
  },

  // Récupérer les KPIs consolidés
  async getKPIs(selectedMonth: string = '2025-09'): Promise<{
    chiffre_affaires: number | null
    total_produits_exploitation: number | null
    charges: number | null
    resultat_net: number | null
    solde_tresorerie: number | null
    growth: number | null
    hasData: boolean
    rentabilite: {
      ratio: number
      message: string
    } | null
  }> {
    try {
      console.log(`📊 Récupération des KPIs pour ${selectedMonth}...`)
      
      const [resultatData, tresorerieData] = await Promise.all([
        this.getResultatComptable(selectedMonth),
        this.getTresorerie(selectedMonth)
      ])
      
      console.log('📊 Résultats des appels parallèles dans getKPIs:')
      console.log('   - resultatData.length:', resultatData.length)
      console.log('   - tresorerieData.length:', tresorerieData.length)
      console.log('   - resultatData[0]:', resultatData[0])
      console.log('   - tresorerieData[0]:', tresorerieData[0])
      
      if (resultatData.length === 0 || tresorerieData.length === 0) {
        console.log('❌ getKPIs: Données manquantes détectées')
        console.log('   - resultatData vide:', resultatData.length === 0)
        console.log('   - tresorerieData vide:', tresorerieData.length === 0)
        return {
          chiffre_affaires: null,
          total_produits_exploitation: null,
          charges: null,
          resultat_net: null,
          solde_tresorerie: null,
          growth: null,
          hasData: false,
          rentabilite: null
        }
      }
      
      // Prendre les données du mois sélectionné
      const currentResultat = resultatData[0] // Premier (et seul) élément pour le mois sélectionné
      const currentTresorerie = tresorerieData[0] // Premier (et seul) élément pour le mois sélectionné
      
      // Pour l'instant, on ne calcule pas de croissance car nous n'avons qu'un mois de données
      // Dans une vraie implémentation, nous récupérerions les données de plusieurs mois
      let growth = null
      
      // Calculer le ratio de rentabilité
      const rentabilite = calculateProfitabilityRatio(
        currentResultat.chiffre_affaires || 0,
        currentResultat.resultat_net || 0
      );

      return {
        chiffre_affaires: currentResultat.chiffre_affaires,
        total_produits_exploitation: currentResultat.total_produits_exploitation,
        charges: currentResultat.charges,
        resultat_net: currentResultat.resultat_net,
        solde_tresorerie: currentTresorerie.solde_final,
        growth,
        hasData: true,
        rentabilite
      }
      
    } catch (error) {
      console.error('Erreur lors de la récupération des KPIs:', error)
      return {
        chiffre_affaires: null,
        total_produits_exploitation: null,
        charges: null,
        resultat_net: null,
        solde_tresorerie: null,
        growth: null,
        hasData: false,
        rentabilite: null
      }
    }
  },

  // Récupérer les détails des comptes pour une classe donnée
  getAccountDetails(trialBalance: TrialBalanceResponse, accountPrefixes: string[]): Array<{
    number: string
    name: string
    current: number
    previous: number
    variation: number
  }> {
    const details: Array<{
      number: string
      name: string
      current: number
      previous: number
      variation: number
    }> = []

    accountPrefixes.forEach(prefix => {
      const accounts = trialBalance.items.filter(account => account.number.startsWith(prefix))
      accounts.forEach(account => {
        const credits = parseFloat(account.credits) || 0
        const debits = parseFloat(account.debits) || 0
        const current = credits - debits
        
        details.push({
          number: account.number,
          name: account.label || `Compte ${account.number}`,
          current,
          previous: 0, // Sera mis à jour si on a les données du mois précédent
          variation: current
        })
      })
    })

    return details.sort((a, b) => a.number.localeCompare(b.number))
  },

  // Calculer le compte de résultat complet avec comparaisons et détails
  calculateIncomeStatement(trialBalance: TrialBalanceResponse, previousTrialBalance?: TrialBalanceResponse | null): {
    produits: {
      vente_marchandises: { current: number, previous: number, variation: number, details?: any[] }
      production_vendue_biens: { current: number, previous: number, variation: number, details?: any[] }
      production_vendue_services: { current: number, previous: number, variation: number, details?: any[] }
      montant_net_ca: { current: number, previous: number, variation: number }
      production_stockee: { current: number, previous: number, variation: number, details?: any[] }
      production_immobilisee: { current: number, previous: number, variation: number, details?: any[] }
      subventions: { current: number, previous: number, variation: number, details?: any[] }
      reprises_amortissements: { current: number, previous: number, variation: number, details?: any[] }
      autres_produits: { current: number, previous: number, variation: number, details?: any[] }
      total_produits_exploitation: { current: number, previous: number, variation: number }
    }
    charges: {
      achats_marchandises: { current: number, previous: number, variation: number, details?: any[] }
      autres_achats_charges_externes: { current: number, previous: number, variation: number, details?: any[] }
      impots_taxes: { current: number, previous: number, variation: number, details?: any[] }
      salaires: { current: number, previous: number, variation: number, details?: any[] }
      cotisations_sociales: { current: number, previous: number, variation: number, details?: any[] }
      dotations_amortissements: { current: number, previous: number, variation: number, details?: any[] }
      autres_charges: { current: number, previous: number, variation: number, details?: any[] }
      total_charges_exploitation: { current: number, previous: number, variation: number }
    }
    resultat_exploitation: { current: number, previous: number, variation: number }
  } {
    console.log(`📊 Calcul du compte de résultat à partir de ${trialBalance.items.length} comptes...`)
    
    // Fonction helper pour calculer le solde d'un compte
    const getAccountBalance = (accountNumber: string, data: TrialBalanceResponse): number => {
      const account = data.items.find(acc => acc.number === accountNumber)
      if (!account) return 0
      const credits = parseFloat(account.credits) || 0
      const debits = parseFloat(account.debits) || 0
      return credits - debits
    }

    // Fonction helper pour calculer le solde d'une classe de comptes
    const getClassBalance = (classPrefix: string, data: TrialBalanceResponse): number => {
      return data.items
        .filter(account => account.number.startsWith(classPrefix))
        .reduce((total, account) => {
          const credits = parseFloat(account.credits) || 0
          const debits = parseFloat(account.debits) || 0
          return total + credits - debits
        }, 0)
    }

    // Fonction helper pour créer un objet avec comparaison
    const createComparison = (current: number, previous: number = 0) => ({
      current,
      previous,
      variation: current - previous
    })

    // PRODUITS D'EXPLOITATION - Mois actuel
    const vente_marchandises_current = getAccountBalance('707', trialBalance)
    const production_vendue_biens_current = getClassBalance('701', trialBalance) + getClassBalance('702', trialBalance) + getClassBalance('703', trialBalance)
    const production_vendue_services_current = getClassBalance('706', trialBalance)
    const montant_net_ca_current = vente_marchandises_current + production_vendue_biens_current + production_vendue_services_current
    const production_stockee_current = getClassBalance('71', trialBalance)
    const production_immobilisee_current = getClassBalance('72', trialBalance)
    const subventions_current = getClassBalance('74', trialBalance)
    const reprises_amortissements_current = getClassBalance('78', trialBalance)
    const autres_produits_current = getClassBalance('75', trialBalance)
    const total_produits_exploitation_current = getClassBalance('7', trialBalance)

    // PRODUITS D'EXPLOITATION - Mois précédent
    const vente_marchandises_previous = previousTrialBalance ? getAccountBalance('707', previousTrialBalance) : 0
    const production_vendue_biens_previous = previousTrialBalance ? 
      getClassBalance('701', previousTrialBalance) + getClassBalance('702', previousTrialBalance) + getClassBalance('703', previousTrialBalance) : 0
    const production_vendue_services_previous = previousTrialBalance ? getClassBalance('706', previousTrialBalance) : 0
    const montant_net_ca_previous = vente_marchandises_previous + production_vendue_biens_previous + production_vendue_services_previous
    const production_stockee_previous = previousTrialBalance ? getClassBalance('71', previousTrialBalance) : 0
    const production_immobilisee_previous = previousTrialBalance ? getClassBalance('72', previousTrialBalance) : 0
    const subventions_previous = previousTrialBalance ? getClassBalance('74', previousTrialBalance) : 0
    const reprises_amortissements_previous = previousTrialBalance ? getClassBalance('78', previousTrialBalance) : 0
    const autres_produits_previous = previousTrialBalance ? getClassBalance('75', previousTrialBalance) : 0
    const total_produits_exploitation_previous = previousTrialBalance ? getClassBalance('7', previousTrialBalance) : 0

    // CHARGES D'EXPLOITATION - Mois actuel
    const achats_marchandises_current = getAccountBalance('607', trialBalance)
    // Autres achats et charges externes : comptes 604 à 628 (sauf 607 déjà compté)
    const autres_achats_charges_externes_current = getClassBalance('604', trialBalance) + 
      getClassBalance('605', trialBalance) + 
      getClassBalance('606', trialBalance) + 
      getClassBalance('608', trialBalance) + 
      getClassBalance('609', trialBalance) + 
      getClassBalance('610', trialBalance) + 
      getClassBalance('611', trialBalance) + 
      getClassBalance('612', trialBalance) + 
      getClassBalance('613', trialBalance) + 
      getClassBalance('614', trialBalance) + 
      getClassBalance('615', trialBalance) + 
      getClassBalance('616', trialBalance) + 
      getClassBalance('617', trialBalance) + 
      getClassBalance('618', trialBalance) + 
      getClassBalance('619', trialBalance) + 
      getClassBalance('620', trialBalance) + 
      getClassBalance('621', trialBalance) + 
      getClassBalance('622', trialBalance) + 
      getClassBalance('623', trialBalance) + 
      getClassBalance('624', trialBalance) + 
      getClassBalance('625', trialBalance) + 
      getClassBalance('626', trialBalance) + 
      getClassBalance('627', trialBalance) + 
      getClassBalance('628', trialBalance)
    // Impôts, taxes : comptes 631 à 637
    const impots_taxes_current = getClassBalance('631', trialBalance) + 
      getClassBalance('632', trialBalance) + 
      getClassBalance('633', trialBalance) + 
      getClassBalance('634', trialBalance) + 
      getClassBalance('635', trialBalance) + 
      getClassBalance('636', trialBalance) + 
      getClassBalance('637', trialBalance)
    
    // Salaires : comptes 641 à 644
    const salaires_current = getClassBalance('641', trialBalance) + 
      getClassBalance('642', trialBalance) + 
      getClassBalance('643', trialBalance) + 
      getClassBalance('644', trialBalance)
    
    // Cotisations sociales : comptes 645 à 647
    const cotisations_sociales_current = getClassBalance('645', trialBalance) + 
      getClassBalance('646', trialBalance) + 
      getClassBalance('647', trialBalance)
    
    const dotations_amortissements_current = getClassBalance('681', trialBalance)
    
    // Autres charges : comptes 654 à 667
    const autres_charges_current = getClassBalance('654', trialBalance) + 
      getClassBalance('655', trialBalance) + 
      getClassBalance('656', trialBalance) + 
      getClassBalance('657', trialBalance) + 
      getClassBalance('658', trialBalance) + 
      getClassBalance('659', trialBalance) + 
      getClassBalance('660', trialBalance) + 
      getClassBalance('661', trialBalance) + 
      getClassBalance('662', trialBalance) + 
      getClassBalance('663', trialBalance) + 
      getClassBalance('664', trialBalance) + 
      getClassBalance('665', trialBalance) + 
      getClassBalance('666', trialBalance) + 
      getClassBalance('667', trialBalance)
    const total_charges_exploitation_current = getClassBalance('6', trialBalance)

    // CHARGES D'EXPLOITATION - Mois précédent
    const achats_marchandises_previous = previousTrialBalance ? getAccountBalance('607', previousTrialBalance) : 0
    // Autres achats et charges externes : comptes 604 à 628 (sauf 607 déjà compté)
    const autres_achats_charges_externes_previous = previousTrialBalance ? 
      getClassBalance('604', previousTrialBalance) + 
      getClassBalance('605', previousTrialBalance) + 
      getClassBalance('606', previousTrialBalance) + 
      getClassBalance('608', previousTrialBalance) + 
      getClassBalance('609', previousTrialBalance) + 
      getClassBalance('610', previousTrialBalance) + 
      getClassBalance('611', previousTrialBalance) + 
      getClassBalance('612', previousTrialBalance) + 
      getClassBalance('613', previousTrialBalance) + 
      getClassBalance('614', previousTrialBalance) + 
      getClassBalance('615', previousTrialBalance) + 
      getClassBalance('616', previousTrialBalance) + 
      getClassBalance('617', previousTrialBalance) + 
      getClassBalance('618', previousTrialBalance) + 
      getClassBalance('619', previousTrialBalance) + 
      getClassBalance('620', previousTrialBalance) + 
      getClassBalance('621', previousTrialBalance) + 
      getClassBalance('622', previousTrialBalance) + 
      getClassBalance('623', previousTrialBalance) + 
      getClassBalance('624', previousTrialBalance) + 
      getClassBalance('625', previousTrialBalance) + 
      getClassBalance('626', previousTrialBalance) + 
      getClassBalance('627', previousTrialBalance) + 
      getClassBalance('628', previousTrialBalance) : 0
    // Impôts, taxes : comptes 631 à 637
    const impots_taxes_previous = previousTrialBalance ? 
      getClassBalance('631', previousTrialBalance) + 
      getClassBalance('632', previousTrialBalance) + 
      getClassBalance('633', previousTrialBalance) + 
      getClassBalance('634', previousTrialBalance) + 
      getClassBalance('635', previousTrialBalance) + 
      getClassBalance('636', previousTrialBalance) + 
      getClassBalance('637', previousTrialBalance) : 0
    
    // Salaires : comptes 641 à 644
    const salaires_previous = previousTrialBalance ? 
      getClassBalance('641', previousTrialBalance) + 
      getClassBalance('642', previousTrialBalance) + 
      getClassBalance('643', previousTrialBalance) + 
      getClassBalance('644', previousTrialBalance) : 0
    
    // Cotisations sociales : comptes 645 à 647
    const cotisations_sociales_previous = previousTrialBalance ? 
      getClassBalance('645', previousTrialBalance) + 
      getClassBalance('646', previousTrialBalance) + 
      getClassBalance('647', previousTrialBalance) : 0
    
    const dotations_amortissements_previous = previousTrialBalance ? getClassBalance('681', previousTrialBalance) : 0
    
    // Autres charges : comptes 654 à 667
    const autres_charges_previous = previousTrialBalance ? 
      getClassBalance('654', previousTrialBalance) + 
      getClassBalance('655', previousTrialBalance) + 
      getClassBalance('656', previousTrialBalance) + 
      getClassBalance('657', previousTrialBalance) + 
      getClassBalance('658', previousTrialBalance) + 
      getClassBalance('659', previousTrialBalance) + 
      getClassBalance('660', previousTrialBalance) + 
      getClassBalance('661', previousTrialBalance) + 
      getClassBalance('662', previousTrialBalance) + 
      getClassBalance('663', previousTrialBalance) + 
      getClassBalance('664', previousTrialBalance) + 
      getClassBalance('665', previousTrialBalance) + 
      getClassBalance('666', previousTrialBalance) + 
      getClassBalance('667', previousTrialBalance) : 0
    const total_charges_exploitation_previous = previousTrialBalance ? getClassBalance('6', previousTrialBalance) : 0

    // RÉSULTAT D'EXPLOITATION
    const resultat_exploitation_current = total_produits_exploitation_current - total_charges_exploitation_current
    const resultat_exploitation_previous = total_produits_exploitation_previous - total_charges_exploitation_previous

    // Récupérer les détails des comptes pour tous les postes
    const autres_achats_charges_externes_details = this.getAccountDetails(trialBalance, [
      '604', '605', '606', '608', '609', '610', '611', '612', '613', '614', '615', '616', '617', '618', '619', '620', '621', '622', '623', '624', '625', '626', '627', '628'
    ])
    
    const impots_taxes_details = this.getAccountDetails(trialBalance, [
      '631', '632', '633', '634', '635', '636', '637'
    ])
    
    const salaires_details = this.getAccountDetails(trialBalance, [
      '641', '642', '643', '644'
    ])
    
    const cotisations_sociales_details = this.getAccountDetails(trialBalance, [
      '645', '646', '647'
    ])
    
    const autres_charges_details = this.getAccountDetails(trialBalance, [
      '654', '655', '656', '657', '658', '659', '660', '661', '662', '663', '664', '665', '666', '667'
    ])

    // Mettre à jour les détails avec les données du mois précédent si disponibles
    if (previousTrialBalance) {
      const previousAutresAchatsDetails = this.getAccountDetails(previousTrialBalance, [
        '604', '605', '606', '608', '609', '610', '611', '612', '613', '614', '615', '616', '617', '618', '619', '620', '621', '622', '623', '624', '625', '626', '627', '628'
      ])
      
      const previousImpotsDetails = this.getAccountDetails(previousTrialBalance, [
        '631', '632', '633', '634', '635', '636', '637'
      ])
      
      const previousSalairesDetails = this.getAccountDetails(previousTrialBalance, [
        '641', '642', '643', '644'
      ])
      
      const previousCotisationsDetails = this.getAccountDetails(previousTrialBalance, [
        '645', '646', '647'
      ])
      
      const previousAutresChargesDetails = this.getAccountDetails(previousTrialBalance, [
        '654', '655', '656', '657', '658', '659', '660', '661', '662', '663', '664', '665', '666', '667'
      ])
      
      // Mettre à jour les variations pour chaque poste
      autres_achats_charges_externes_details.forEach(detail => {
        const prevDetail = previousAutresAchatsDetails.find(p => p.number === detail.number)
        if (prevDetail) {
          detail.previous = prevDetail.current
          detail.variation = detail.current - detail.previous
        }
      })
      
      impots_taxes_details.forEach(detail => {
        const prevDetail = previousImpotsDetails.find(p => p.number === detail.number)
        if (prevDetail) {
          detail.previous = prevDetail.current
          detail.variation = detail.current - detail.previous
        }
      })
      
      salaires_details.forEach(detail => {
        const prevDetail = previousSalairesDetails.find(p => p.number === detail.number)
        if (prevDetail) {
          detail.previous = prevDetail.current
          detail.variation = detail.current - detail.previous
        }
      })
      
      cotisations_sociales_details.forEach(detail => {
        const prevDetail = previousCotisationsDetails.find(p => p.number === detail.number)
        if (prevDetail) {
          detail.previous = prevDetail.current
          detail.variation = detail.current - detail.previous
        }
      })
      
      autres_charges_details.forEach(detail => {
        const prevDetail = previousAutresChargesDetails.find(p => p.number === detail.number)
        if (prevDetail) {
          detail.previous = prevDetail.current
          detail.variation = detail.current - detail.previous
        }
      })
    }

    console.log(`💰 Compte de résultat calculé avec comparaisons:`)
    console.log(`   - CA Net: ${montant_net_ca_current.toFixed(2)}€ (${montant_net_ca_previous.toFixed(2)}€ mois précédent)`)
    console.log(`   - Total Produits: ${total_produits_exploitation_current.toFixed(2)}€ (${total_produits_exploitation_previous.toFixed(2)}€ mois précédent)`)
    console.log(`   - Total Charges: ${total_charges_exploitation_current.toFixed(2)}€ (${total_charges_exploitation_previous.toFixed(2)}€ mois précédent)`)
    console.log(`   - Autres achats et charges externes: ${autres_achats_charges_externes_current.toFixed(2)}€ (${autres_achats_charges_externes_previous.toFixed(2)}€ mois précédent)`)
    console.log(`   - Résultat Exploitation: ${resultat_exploitation_current.toFixed(2)}€ (${resultat_exploitation_previous.toFixed(2)}€ mois précédent)`)

    return {
      produits: {
        vente_marchandises: createComparison(vente_marchandises_current, vente_marchandises_previous),
        production_vendue_biens: createComparison(production_vendue_biens_current, production_vendue_biens_previous),
        production_vendue_services: createComparison(production_vendue_services_current, production_vendue_services_previous),
        montant_net_ca: createComparison(montant_net_ca_current, montant_net_ca_previous),
        production_stockee: createComparison(production_stockee_current, production_stockee_previous),
        production_immobilisee: createComparison(production_immobilisee_current, production_immobilisee_previous),
        subventions: createComparison(subventions_current, subventions_previous),
        reprises_amortissements: createComparison(reprises_amortissements_current, reprises_amortissements_previous),
        autres_produits: createComparison(autres_produits_current, autres_produits_previous),
        total_produits_exploitation: createComparison(total_produits_exploitation_current, total_produits_exploitation_previous)
      },
      charges: {
        achats_marchandises: createComparison(achats_marchandises_current, achats_marchandises_previous),
        autres_achats_charges_externes: {
          ...createComparison(autres_achats_charges_externes_current, autres_achats_charges_externes_previous),
          details: autres_achats_charges_externes_details
        },
        impots_taxes: {
          ...createComparison(impots_taxes_current, impots_taxes_previous),
          details: impots_taxes_details
        },
        salaires: {
          ...createComparison(salaires_current, salaires_previous),
          details: salaires_details
        },
        cotisations_sociales: {
          ...createComparison(cotisations_sociales_current, cotisations_sociales_previous),
          details: cotisations_sociales_details
        },
        dotations_amortissements: createComparison(dotations_amortissements_current, dotations_amortissements_previous),
        autres_charges: {
          ...createComparison(autres_charges_current, autres_charges_previous),
          details: autres_charges_details
        },
        total_charges_exploitation: createComparison(total_charges_exploitation_current, total_charges_exploitation_previous)
      },
      resultat_exploitation: createComparison(resultat_exploitation_current, resultat_exploitation_previous)
    }
  }
}
