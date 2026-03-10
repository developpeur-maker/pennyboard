/**
 * GET ?year=2025
 * Retourne les données agrégées pour le seuil de rentabilité :
 * - balance 2025 : ventes_706, charges, autres_produits, insertions_6231
 * - etpByService : ETP calculés par service (Diagnostiqueurs, Commerciaux, etc.) depuis Payfit
 */
const { Pool } = require('pg')

const JOURS_MAX_ANNUEL = 217

// Comptes "indemnités et avantages en nature" (Tech → jours = montant / 9.9)
const PREFIX_INDEMNITES = ['6414', '6417']

// Comptes "titres-restaurant charges salariales" (autres → jours = montant / 3.2)
const PREFIX_TITRES = ['6476'] // Titres-restaurant - charges salariales (commerciaux / non-tech)

function getTagFromEmployee(emp) {
  const ops = emp.operations || []
  for (const op of ops) {
    const codes = op.analyticCodes || []
    for (const c of codes) {
      const t = (c.type || '').toLowerCase()
      if (t === 'équipe' || t === 'equipe' || t === 'team') {
        return (c.value || '').trim()
      }
    }
  }
  return null
}

function isTech(tag) {
  return tag && String(tag).toUpperCase().includes('TECH')
}

function isCommercial(tag) {
  return tag && String(tag).toUpperCase().includes('COMMERCIAL')
}

function serviceFromTag(tag) {
  if (!tag) return 'Autres'
  const u = String(tag).toUpperCase()
  if (u.includes('TECH')) return 'Diagnostiqueurs'
  if (u.includes('COMMERCIAL')) return 'Commerciaux'
  if (u.includes('RH')) return 'HR'
  if (u.includes('COMPTA')) return 'Comptable'
  if (u.includes('SUPPORT')) return 'Support technique'
  if (u.includes('PLANIFICATION') || u.includes('CLIENT')) return 'Support client & planification'
  if (u.includes('DEV') || u.includes('MARKET')) return 'Dev & Market'
  return 'Autres'
}

function joursFromOperations(operations, tag) {
  let indemnites = 0
  let titres = 0
  for (const op of operations || []) {
    const accountId = String(op.accountId || '')
    const amount = Math.abs(op.debit || op.credit || 0)
    if (PREFIX_INDEMNITES.some((p) => accountId.startsWith(p))) indemnites += amount
    if (PREFIX_TITRES.some((p) => accountId.startsWith(p))) titres += amount
  }
  if (isTech(tag)) return indemnites > 0 ? indemnites / 9.9 : 0
  return titres > 0 ? titres / 3.2 : 0
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const year = parseInt(req.query.year, 10)
  if (!year || year < 2020 || year > 2030) {
    return res.status(400).json({ error: 'Paramètre year requis (ex: 2025)' })
  }

  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.NEON_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    const client = await pool.connect()

    // 1) Agrégation monthly_data sur l'année
    const rows = await client.query(
      `SELECT month, kpis, trial_balance FROM monthly_data WHERE year = $1 ORDER BY month_number`,
      [year]
    )

    let ventes_706 = 0
    let charges = 0
    let revenus_totaux = 0
    let insertions_6231 = 0

    for (const row of rows.rows || []) {
      const kpis = row.kpis || {}
      ventes_706 += parseFloat(kpis.ventes_706) || 0
      charges += parseFloat(kpis.charges) || 0
      revenus_totaux += parseFloat(kpis.revenus_totaux) || 0
      const tb = row.trial_balance || {}
      const items = tb.items || []
      for (const item of items) {
        const num = String(item.number || '')
        if (num.startsWith('6231')) {
          const debit = parseFloat(item.debits || item.debit || 0) || 0
          const credit = parseFloat(item.credits || item.credit || 0) || 0
          insertions_6231 += debit - credit
        }
      }
    }

    const autres_produits = revenus_totaux - ventes_706

    // 2) Masse salariale N-1 = somme des 12 mois du module Salaires et cotisations (payfit_salaries.total_cost)
    //    + ETP par service depuis Payfit (employés + opérations par mois)
    const payfitRows = await client.query(
      `SELECT month, employees_data, total_cost FROM payfit_salaries WHERE year = $1 ORDER BY month_number`,
      [year]
    )

    let masse_salariale = 0
    for (const row of payfitRows.rows || []) {
      masse_salariale += parseFloat(row.total_cost) || 0
    }

    const joursByService = {}
    for (const row of payfitRows.rows || []) {
      const employees = row.employees_data || []
      for (const emp of employees) {
        const tag = getTagFromEmployee(emp)
        const service = serviceFromTag(tag)
        const jours = joursFromOperations(emp.operations, tag)
        if (!joursByService[service]) joursByService[service] = 0
        joursByService[service] += jours
      }
    }

    const etpByService = {}
    for (const [service, totalJours] of Object.entries(joursByService)) {
      etpByService[service] = totalJours > 0 ? Math.round((totalJours / JOURS_MAX_ANNUEL) * 100) / 100 : 0
    }

    client.release()
    await pool.end()

    res.status(200).json({
      success: true,
      year,
      balance: {
        ventes_706,
        charges,
        autres_produits,
        insertions_6231,
        masse_salariale
      },
      etpByService,
      joursByService
    })
  } catch (err) {
    console.error('breakeven-data:', err)
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
}
