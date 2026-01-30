// Script d'importation des données historiques 2021-2024
// Utilise la même logique que api/sync.js mais pour les années passées
// 
// IMPORTANT: Ces données sont des exercices clôturés et ne changeront jamais.
// Pas besoin de synchronisation régulière pour ces années.

const { Pool } = require('pg')

// Configuration de la base de données
const connectionString = process.env.POSTGRES_URL || 
                       process.env.NEON_URL || 
                       'postgresql://neondb_owner:npg_yt1EHs6Nmrwn@ep-cool-queen-ageztocn-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require'

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
})

// Fonction pour récupérer les données Pennylane (même logique que api/sync.js)
async function getTrialBalanceFromPennylane(startDate, endDate) {
  try {
    const url = `https://app.pennylane.com/api/external/v2/trial_balance?period_start=${startDate}&period_end=${endDate}&is_auxiliary=false&page=1&per_page=1000`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.VITE_PENNYLANE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Erreur API Pennylane: ${response.status} - ${response.statusText} - ${errorText}`)
    }
    
    const responseData = await response.json()
    
    if (!responseData.items || responseData.items.length === 0) {
      throw new Error('Aucune donnée disponible dans Pennylane pour cette période')
    }
    
    return responseData
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des données Pennylane:', error)
    throw error
  }
}

// Fonctions de calcul (copiées de api/sync.js)
// Comptes à exclure de la masse salariale (doivent être dans les charges mais pas dans la masse salariale)
const EXCLUDED_FROM_MASSE_SALARIALE = ['646', '646001', '64114', '64115']

// Fonction helper pour vérifier si un compte doit être exclu de la masse salariale
function isExcludedFromMasseSalariale(accountNumber) {
  return EXCLUDED_FROM_MASSE_SALARIALE.some(excluded => 
    accountNumber === excluded || accountNumber.startsWith(excluded)
  )
}

// Fonction pour calculer les charges fixes à partir des comptes spécifiés
function calculateFixedCharges(trialBalance) {
  const items = trialBalance.items || []
  let charges_fixes = 0
  const charges_fixes_breakdown = {
    essence_peage_parking: 0,      // 60614, 62511, 62512
    leasings: 0,                    // 612...
    locations_logiciels_loyers: 0,  // 613...
    assurances: 0,                  // 616...
    salaires_cotisations: 0,       // 64... (TOUS, même ceux exclus ailleurs)
    honoraires_divers: 0,           // 622, 6226, 62263, 62265 (comptes exacts)
    telephone_internet: 0           // 6262
  }
  
  // Comptes exacts pour honoraires divers
  const honorairesAccounts = ['622', '6226', '62263', '62265']
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    const debit = parseFloat(item.debit || '0')
    const credit = parseFloat(item.credit || '0')
    const solde = debit - credit
    
    // 60614, 62511, 62512 (essence, péage et parking)
    if (accountNumber === '60614' || accountNumber === '62511' || accountNumber === '62512') {
      charges_fixes += solde
      charges_fixes_breakdown.essence_peage_parking += solde
    }
    
    // 612... (leasings)
    if (accountNumber.startsWith('612')) {
      charges_fixes += solde
      charges_fixes_breakdown.leasings += solde
    }
    
    // 613... (locations, logiciels et loyers)
    if (accountNumber.startsWith('613')) {
      charges_fixes += solde
      charges_fixes_breakdown.locations_logiciels_loyers += solde
    }
    
    // 616... (assurances)
    if (accountNumber.startsWith('616')) {
      charges_fixes += solde
      charges_fixes_breakdown.assurances += solde
    }
    
    // 64... (salaires et cotisations) - TOUS les comptes, même ceux exclus ailleurs
    if (accountNumber.startsWith('64')) {
      if (solde > 0) { // Seulement les soldes positifs (pas d'extournes)
        charges_fixes += solde
        charges_fixes_breakdown.salaires_cotisations += solde
      }
    }
    
    // 622, 6226, 62263, 62265 (honoraires divers) - uniquement ces comptes exacts
    if (honorairesAccounts.includes(accountNumber)) {
      charges_fixes += solde
      charges_fixes_breakdown.honoraires_divers += solde
    }
    
    // 6262 (téléphone et internet)
    if (accountNumber === '6262') {
      charges_fixes += solde
      charges_fixes_breakdown.telephone_internet += solde
    }
  })
  
  return {
    charges_fixes: Math.round(charges_fixes * 100) / 100,
    charges_fixes_breakdown
  }
}

function calculateKPIsFromTrialBalance(trialBalance, month) {
  const items = trialBalance.items || []
  
  let ventes_706 = 0
  let revenus_totaux = 0
  let charges = 0
  let charges_salariales = 0
  let tresorerie = 0
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    const debit = parseFloat(item.debits || '0')
    const credit = parseFloat(item.credits || '0')
    
    // Ventes 706 (compte 706 uniquement) - Solde créditeur
    if (accountNumber.startsWith('706')) {
      ventes_706 += (credit - debit)
    }
    
    // Revenus totaux (tous les comptes de la classe 7)
    if (accountNumber.startsWith('7')) {
      revenus_totaux += (credit - debit)
    }
    
    // Charges (classe 6) - Solde débiteur des comptes de charges
    if (accountNumber.startsWith('6')) {
      const solde = debit - credit
      charges += solde
    }
    
    // Charges salariales (comptes 64) - Exclure les comptes spécifiés
    if (accountNumber.startsWith('64') && !isExcludedFromMasseSalariale(accountNumber)) {
      const solde = debit - credit
      if (solde > 0) {
        charges_salariales += solde
      }
    }
    
    // Trésorerie (comptes 512)
    if (accountNumber.startsWith('512')) {
      tresorerie += (debit - credit)
    }
  })
  
  // Calculer les charges fixes
  const fixedChargesData = calculateFixedCharges(trialBalance)
  
  // S'assurer que charges_fixes >= charges_salariales (car charges_fixes inclut TOUS les comptes 64...)
  const charges_fixes = Math.max(fixedChargesData.charges_fixes, charges_salariales)
  
  return {
    ventes_706,
    revenus_totaux,
    charges,
    charges_salariales,
    charges_fixes: charges_fixes,
    charges_fixes_breakdown: fixedChargesData.charges_fixes_breakdown,
    resultat_net: revenus_totaux - charges,
    tresorerie,
    currency: 'EUR',
    period: month
  }
}

function calculateChargesBreakdown(trialBalance) {
  const items = trialBalance.items || []
  const breakdown = {}
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    if (accountNumber.startsWith('6')) {
      const debit = parseFloat(item.debits || '0')
      const credit = parseFloat(item.credits || '0')
      const solde = debit - credit
      
      const label = item.label || `Compte ${accountNumber}`
      
      if (!breakdown[accountNumber]) {
        breakdown[accountNumber] = {
          number: accountNumber,
          label: label,
          amount: 0
        }
      }
      
      breakdown[accountNumber].amount += solde
    }
  })
  
  return breakdown
}

function calculateChargesSalarialesBreakdown(trialBalance) {
  const items = trialBalance.items || []
  const breakdown = {}
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    // Exclure les comptes spécifiés de la masse salariale
    if (accountNumber.startsWith('64') && !isExcludedFromMasseSalariale(accountNumber)) {
      const debit = parseFloat(item.debits || '0')
      const credit = parseFloat(item.credits || '0')
      const solde = debit - credit
      
      if (solde > 0) {
        const label = item.label || `Compte ${accountNumber}`
        
        breakdown[accountNumber] = {
          number: accountNumber,
          label: label,
          amount: solde
        }
      }
    }
  })
  
  return breakdown
}

function calculateRevenusBreakdown(trialBalance) {
  const items = trialBalance.items || []
  const breakdown = {}
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    if (accountNumber.startsWith('7')) {
      const debit = parseFloat(item.debits || '0')
      const credit = parseFloat(item.credits || '0')
      const amount = credit - debit
      
      const label = item.label || `Compte ${accountNumber}`
      
      if (!breakdown[accountNumber]) {
        breakdown[accountNumber] = {
          number: accountNumber,
          label: label,
          amount: 0
        }
      }
      
      breakdown[accountNumber].amount += amount
    }
  })
  
  return breakdown
}

function calculateTresorerieBreakdown(trialBalance) {
  const items = trialBalance.items || []
  const breakdown = {}
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    if (accountNumber.startsWith('512')) {
      const debit = parseFloat(item.debits || '0')
      const credit = parseFloat(item.credits || '0')
      const balance = debit - credit
      
      if (balance !== 0) {
        const label = item.label || `Compte ${accountNumber}`
        
        breakdown[accountNumber] = {
          number: accountNumber,
          label: label,
          balance: balance
        }
      }
    }
  })
  
  return breakdown
}

// Fonction principale d'importation
async function importHistoricalData() {
  const client = await pool.connect()
  
  try {
    console.log('🚀 Début de l\'importation des données historiques...')
    
    // Années à importer
    const years = ['2021', '2022', '2023', '2024']
    let totalRecordsProcessed = 0
    
    for (const year of years) {
      console.log(`\n📅 Importation de l'année ${year}...`)
      
      // Générer tous les mois de l'année
      for (let month = 1; month <= 12; month++) {
        const monthFormatted = month.toString().padStart(2, '0')
        const monthKey = `${year}-${monthFormatted}`
        
        try {
          console.log(`📊 Traitement de ${monthKey}...`)
          
          // Calculer les dates de début et fin du mois
          const startDate = `${year}-${monthFormatted}-01`
          const endDate = new Date(parseInt(year), month, 0).toISOString().slice(0, 10)
          
          // Récupérer les données Pennylane
          const trialBalance = await getTrialBalanceFromPennylane(startDate, endDate)
          
          // Calculer les KPIs et breakdowns
          const kpis = calculateKPIsFromTrialBalance(trialBalance, monthKey)
          const chargesBreakdown = calculateChargesBreakdown(trialBalance)
          const chargesSalarialesBreakdown = calculateChargesSalarialesBreakdown(trialBalance)
          const revenusBreakdown = calculateRevenusBreakdown(trialBalance)
          const tresorerieBreakdown = calculateTresorerieBreakdown(trialBalance)
          
          // Insérer dans la base de données (données historiques = jamais modifiées)
          const insertResult = await client.query(`
            INSERT INTO monthly_data (
              month, year, month_number, trial_balance, kpis, 
              charges_breakdown, charges_salariales_breakdown, revenus_breakdown, tresorerie_breakdown,
              is_current_month, sync_version
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)
            ON CONFLICT (month) DO NOTHING
          `, [
            monthKey, year, month,
            JSON.stringify(trialBalance),
            JSON.stringify(kpis),
            JSON.stringify(chargesBreakdown),
            JSON.stringify(chargesSalarialesBreakdown),
            JSON.stringify(revenusBreakdown),
            JSON.stringify(tresorerieBreakdown),
            false // is_current_month = false pour les années passées
          ])
          
          totalRecordsProcessed++
          console.log(`✅ ${monthKey} importé avec succès`)
          
          // Petite pause pour éviter de surcharger l'API
          await new Promise(resolve => setTimeout(resolve, 100))
          
        } catch (monthError) {
          console.error(`❌ Erreur pour ${monthKey}:`, monthError.message)
          // Continuer avec le mois suivant
        }
      }
    }
    
    console.log(`\n🎉 Importation terminée ! ${totalRecordsProcessed} mois traités.`)
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'importation:', error)
    throw error
  } finally {
    client.release()
  }
}

// Exécuter le script
if (require.main === module) {
  importHistoricalData()
    .then(() => {
      console.log('✅ Script d\'importation terminé avec succès')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erreur lors de l\'importation:', error)
      process.exit(1)
    })
}

module.exports = { importHistoricalData }
