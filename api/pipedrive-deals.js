/**
 * API lecture des deals Pipedrive depuis MongoDB (pipedrive.deals).
 * Filtres : status=won, value>0, date RDV renseignée, facture existante.
 * Agrégation optionnelle par jour / semaine / mois par diagnostiqueur.
 */
const { getDealsCollection } = require('./lib/mongodb')
const PIPEDRIVE_CONFIG = require('../config/pipedrive-deals')

const {
  CUSTOM_FIELD_IDS: CF,
  INTEGER_FIELD_IDS
} = PIPEDRIVE_CONFIG

const FIELD_OPTIONS_CACHE_TTL_MS = 60 * 60 * 1000 // 1 heure
let fieldOptionsCache = null
let fieldOptionsCacheAt = 0

/** Charge le mapping des options (INTEGER → libellé) depuis PIPEDRIVE_FIELD_OPTIONS_URL. Cache 1h. */
async function loadFieldOptions() {
  const url = process.env.PIPEDRIVE_FIELD_OPTIONS_URL
  if (!url) return {}
  if (fieldOptionsCache && Date.now() - fieldOptionsCacheAt < FIELD_OPTIONS_CACHE_TTL_MS) {
    return fieldOptionsCache
  }
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (res.ok) {
      const data = await res.json()
      const options = data.customFieldOptions || data || {}
      fieldOptionsCache = options
      fieldOptionsCacheAt = Date.now()
      return options
    }
  } catch (e) {
    console.warn('Pipedrive field options URL fetch failed:', e.message)
  }
  return {}
}

/** Résout une valeur INTEGER d'un champ custom via le mapping (optionId → libellé) */
function resolveOptionValue(fieldId, value, optionsMap) {
  if (value == null || value === '') return value
  const fieldOptions = optionsMap[fieldId]
  if (!fieldOptions || typeof fieldOptions !== 'object') return value
  const key = String(value)
  if (Object.prototype.hasOwnProperty.call(fieldOptions, key)) {
    return fieldOptions[key]
  }
  return value
}

/** Normalise un deal brut MongoDB en objet avec champs nommés */
function normalizeDeal(doc, optionsMap) {
  const cf = doc.custom_fields || {}
  const get = (id) => cf[id]
  const getResolved = (id) => {
    const v = cf[id]
    if (INTEGER_FIELD_IDS.includes(id)) return resolveOptionValue(id, v, optionsMap)
    return v
  }

  return {
    id: doc.id,
    value: doc.value,
    status: doc.status,
    diagnostiqueur: getResolved(CF.DIAGNOSTIQUEUR),
    dateRdv: get(CF.DATE_RDV) || null,
    tempsIntervention: getResolved(CF.TEMPS_INTERVENTION),
    zone: getResolved(CF.ZONE),
    diagnosticsRealises: getResolved(CF.DIAGNOSTICS_REALISES),
    numeroFacture: get(CF.NUMERO_FACTURE) || null,
    addTime: doc.add_time || null,
    closeTime: doc.close_time || null
  }
}

/** Retourne la clé jour (YYYY-MM-DD), semaine (YYYY-Www), mois (YYYY-MM) à partir d'une date string ISO ou YYYY-MM-DD */
function getPeriodKeys(dateStr) {
  if (!dateStr) return { day: null, week: null, month: null }
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return { day: null, week: null, month: null }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = `${y}-${m}-${String(d.getDate()).padStart(2, '0')}`
  const month = `${y}-${m}`
  const oneJan = new Date(y, 0, 1)
  const weekNum = Math.ceil((((d - oneJan) / 86400000) + oneJan.getDay() + 1) / 7)
  const week = `${y}-W${String(weekNum).padStart(2, '0')}`
  return { day, week, month }
}

/** Agrège les deals normalisés par diagnostiqueur et par période (jour / semaine / mois) */
function aggregateByPeriod(normalizedDeals) {
  const byDay = {}   // { [diagnosticianKey]: { [periodKey]: totalValue } }
  const byWeek = {}
  const byMonth = {}

  for (const d of normalizedDeals) {
    const diagKey = d.diagnostiqueur != null ? String(d.diagnostiqueur) : '__sans_nom__'
    const { day, week, month } = getPeriodKeys(d.dateRdv)
    const v = Number(d.value) || 0

    if (day) {
      byDay[diagKey] = byDay[diagKey] || {}
      byDay[diagKey][day] = (byDay[diagKey][day] || 0) + v
    }
    if (week) {
      byWeek[diagKey] = byWeek[diagKey] || {}
      byWeek[diagKey][week] = (byWeek[diagKey][week] || 0) + v
    }
    if (month) {
      byMonth[diagKey] = byMonth[diagKey] || {}
      byMonth[diagKey][month] = (byMonth[diagKey][month] || 0) + v
    }
  }

  const toList = (byPeriod) => {
    const list = []
    for (const [diagnostician, periods] of Object.entries(byPeriod)) {
      for (const [periodKey, totalValue] of Object.entries(periods)) {
        list.push({ diagnostician, periodKey, totalValue })
      }
    }
    return list
  }

  return {
    day: toList(byDay),
    week: toList(byWeek),
    month: toList(byMonth)
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const groupBy = (req.query.groupBy || '').toLowerCase()
    const validGroupBy = ['day', 'week', 'month', ''].includes(groupBy) ? groupBy : ''

    const collection = await getDealsCollection()

    const dateRdvId = CF.DATE_RDV
    const invoiceId = CF.NUMERO_FACTURE

    const filter = {
      status: 'won',
      value: { $gt: 0 },
      [`custom_fields.${dateRdvId}`]: { $exists: true, $ne: null, $ne: '' },
      [`custom_fields.${invoiceId}`]: { $exists: true, $ne: null, $ne: '' }
    }

    const projection = {
      id: 1,
      value: 1,
      status: 1,
      add_time: 1,
      close_time: 1,
      [`custom_fields.${CF.DIAGNOSTIQUEUR}`]: 1,
      [`custom_fields.${dateRdvId}`]: 1,
      [`custom_fields.${CF.TEMPS_INTERVENTION}`]: 1,
      [`custom_fields.${CF.ZONE}`]: 1,
      [`custom_fields.${CF.DIAGNOSTICS_REALISES}`]: 1,
      [`custom_fields.${invoiceId}`]: 1
    }

    const cursor = collection.find(filter).project(projection)
    const rawDeals = await cursor.toArray()

    const optionsMap = await loadFieldOptions()
    const deals = rawDeals.map((doc) => normalizeDeal(doc, optionsMap))

    const aggregated = aggregateByPeriod(deals)

    const response = {
      success: true,
      count: deals.length,
      deals,
      aggregated: {
        day: aggregated.day,
        week: aggregated.week,
        month: aggregated.month
      }
    }

    if (validGroupBy) {
      response.aggregatedBy = validGroupBy
      response.aggregatedList = aggregated[validGroupBy] || []
    }

    res.status(200).json(response)
  } catch (err) {
    console.error('❌ pipedrive-deals:', err)
    res.status(500).json({
      success: false,
      error: err.message || 'Erreur lors de la lecture des deals Pipedrive'
    })
  }
}
