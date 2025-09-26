// Service pour l'API Pennylane via proxy Vercel
const API_BASE_URL = '/api'
const API_KEY = import.meta.env.VITE_PENNYLANE_API_KEY

// Fonction utilitaire pour obtenir le mois actuel
const getCurrentMonth = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  return `${year}-${month}`
}

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
  ventes_706: number // VRAIES VENTES (compte 706 uniquement)
  chiffre_affaires: number // CA Net (comptes 701-708 moins 709)
  total_produits_exploitation: number // Total des produits d'exploitation (tous les comptes 7)
  charges: number
  resultat_net: number
  tresorerie_calculee: number // TRÉSORERIE CALCULÉE dans processTrialBalanceData
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

// Fonction supprimée : getLedgerEntries - Plus nécessaire avec le trial balance

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
        
        // Si on a exactement perPage items, il y a probablement une page suivante
        // même si l'API dit le contraire (bug de l'API pour des périodes longues)
        if (response.raw_data.items.length === perPage && totalPages === 1) {
          console.log(`⚠️ DÉTECTION: Page complète (${perPage} items) mais total_pages=1, forçage page suivante`)
          totalPages = 2 // Forcer au moins une page de plus
        }
      }
      
      // Mettre à jour les informations de pagination
      totalPages = Math.max(totalPages, response.raw_data.total_pages)
      currentPage++
      
      // Arrêter si la page est vide (vraie fin)
      if (response.raw_data.items && response.raw_data.items.length === 0) {
        console.log(`📄 Page ${currentPage - 1} vide, arrêt de la pagination`)
        break
      }
      
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

// Nouvelle fonction pour la trésorerie : du 1er janvier à la fin du mois sélectionné
function getCumulativeDateRange(selectedMonth: string): { startDate: string, endDate: string } {
  const [year, month] = selectedMonth.split('-')
  const startDate = `${year}-01-01` // DEPUIS LE 1ER JANVIER
  
  // Calculer le dernier jour du mois sélectionné
  const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate()
  const endDate = `${year}-${month}-${lastDayOfMonth.toString().padStart(2, '0')}`
  
  return { startDate, endDate }
}

