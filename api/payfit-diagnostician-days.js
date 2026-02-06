const { Pool } = require('pg')

// Aligné avec Breakeven.tsx : listes hardcodées des diagnostiqueurs (années < 2026)
const DIAGNOSTIQUEURS = [
  'BENJAMIN BERNARD', 'CAROLE TOULORGE', 'JEAN-LAURENT GUELTON', 'Sarah Hecketsweiler', 'Alexandre Ellul-Renuy',
  'Servane GENTILHOMME', 'Jules Freulard', 'Jacques de Castelnau', 'Grégoire DE RICARD', 'Brice Gretha',
  'Sylvain COHERGNE', 'Fabien BETEILLE', 'Ilan TEICHNER', 'Christophe Metzger', 'Elie Dahan', 'Simon ZERBIB',
  'Yanis Lacroix', 'Jonathan Pichon', 'Robin Zeni', 'José GARCIA CUERDA', 'Cyril Cedileau', 'Julien Colinet',
  'Arnaud Larregain', 'Alexandre SIMONOT', 'Theo Termessant', 'Pierre-Louis VILLA', 'Antoine Fauvet',
  'Laurent Marty', 'Yannick MBOMA', 'Nassim Bidouche', 'Mickael ERB', 'KEVIN COURTEAUX', 'Nicolas MAGERE',
  'Yanisse Chekireb', 'Louca ANTONIOLLI', 'Pascal ALLAMELOU', 'Léo PAYAN', 'Mohamed Berete', 'Simon Benezra Simon',
  'Rémi NAUDET', 'Sylvain Gomes', 'Nicolas Fabre', 'Armend Letaj', 'Sabry Ouadada', 'Brice GRETHA',
  'Guillaume FATOUX', 'Amel TOUATI PINSOLLE', 'Christophe MARCHAL', 'Anis Fekih', 'Martial Macari',
  'Faycal Zerizer', 'Morgan Lorrain', 'Nathan Jurado', 'Corentin BANIA', 'Samir BONHUR', 'Eric Loviny',
  'Clément BUISINE', 'Steeve JEAN-PHILIPPE', 'Guillaume Lavigne', 'Stéphane MABIALA', 'Laurent Belchi',
  'Nicolas FABRE', 'Lucas MEZERETTE', 'Khalil BOUKLOUCHE', 'Grégory LAMBING', 'Radwane FARADJI',
  'John RAKOTONDRABAO', 'Olivier MIRAT', 'Fabien PRÉVOT', 'Onur SONMEZ', 'Jérôme BENHAMOU', 'Pierre SIONG',
  'Océane DIOT', 'Mickael FIGUIERES', 'Romain CINIER', 'Arnaud BOUSSIDAN', 'Lydiane CAND', 'Enzo SAYIN',
  'Mathieu TABOULOT', 'Léo MOLITES', 'Yves GRANVILLE', 'BAPTISTE BAUET', 'Mounir MAROUANE', 'François LASRET',
  'Osman KIZILKAYA', 'Abdeltife GARTI', 'Maxime LE BRIS', 'Christopher PITA', 'David EPINEAUX',
  'Olivier Corsin', 'Jaouad NELSON', 'Lionel THOMASSET', 'Florian VIVES', 'Maxime LEROY', 'Maxime PELLIER',
  'Idriss TCHINI', 'Danny FIDANZA', 'Lucille GRIFFAY', 'Sofiane ZEKRI', 'Sofiane KHELFAOUI', 'Romain GUEHO',
  'Jérôme SAUVAGE', 'Yohann LAILLIER-JARDÉ', 'Pascal CABELEIRA', 'Aziz AOURAGH', 'Téo DOUBLIER',
  'Sébastien SOUYRIS', 'Fabrice STECIUK', 'Jérémie JOURNAUX', 'Ariles MERAD', 'Simon PACAUD'
].map((n) => n.toUpperCase().trim())

function normalizeName(name) {
  if (!name || typeof name !== 'string') return ''
  return String(name)
    .toUpperCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function isDiagnostiqueur(employeeName, operations, year) {
  const normalizedName = normalizeName(employeeName)
  if (year >= 2026 && operations && Array.isArray(operations)) {
    for (const op of operations) {
      if (op.analyticCodes && Array.isArray(op.analyticCodes)) {
        for (const code of op.analyticCodes) {
          const t = (code.type || '').toLowerCase()
          if (t === 'équipe' || t === 'equipe' || t === 'team') {
            const value = (code.value || '').toUpperCase().trim()
            if (value === 'DIAGNOSTIQUEUR' || value === 'DIAGNOSTIQUEURS') return true
          }
        }
      }
    }
  }
  return DIAGNOSTIQUEURS.some((n) => normalizeName(n) === normalizedName)
}

/**
 * GET /api/payfit-diagnostician-days?months=2024-01,2024-02,2025-01
 * Returns { "2024-01": totalDays, "2024-02": totalDays, ... } (jours travaillés des diagnostiqueurs uniquement)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const monthsParam = req.query.months
  if (!monthsParam || typeof monthsParam !== 'string') {
    return res.status(400).json({ error: 'Paramètre months requis (ex: months=2024-01,2024-02)' })
  }
  const months = monthsParam.split(',').map((m) => m.trim()).filter((m) => /^\d{4}-\d{2}$/.test(m))
  if (months.length === 0) {
    return res.status(400).json({ error: 'Aucun mois valide (format YYYY-MM)' })
  }

  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.NEON_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    const client = await pool.connect()
    const resultByMonth = {}

    for (const month of months) {
      const [yearStr] = month.split('-')
      const year = parseInt(yearStr, 10)

      const salaryRow = await client.query(
        'SELECT employees_data FROM payfit_salaries WHERE month = $1',
        [month]
      )
      if (salaryRow.rows.length === 0) {
        resultByMonth[month] = 0
        continue
      }
      const employees = salaryRow.rows[0].employees_data || []
      const diagnosticianIds = new Set()
      for (const emp of employees) {
        const salaryPaid = emp.salaryPaid || 0
        if (salaryPaid <= 1000) continue
        if (!isDiagnostiqueur(emp.employeeName, emp.operations || [], year)) continue
        const id = emp.collaboratorId || emp.collaborator_id
        if (id) diagnosticianIds.add(id)
      }
      if (diagnosticianIds.size === 0) {
        resultByMonth[month] = 0
        continue
      }

      const ids = [...diagnosticianIds]
      const placeholdersIds = ids.map((_, i) => `$${i + 1}`).join(',')
      const mvResult = await client.query(
        `SELECT SUM(vouchers_count) AS total FROM payfit_meal_vouchers WHERE month = $1 AND collaborator_id IN (${placeholdersIds})`,
        [month, ...ids]
      )
      const total = parseInt(mvResult.rows[0]?.total || 0, 10)
      resultByMonth[month] = total
    }

    client.release()
    await pool.end()

    res.status(200).json({ success: true, byMonth: resultByMonth })
  } catch (err) {
    console.error('payfit-diagnostician-days:', err)
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
}
