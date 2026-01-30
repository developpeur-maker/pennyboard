// Script pour récupérer les données historiques de Pennylane et les insérer dans Neon
// Exécuter avec: node scripts/fetch-and-insert-historical.js

const { Pool } = require('pg')

// Configuration de la base de données Neon
const connectionString = process.env.POSTGRES_URL || 
                       process.env.NEON_URL || 
                       'postgresql://neondb_owner:npg_yt1EHs6Nmrwn@ep-cool-queen-ageztocn-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require'

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
})

// Fonction pour récupérer les données Pennylane
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

// Fonctions de calcul des KPIs (copiées de api/sync.js)
function calculateKPIsFromTrialBalance(trialBalance, month) {
  const items = trialBalance.items || []
  
  let ventes_706 = 0
  let revenus_totaux = 0
  let charges = 0
  let charges_salariales = 0
  let tresorerie = 0
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    const debit = parseFloat(item.debit) || 0
    const credit = parseFloat(item.credit) || 0
    
    // Ventes 706
    if (accountNumber.startsWith('706')) {
      ventes_706 += credit - debit
    }
    
    // Revenus totaux (classe 7)
    if (accountNumber.startsWith('7')) {
      revenus_totaux += credit - debit
    }
    
    // Charges (classe 6)
    if (accountNumber.startsWith('6')) {
      charges += debit - credit
    }
    
    // Charges salariales (classe 64) - Exclure les comptes spécifiés
    if (accountNumber.startsWith('64') && !isExcludedFromMasseSalariale(accountNumber)) {
      const solde = debit - credit
      if (solde > 0) {
        charges_salariales += solde
      }
    }
    
    // Trésorerie (comptes 512)
    if (accountNumber.startsWith('512')) {
      tresorerie += debit - credit
    }
  })
  
  const resultat_net = revenus_totaux - charges
  
  // Calculer les charges fixes
  const fixedChargesData = calculateFixedCharges(trialBalance)
  
  // S'assurer que charges_fixes >= charges_salariales (car charges_fixes inclut TOUS les comptes 64...)
  const charges_fixes = Math.max(fixedChargesData.charges_fixes, charges_salariales)
  
  return {
    period: month,
    ventes_706: Math.round(ventes_706 * 100) / 100,
    chiffre_affaires: Math.round(ventes_706 * 100) / 100,
    revenus_totaux: Math.round(revenus_totaux * 100) / 100,
    charges: Math.round(charges * 100) / 100,
    charges_salariales: Math.round(charges_salariales * 100) / 100,
    charges_fixes: charges_fixes,
    charges_fixes_breakdown: fixedChargesData.charges_fixes_breakdown,
    resultat_net: Math.round(resultat_net * 100) / 100,
    solde_tresorerie: Math.round(tresorerie * 100) / 100
  }
}

function calculateChargesBreakdown(trialBalance) {
  const breakdown = {}
  const items = trialBalance.items || []
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    if (accountNumber.startsWith('6')) {
      const debit = parseFloat(item.debit) || 0
      const credit = parseFloat(item.credit) || 0
      const solde = debit - credit
      
      if (solde !== 0) {
        breakdown[accountNumber] = {
          label: item.label || `Compte ${accountNumber}`,
          amount: Math.round(solde * 100) / 100
        }
      }
    }
  })
  
  return breakdown
}

function calculateRevenusBreakdown(trialBalance) {
  const breakdown = {}
  const items = trialBalance.items || []
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    if (accountNumber.startsWith('7')) {
      const debit = parseFloat(item.debit) || 0
      const credit = parseFloat(item.credit) || 0
      const solde = credit - debit
      
      if (solde !== 0) {
        breakdown[accountNumber] = {
          label: item.label || `Compte ${accountNumber}`,
          amount: Math.round(solde * 100) / 100
        }
      }
    }
  })
  
  return breakdown
}

function calculateTresorerieBreakdown(trialBalance) {
  const breakdown = {}
  const items = trialBalance.items || []
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    if (accountNumber.startsWith('512')) {
      const debit = parseFloat(item.debit) || 0
      const credit = parseFloat(item.credit) || 0
      const solde = debit - credit
      
      if (solde !== 0) {
        breakdown[accountNumber] = {
          label: item.label || `Compte ${accountNumber}`,
          amount: Math.round(solde * 100) / 100
        }
      }
    }
  })
  
  return breakdown
}