function calculateProfitabilityRatio(
  ca: number, 
  resultat: number, 
  previousMonthCharges?: number,
  isCurrentMonth: boolean = false
): { ratio: number, message: string, montant: number, projection?: { ratio: number, message: string, montant: number } } {
  if (ca === 0) return { ratio: 0, message: "Aucun chiffre d'affaires", montant: resultat };
  
  // TOUJOURS garder le ratio réel (sans modification)
  const realRatio = Math.round((resultat / ca) * 100);
  
  let baseMessage = "";
  if (realRatio > 25) baseMessage = "Excellente rentabilité ! 🎉";
  else if (realRatio > 15) baseMessage = "Très bonne rentabilité 👍";
  else if (realRatio > 10) baseMessage = "Bonne rentabilité ✅";
  else if (realRatio > 5) baseMessage = "Rentabilité correcte 📊";
  else if (realRatio > 0) baseMessage = "Rentabilité faible ⚠️";
  else baseMessage = "Activité déficitaire 🔴";
  
  // Si c'est le mois en cours, calculer une projection séparée
  let projection = undefined
  if (isCurrentMonth && previousMonthCharges && previousMonthCharges > 0) {
    const estimatedMissingCharges = previousMonthCharges * 0.7 // 70% des charges du mois précédent
    const projectedResultat = resultat - estimatedMissingCharges
    const projectedRatio = Math.round((projectedResultat / ca) * 100);
    
    const monthNames = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ]
    const prevMonth = new Date()
    prevMonth.setMonth(prevMonth.getMonth() - 1)
    const prevMonthName = monthNames[prevMonth.getMonth()]
    
    projection = {
      ratio: projectedRatio,
      message: `Mois en cours - Projection basée sur ${prevMonthName}`,
      montant: projectedResultat
    }
    
    console.log(`💡 PROJECTION RENTABILITÉ: Réel ${realRatio}% → Projection ${projectedRatio}% (charges estimées: ${estimatedMissingCharges.toFixed(0)}€)`)
  }
  
  return { 
    ratio: realRatio, 
    message: baseMessage, 
    montant: resultat,
    projection
  };
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
  async getResultatComptable(selectedMonth: string = getCurrentMonth()): Promise<PennylaneResultatComptable[]> {
    try {
      console.log(`📊 Récupération du résultat comptable pour ${selectedMonth}...`)
      
      // Récupérer le trial balance pour le mois sélectionné (revenus/charges)
      const { startDate, endDate } = getMonthDateRange(selectedMonth)
      const trialBalance = await getTrialBalance(startDate, endDate, 1000)
      
      // Récupérer le trial balance cumulé pour la trésorerie
      const { startDate: cumulStartDate, endDate: cumulEndDate } = getCumulativeDateRange(selectedMonth)
      console.log(`📅 Période cumulée pour trésorerie: ${cumulStartDate} au ${cumulEndDate}`)
      console.log(`🔍 DEBUG: Appel getTrialBalance CUMULÉ...`)
      const trialBalanceCumul = await getTrialBalance(cumulStartDate, cumulEndDate, 2000)
      console.log(`🔍 DEBUG: Trial balance cumulé récupéré avec ${trialBalanceCumul.items.length} comptes`)
      
      if (!trialBalance.items || trialBalance.items.length === 0) {
        console.log('⚠️ Aucune donnée de trial balance trouvée pour getResultatComptable')
        console.log('🔍 trialBalance.items:', trialBalance.items)
        return []
      }
      
      console.log(`📋 ${trialBalance.items.length} comptes récupérés du trial balance pour getResultatComptable`)
      console.log(`📋 ${trialBalanceCumul.items.length} comptes récupérés du trial balance cumulé pour trésorerie`)
      
      // DEBUG: Vérifier les comptes 512 dans les deux trial balances
      const comptes512Mensuel = trialBalance.items.filter(account => account.number.startsWith('512'))
      const comptes512Cumul = trialBalanceCumul.items.filter(account => account.number.startsWith('512'))
      console.log(`🔍 DEBUG: Comptes 512 mensuel (${comptes512Mensuel.length}):`, comptes512Mensuel.map(c => `${c.number}: ${c.debits}€ - ${c.credits}€`))
      console.log(`🔍 DEBUG: Comptes 512 cumulé (${comptes512Cumul.length}):`, comptes512Cumul.map(c => `${c.number}: ${c.debits}€ - ${c.credits}€`))
      
      // Traiter les données avec les deux trial balances
      const processedData = this.processTrialBalanceData(trialBalance, selectedMonth, trialBalanceCumul)
      console.log('📊 Données traitées par processTrialBalanceData:', processedData.length, 'éléments')
      console.log('🔍 Premier élément:', processedData[0])
      
      return processedData
      
    } catch (error) {
      console.error('Erreur lors de la récupération du résultat comptable:', error)
      return []
    }
  },

  // Récupérer la trésorerie basée sur le trial balance
  // IMPORTANT: La trésorerie doit être calculée sur les soldes cumulés depuis le début d'exercice
  async getTresorerie(selectedMonth: string = getCurrentMonth(), viewMode: 'month' | 'year' = 'month', selectedYear: string = new Date().getFullYear().toString()): Promise<PennylaneTresorerie[]> {
    try {
      console.log(`💰 TRÉSORERIE: Mode ${viewMode}, période ${viewMode === 'month' ? selectedMonth : selectedYear}`)
      
      let startDate: string
      let endDate: string
      
      if (viewMode === 'year') {
        // Mode année : du 1er janvier au 31 décembre de l'année sélectionnée
        startDate = `${selectedYear}-01-01`
        endDate = `${selectedYear}-12-31`
        console.log(`💰 TRÉSORERIE ANNUELLE: ${startDate} au ${endDate}`)
      } else {
        // Mode mensuel : du 1er janvier jusqu'à la fin du mois sélectionné
        const [year, month] = selectedMonth.split('-')
        startDate = `${year}-01-01`
        
        // Calculer le dernier jour du mois sélectionné
        const monthNum = parseInt(month)
        const lastDay = new Date(parseInt(year), monthNum, 0).getDate() // 0 = dernier jour du mois précédent
        endDate = `${year}-${month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`
        
        console.log(`💰 TRÉSORERIE MENSUELLE: Soldes cumulés du ${startDate} au ${endDate}`)
      console.log(`🔍 DEBUG: Période demandée à l'API: ${startDate} → ${endDate}`)
      }
      
      // Récupérer le trial balance pour la période calculée (soldes cumulés)
      const trialBalance = await getTrialBalance(startDate, endDate, 1000)
      
      if (!trialBalance.items || trialBalance.items.length === 0) {
        console.log('⚠️ Aucune donnée de trial balance trouvée pour la trésorerie')
        return []
      }
      
      console.log(`📋 ${trialBalance.items.length} comptes récupérés du trial balance pour la trésorerie (soldes cumulés)`)
      
      // Traiter les données pour obtenir les vrais soldes bancaires
      return this.processTreasuryFromTrialBalance(trialBalance, selectedMonth)
      
    } catch (error) {
      console.error('Erreur lors de la récupération de la trésorerie:', error)
      return []
    }
  },


  // Fonction supprimée : processLedgerEntriesByMonth - Plus nécessaire avec le trial balance

  // Traiter les données du trial balance pour calculer les métriques
  processTrialBalanceData(
    trialBalance: TrialBalanceResponse, 
    selectedMonth: string = getCurrentMonth(),
    trialBalanceCumul?: TrialBalanceResponse
  ): PennylaneResultatComptable[] {
    // Analyser les comptes par classe
    const comptes7 = trialBalance.items.filter(account => account.number.startsWith('7')) // Revenus
    const comptes6 = trialBalance.items.filter(account => account.number.startsWith('6')) // Charges
    
    // Calculer le Chiffre d'Affaires Net (comptes 701-708 moins 709)
    const comptesCA = comptes7.filter(account => {
      const num = parseInt(account.number.substring(0, 3))
      return num >= 701 && num <= 708 // Comptes de ventes
    })
    
    const comptesRistournes = comptes7.filter(account => account.number.startsWith('709')) // Ristournes
    
    const chiffreAffairesBrut = comptesCA.reduce((total, account) => {
      const credits = this.parseAmount(account.credits)
      const debits = this.parseAmount(account.debits)
      return total + credits - debits
    }, 0)
    
    const ristournes = comptesRistournes.reduce((total, account) => {
      const credits = this.parseAmount(account.credits)
      const debits = this.parseAmount(account.debits)
      return total + debits - credits // Les ristournes sont en débit
    }, 0)
    
    const chiffreAffairesNet = chiffreAffairesBrut - ristournes
    
    // Calculer spécifiquement les ventes (compte 706 - prestations de services)
    let ventes706 = 0
    trialBalance.items.forEach(account => {
      const accountNumber = account.number
      if (accountNumber.startsWith('706')) {
        const credits = this.parseAmount(account.credits)
        const debits = this.parseAmount(account.debits)
        const solde = credits - debits // Pour les comptes de produits, c'est credits - debits
        ventes706 += solde
      }
    })
    
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
    
    // Calculer la trésorerie avec les comptes 512 (Banques) uniquement
    // Utiliser le trial balance cumulé (avec per_page=2000) pour avoir les vrais soldes cumulés
    const trialBalanceForTreasury = trialBalanceCumul || trialBalance
    const comptes512 = trialBalanceForTreasury.items.filter(account => account.number.startsWith('512'))
    
    console.log(`🔍 DEBUG TRÉSORERIE KPIs - CALCUL DÉTAILLÉ (${trialBalanceCumul ? 'CUMULÉ' : 'MENSUEL'}):`)
    console.log(`🔍 COMPTES 512 TROUVÉS: ${comptes512.length} comptes`)
    comptes512.forEach((account, index) => {
      console.log(`   ${index + 1}. ${account.number} (${account.label}) - Débits: ${account.debits}, Crédits: ${account.credits}`)
    })
    
    let tresorerie = 0
    
    comptes512.forEach((account, index) => {
      const credits = this.parseAmount(account.credits)
      const debits = this.parseAmount(account.debits)
      const solde = debits - credits // CORRECT: Pour les comptes bancaires (actif), solde = debits - credits
      
      console.log(`   ${index + 1}. ${account.number} (${account.label}):`)
      console.log(`      credits=${credits} (type: ${typeof credits})`)
      console.log(`      debits=${debits} (type: ${typeof debits})`)
      console.log(`      solde=${solde} (type: ${typeof solde})`)
      console.log(`      tresorerie avant: ${tresorerie}`)
      
      tresorerie += solde
      console.log(`      tresorerie après: ${tresorerie}`)
      console.log(`      ----`)
    })
    
    console.log(`💰 RÉSULTAT FINAL: Trésorerie ${trialBalanceCumul ? 'CUMULÉE' : 'MENSUELLE'} = ${tresorerie.toFixed(2)}€`)
    
    // Si aucun compte 512 dans le cumulé, essayer avec le mensuel
    if (comptes512.length === 0 && trialBalanceCumul) {
      console.log(`⚠️ FALLBACK: Aucun compte 512 dans le trial balance cumulé, utilisation du mensuel`)
      const comptes512Mensuel = trialBalance.items.filter(account => account.number.startsWith('512'))
      console.log(`🔍 COMPTES 512 MENSUELS TROUVÉS: ${comptes512Mensuel.length} comptes`)
      
      let tresorerieFallback = 0
      comptes512Mensuel.forEach((account, index) => {
        const credits = this.parseAmount(account.credits)
        const debits = this.parseAmount(account.debits)
        const solde = debits - credits
        tresorerieFallback += solde
        console.log(`   FALLBACK ${index + 1}. ${account.number}: ${solde.toFixed(2)}€`)
      })
      
      tresorerie = tresorerieFallback
      console.log(`💰 TRÉSORERIE FALLBACK (MENSUEL): ${tresorerie.toFixed(2)}€`)
    }
    
    // Créer un seul résultat pour le mois sélectionné
    const result: PennylaneResultatComptable[] = []
    
    result.push({
      period: selectedMonth,
      ventes_706: ventes706, // VRAIES VENTES (compte 706 uniquement)
      chiffre_affaires: chiffreAffairesNet, // CA Net (comptes 701-708 moins 709)
      total_produits_exploitation: totalProduitsExploitation, // Total des produits d'exploitation (tous les comptes 7)
      charges: charges,
      resultat_net: totalProduitsExploitation - charges, // Bénéfice = Revenus totaux - Charges
      tresorerie_calculee: tresorerie, // TRÉSORERIE CALCULÉE ICI !
      currency: 'EUR',
      prestations_services: chiffreAffairesNet, // CA Net pour les prestations
      ventes_biens: 0, // Pas de vente de biens pour DIMO DIAGNOSTIC
      achats: 0, // À calculer séparément si nécessaire
      charges_externes: charges * 0.8, // Estimation
      charges_personnel: charges * 0.2 // Estimation
    })
    
    return result
  },

  // Fonction supprimée : processLedgerEntriesData - Plus nécessaire avec le trial balance


  // Traiter les données de trésorerie à partir du trial balance
  // IMPORTANT: La trésorerie doit TOUJOURS être calculée sur les soldes cumulés (début d'exercice à aujourd'hui)
  // et NON sur les mouvements d'un seul mois
  processTreasuryFromTrialBalance(trialBalance: TrialBalanceResponse, selectedMonth: string = getCurrentMonth()): PennylaneTresorerie[] {
    console.log(`💰 Traitement de ${trialBalance.items.length} comptes pour la trésorerie...`)
    
    // Debug: Analyser TOUS les comptes de classe 5 pour comprendre
    const comptes5 = trialBalance.items.filter(account => account.number.startsWith('5'))
    console.log(`🔍 DEBUG - Tous les comptes classe 5: ${comptes5.length}`)
    comptes5.forEach(account => {
      const credits = this.parseAmount(account.credits)
      const debits = this.parseAmount(account.debits)
      const solde = credits - debits
      console.log(`   - ${account.number} (${account.label}): credits=${credits}, debits=${debits}, solde=${solde}`)
    })
    
    // Analyser spécifiquement les comptes 512 (Banques) pour la vraie trésorerie disponible
    const comptes512 = trialBalance.items.filter(account => account.number.startsWith('512'))
    
    console.log(`📋 Comptes banque (512) trouvés: ${comptes512.length}`)
    
    // Debug: Afficher les comptes 512 trouvés
    if (comptes512.length > 0) {
      console.log('🔍 Détail des comptes banque (512):')
      comptes512.forEach(account => {
        console.log(`   - ${account.number} (${account.label}): credits=${account.credits}, debits=${account.debits}`)
      })
    } else {
      console.log('⚠️ AUCUN compte 512 trouvé ! Vérifiez le plan comptable.')
    }
    
    // Calculer le solde total de trésorerie (comptes 512 uniquement)
    // Pour les comptes bancaires (classe 5), le solde = debits - credits
    let soldeTotal = 0
    console.log(`🔍 CALCUL DÉTAILLÉ DE LA TRÉSORERIE:`)
    
    comptes512.forEach((account, index) => {
      const credits = this.parseAmount(account.credits)
      const debits = this.parseAmount(account.debits)
      const solde = debits - credits // CORRECT: Pour les comptes bancaires (actif), solde = debits - credits
      
      console.log(`   ${index + 1}. ${account.number} (${account.label}):`)
      console.log(`      credits=${credits} (type: ${typeof credits})`)
      console.log(`      debits=${debits} (type: ${typeof debits})`)
      console.log(`      solde=${solde} (type: ${typeof solde})`)
      console.log(`      soldeTotal avant: ${soldeTotal}`)
      
      soldeTotal += solde
      console.log(`      soldeTotal après: ${soldeTotal}`)
      console.log(`      ----`)
    })
    
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
  async getTrialBalanceData(selectedMonth: string = getCurrentMonth()): Promise<TrialBalanceResponse> {
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
  async getPreviousMonthData(selectedMonth: string = getCurrentMonth()): Promise<TrialBalanceResponse | null> {
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

  // Traiter les données de charges par classes comptables pour le drill-down
  processChargesBreakdown(trialBalanceData: TrialBalanceResponse): Array<{code: string, label: string, description: string, amount: number}> {
    if (!trialBalanceData.items || trialBalanceData.items.length === 0) {
      return []
    }

    const chargesClasses: { [key: string]: { label: string, description: string } } = {
      '60': { label: 'Achats', description: 'Matériel non immobilisé, fournitures, Matériel de bureau etc' },
      '61': { label: 'Services extérieurs', description: 'Sous-traitance, Locations et Loyers, Assurances etc' },
      '62': { label: 'Autres services extérieurs', description: 'Réceptions, Publicité, Déplacements etc' },
      '63': { label: 'Impôts et taxes', description: 'Taxes professionnelles, contributions etc' },
      '64': { label: 'Charges de personnel', description: 'Salaires, Charges sociales etc' },
      '65': { label: 'Autres charges de gestion', description: 'Pertes sur conversions, ou irrécouvrables etc' },
      '66': { label: 'Charges financières', description: 'Intérêts d\'emprunts, commissions bancaires' },
      '67': { label: 'Charges exceptionnelles', description: 'Amendes, dons, charges non récurrentes' },
      '68': { label: 'Dotations aux amortissements', description: 'Amortissement du matériel, véhicules etc' }
    }

    const breakdown: { [key: string]: number } = {}

    // Initialiser toutes les classes
    Object.keys(chargesClasses).forEach(code => {
      breakdown[code] = 0
    })

    // Traitement des charges par classes comptables

    trialBalanceData.items.forEach(account => {
      const accountNumber = account.number
      const accountClass = accountNumber.substring(0, 2)
      
      if (chargesClasses[accountClass]) {
        const debits = this.parseAmount(account.debits)
        const credits = this.parseAmount(account.credits)
        const solde = debits - credits
        
        if (solde > 0) { // Seulement les soldes débiteurs pour les charges
          breakdown[accountClass] += solde
          
          // Accumulation silencieuse
        }
      }
    })

    // Convertir en tableau et filtrer les montants significatifs
    const result = Object.entries(breakdown)
      .filter(([_, amount]) => amount > 100) // Filtrer les montants < 100€
      .map(([code, amount]) => ({
        code,
        label: chargesClasses[code].label,
        description: chargesClasses[code].description,
        amount
      }))
      .sort((a, b) => b.amount - a.amount) // Trier par montant décroissant

    // Breakdown charges terminé

    return result
  },

  // Traiter les données de revenus par classes comptables pour le drill-down
  processRevenusBreakdown(trialBalanceData: TrialBalanceResponse): Array<{code: string, label: string, description: string, amount: number}> {
    if (!trialBalanceData.items || trialBalanceData.items.length === 0) {
      return []
    }

    const revenusClasses: { [key: string]: { label: string, description: string } } = {
      '701': { label: 'Ventes de marchandises', description: 'Revente de produits achetés' },
      '706': { label: 'Prestations de services', description: 'Services rendus aux clients' },
      '707': { label: 'Ventes de marchandises', description: 'Autres ventes de biens' },
      '708': { label: 'Autres produits d\'activité', description: 'Commissions, redevances, etc.' },
      '74': { label: 'Subventions d\'exploitation', description: 'Aides publiques reçues' },
      '75': { label: 'Autres produits de gestion', description: 'Produits exceptionnels récurrents' },
      '76': { label: 'Produits financiers', description: 'Intérêts perçus, gains de change' },
      '77': { label: 'Produits exceptionnels', description: 'Produits non récurrents' },
      '78': { label: 'Reprises amortissements', description: 'Reprises sur provisions' }
    }

    const breakdown: { [key: string]: number } = {}

    // Initialiser toutes les classes
    Object.keys(revenusClasses).forEach(code => {
      breakdown[code] = 0
    })

    // Traitement des revenus par classes comptables

    trialBalanceData.items.forEach(account => {
      const accountNumber = account.number
      let accountClass = ''
      
      // Déterminer la classe comptable (701, 706, 707, 708, 74, 75, 76, 77, 78)
      if (accountNumber.startsWith('701')) accountClass = '701'
      else if (accountNumber.startsWith('706')) accountClass = '706'  
      else if (accountNumber.startsWith('707')) accountClass = '707'
      else if (accountNumber.startsWith('708')) accountClass = '708'
      else if (accountNumber.startsWith('74')) accountClass = '74'
      else if (accountNumber.startsWith('75')) accountClass = '75'
      else if (accountNumber.startsWith('76')) accountClass = '76'
      else if (accountNumber.startsWith('77')) accountClass = '77'
      else if (accountNumber.startsWith('78')) accountClass = '78'
      
      if (revenusClasses[accountClass]) {
        const credits = this.parseAmount(account.credits)
        const debits = this.parseAmount(account.debits)
        const solde = credits - debits // Pour les comptes de produits, c'est credits - debits
        
        if (solde > 0) { // Seulement les soldes créditeurs pour les produits
          breakdown[accountClass] += solde
          
          // Accumulation silencieuse
        }
      }
    })

    // Convertir en tableau et filtrer les montants significatifs
    const result = Object.entries(breakdown)
      .filter(([_, amount]) => amount > 100) // Filtrer les montants < 100€
      .map(([code, amount]) => ({
        code,
        label: revenusClasses[code].label,
        description: revenusClasses[code].description,
        amount
      }))
      .sort((a, b) => b.amount - a.amount) // Trier par montant décroissant

    // Breakdown revenus terminé

    return result
  },

  // Traiter les données de trésorerie par comptes bancaires pour le drill-down
  processTresorerieBreakdown(trialBalanceData: TrialBalanceResponse): Array<{code: string, label: string, description: string, amount: number}> {
    if (!trialBalanceData.items || trialBalanceData.items.length === 0) {
      return []
    }

    const result: Array<{code: string, label: string, description: string, amount: number}> = []

    // Analyser TOUS les comptes de classe 5 pour voir ce qu'on a
    const comptes5 = trialBalanceData.items.filter(account => account.number.startsWith('5'))
    
    comptes5.forEach(account => {
      const credits = this.parseAmount(account.credits)
      const debits = this.parseAmount(account.debits)
      const solde = debits - credits // Pour les comptes d'actif (classe 5), solde = debits - credits
      
      if (Math.abs(solde) > 10) { // Filtrer les soldes significatifs (> 10€)
        let description = "Compte de trésorerie"
        
        // Déterminer la description selon le type de compte
        if (account.number.startsWith('512')) {
          description = "Compte bancaire courant"
        } else if (account.number.startsWith('514')) {
          description = "Chèques postaux"
        } else if (account.number.startsWith('515')) {
          description = "Caisse"
        } else if (account.number.startsWith('516')) {
          description = "Régies d'avances"
        } else if (account.number.startsWith('518')) {
          description = "Autres disponibilités"
        } else if (account.number.startsWith('519')) {
          description = "Concours bancaires courants"
        }
        
        result.push({
          code: account.number,
          label: account.label || `Compte ${account.number}`,
          description: description,
          amount: solde
        })
      }
    })

    // Trier par montant décroissant (plus gros soldes en premier)
    result.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))

    // Breakdown trésorerie terminé

    return result
  },

  // Récupérer les KPIs consolidés
  async getKPIs(selectedMonth: string = getCurrentMonth()): Promise<{
    ventes_706: number | null
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
      montant: number
    } | null
    // Nouvelles comparaisons
    ventes_growth: number | null
    ca_growth: number | null
    total_produits_growth: number | null
    charges_growth: number | null
    resultat_growth: number | null
    tresorerie_growth: number | null
  }> {
    try {
      console.log(`📊 Récupération des KPIs pour ${selectedMonth}...`)
      
      // Calculer le mois précédent
      const [year, month] = selectedMonth.split('-')
      const previousMonth = month === '01' 
        ? `${parseInt(year) - 1}-12` 
        : `${year}-${(parseInt(month) - 1).toString().padStart(2, '0')}`
      
      console.log(`📊 Récupération des données pour ${selectedMonth} et comparaison avec ${previousMonth}`)
      
      const [resultatData, tresorerieData, previousResultatData, previousTresorerieData] = await Promise.all([
        this.getResultatComptable(selectedMonth),
        this.getTresorerie(selectedMonth),
        this.getResultatComptable(previousMonth).catch(() => []), // Fallback si pas de données
        this.getTresorerie(previousMonth).catch(() => []) // Fallback si pas de données
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
          ventes_706: null,
          chiffre_affaires: null,
          total_produits_exploitation: null,
          charges: null,
          resultat_net: null,
          solde_tresorerie: null,
          growth: null,
          hasData: false,
          rentabilite: null,
          ventes_growth: null,
          ca_growth: null,
          total_produits_growth: null,
          charges_growth: null,
          resultat_growth: null,
          tresorerie_growth: null
        }
      }
      
      // Prendre les données du mois sélectionné
      const currentResultat = resultatData[0] // Premier (et seul) élément pour le mois sélectionné
      const currentTresorerie = tresorerieData[0] // Premier (et seul) élément pour le mois sélectionné
      
      // Prendre les données du mois précédent (si disponibles)
      const previousResultat = previousResultatData.length > 0 ? previousResultatData[0] : null
      const previousTresorerie = previousTresorerieData.length > 0 ? previousTresorerieData[0] : null
      
      // Calculer les variations par rapport au mois précédent
      const calculateGrowth = (current: number, previous: number | null) => {
        if (!previous || previous === 0) return null
        const growth = ((current - previous) / Math.abs(previous)) * 100
        return Math.round(growth * 100) / 100 // Arrondir à 2 décimales
      }
      
      const ventesGrowth = calculateGrowth(currentResultat.ventes_706 || 0, previousResultat?.ventes_706 || null)
      const caGrowth = calculateGrowth(currentResultat.chiffre_affaires || 0, previousResultat?.chiffre_affaires || null)
      const totalProduitsGrowth = calculateGrowth(currentResultat.total_produits_exploitation || 0, previousResultat?.total_produits_exploitation || null)
      const chargesGrowth = calculateGrowth(currentResultat.charges || 0, previousResultat?.charges || null)
      const resultatGrowth = calculateGrowth(currentResultat.resultat_net || 0, previousResultat?.resultat_net || null)
      const tresorerieGrowth = calculateGrowth(currentTresorerie.solde_final || 0, previousTresorerie?.solde_final || null)
      
      // Détecter si c'est le mois en cours
      const today = new Date()
      const currentMonthKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`
      const isCurrentMonth = selectedMonth === currentMonthKey
      
      // Calculer le ratio de rentabilité avec projection si nécessaire
      const rentabilite = calculateProfitabilityRatio(
        currentResultat.chiffre_affaires || 0,
        currentResultat.resultat_net || 0,
        previousResultat?.charges || undefined,
        isCurrentMonth
      );

      return {
        ventes_706: currentResultat.ventes_706, // VRAIES VENTES
        chiffre_affaires: currentResultat.chiffre_affaires,
        total_produits_exploitation: currentResultat.total_produits_exploitation,
        charges: currentResultat.charges,
        resultat_net: currentResultat.resultat_net,
        solde_tresorerie: currentResultat.tresorerie_calculee,
        growth: caGrowth, // Garder pour compatibilité
        hasData: true,
        rentabilite,
        // Nouvelles comparaisons
        ventes_growth: ventesGrowth, // Croissance des vraies ventes
        ca_growth: caGrowth,
        total_produits_growth: totalProduitsGrowth,
        charges_growth: chargesGrowth,
        resultat_growth: resultatGrowth,
        tresorerie_growth: tresorerieGrowth
      }
      
    } catch (error) {
      console.error('Erreur lors de la récupération des KPIs:', error)
      return {
        ventes_706: null,
        chiffre_affaires: null,
        total_produits_exploitation: null,
        charges: null,
        resultat_net: null,
        solde_tresorerie: null,
        growth: null,
        hasData: false,
        rentabilite: null,
        ventes_growth: null,
        ca_growth: null,
        total_produits_growth: null,
        charges_growth: null,
        resultat_growth: null,
        tresorerie_growth: null
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
  },

  // NOUVELLE FONCTION TRÉSORERIE - UTILISE LES DONNÉES MENSUELLES
  async getTresorerieActuelle(selectedMonth: string = getCurrentMonth()): Promise<number> {
    try {
      console.log(`💰 NOUVELLE FONCTION TRÉSORERIE pour ${selectedMonth}`)
      
      // SOLUTION: Utiliser les données mensuelles car l'API ne retourne pas les comptes 512 en cumulé
      const { startDate, endDate } = getMonthDateRange(selectedMonth)
      
      console.log(`💰 Période MENSUELLE demandée: ${startDate} au ${endDate}`)
      console.log(`💡 RAISON: L'API ne retourne pas les comptes 512 en données cumulées`)
      
      // Appel direct à l'API pour récupérer le trial balance mensuel
      const trialBalance = await getTrialBalance(startDate, endDate, 2000)
      
      console.log(`💰 Trial balance récupéré: ${trialBalance.items.length} comptes`)
      
      // Filtrer uniquement les comptes 512 (banques)
      const comptes512 = trialBalance.items.filter(account => account.number.startsWith('512'))
      
      console.log(`💰 Comptes 512 trouvés: ${comptes512.length}`)
      
      if (comptes512.length === 0) {
        console.log('⚠️ AUCUN compte 512 trouvé même en mensuel !')
        return 0
      }
      
      // ANALYSE DÉTAILLÉE DES DONNÉES MENSUELLES
      console.log(`🔍 ANALYSE DÉTAILLÉE DES COMPTES 512 (MENSUEL):`)
      comptes512.forEach((account, index) => {
        const credits = this.parseAmount(account.credits)
        const debits = this.parseAmount(account.debits)
        const solde = debits - credits
        
        console.log(`   ${index + 1}. ${account.number} (${account.label}):`)
        console.log(`      - Crédits: ${credits}€ (type: ${typeof credits})`)
        console.log(`      - Débits: ${debits}€ (type: ${typeof debits})`)
        console.log(`      - Solde: ${solde}€ (débits - crédits)`)
        console.log(`      - Période: ${startDate} au ${endDate} (MENSUEL)`)
        console.log(`      - Données mensuelles du mois ${selectedMonth}`)
        console.log(`      ----`)
      })
      
      // Calculer la trésorerie totale
      let tresorerie = 0
      
      comptes512.forEach((account) => {
        const credits = this.parseAmount(account.credits)
        const debits = this.parseAmount(account.debits)
        const solde = debits - credits // Pour les comptes bancaires (actif), solde = debits - credits
        
        tresorerie += solde
      })
      
      console.log(`💰 TRÉSORERIE FINALE (MENSUEL): ${tresorerie.toFixed(2)}€`)
      console.log(`✅ SOLUTION: Utilisation des données mensuelles car l'API ne fournit pas les comptes 512 en cumulé`)
      
      return tresorerie
      
    } catch (error) {
      console.error('❌ Erreur dans getTresorerieActuelle:', error)
      return 0
    }
  }
}