function calculateChargesSalarialesBreakdown(trialBalance) {
  const breakdown = {}
  const items = trialBalance.items || []
  
  items.forEach((item) => {
    const accountNumber = item.number || ''
    // Exclure les comptes spécifiés de la masse salariale
    if (accountNumber.startsWith('64') && !isExcludedFromMasseSalariale(accountNumber)) {
      const debit = parseFloat(item.debit) || 0
      const credit = parseFloat(item.credit) || 0
      const solde = debit - credit
      
      if (solde > 0) {
        breakdown[accountNumber] = {
          label: item.label || `Compte ${accountNumber}`,
          amount: Math.round(solde * 100) / 100
        }
      }
    }
  })
  
  return breakdown
}

// Fonction principale
async function fetchAndInsertHistoricalData() {
  console.log('🚀 Début de la récupération des données historiques de Pennylane...')
  
  const client = await pool.connect()
  
  try {
    // Années à traiter
    const years = [2021, 2022, 2023, 2024]
    let totalProcessed = 0
    
    for (const year of years) {
      console.log(`\n📅 Traitement de l'année ${year}...`)
      
      for (let month = 1; month <= 12; month++) {
        const monthFormatted = month.toString().padStart(2, '0')
        const monthKey = `${year}-${monthFormatted}`
        
        console.log(`📊 Traitement de ${monthKey}...`)
        
        try {
          // Dates pour la période
          const startDate = `${year}-${monthFormatted}-01`
          const endDate = new Date(year, month, 0).toISOString().split('T')[0] // Dernier jour du mois
          
          // Récupérer les données Pennylane
          const trialBalance = await getTrialBalanceFromPennylane(startDate, endDate)
          
          // Calculer les KPIs
          const kpis = calculateKPIsFromTrialBalance(trialBalance, monthKey)
          
          // Calculer les breakdowns
          const chargesBreakdown = calculateChargesBreakdown(trialBalance)
          const revenusBreakdown = calculateRevenusBreakdown(trialBalance)
          const tresorerieBreakdown = calculateTresorerieBreakdown(trialBalance)
          const chargesSalarialesBreakdown = calculateChargesSalarialesBreakdown(trialBalance)
          
          // Insérer dans la base de données
          await client.query(`
            INSERT INTO monthly_data (
              month, year, month_number, trial_balance, kpis,
              charges_breakdown, charges_salariales_breakdown, revenus_breakdown, tresorerie_breakdown,
              is_current_month, sync_version
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)
            ON CONFLICT (month) DO UPDATE SET
              trial_balance = EXCLUDED.trial_balance,
              kpis = EXCLUDED.kpis,
              charges_breakdown = EXCLUDED.charges_breakdown,
              charges_salariales_breakdown = EXCLUDED.charges_salariales_breakdown,
              revenus_breakdown = EXCLUDED.revenus_breakdown,
              tresorerie_breakdown = EXCLUDED.tresorerie_breakdown,
              updated_at = CURRENT_TIMESTAMP
          `, [
            monthKey, year, month,
            JSON.stringify(trialBalance),
            JSON.stringify(kpis),
            JSON.stringify(chargesBreakdown),
            JSON.stringify(chargesSalarialesBreakdown),
            JSON.stringify(revenusBreakdown),
            JSON.stringify(tresorerieBreakdown),
            false // is_current_month
          ])
          
          console.log(`✅ ${monthKey} inséré avec succès`)
          totalProcessed++
          
          // Pause pour éviter le rate limit
          await new Promise(resolve => setTimeout(resolve, 1000))
          
        } catch (error) {
          console.error(`❌ Erreur pour ${monthKey}:`, error.message)
        }
      }
    }
    
    console.log(`\n🎉 Importation terminée ! ${totalProcessed} mois traités.`)
    
  } finally {
    client.release()
    await pool.end()
  }
}

// Exécuter le script
if (require.main === module) {
  fetchAndInsertHistoricalData()
    .then(() => {
      console.log('✅ Script terminé avec succès')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erreur:', error)
      process.exit(1)
    })
}

module.exports = { fetchAndInsertHistoricalData }
