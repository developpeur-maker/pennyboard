import React, { useState, useEffect } from 'react'

const JO_DEFAULT = 251
const JOURS_DIAG_DEFAULT = 216
const JOURS_COMM_DEFAULT = 216
const MARGES_CIBLES = [0, 0.03, 0.06, 0.09, 0.12, 0.15, 0.2]

const formatCurrency = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}

const formatPercent = (value: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)
}

const Breakeven: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [balance2025, setBalance2025] = useState<{
    ventes_706: number
    charges: number
    autres_produits: number
    insertions_6231: number
  } | null>(null)
  const [etpByService2025, setEtpByService2025] = useState<Record<string, number>>({})

  // Inputs modifiables (hypothèses globales + 2025 + 2026)
  const [joursOuverture, setJoursOuverture] = useState(JO_DEFAULT)
  const [etpDiag2025, setEtpDiag2025] = useState(35)
  const [joursDispoDiag2025, setJoursDispoDiag2025] = useState(JOURS_DIAG_DEFAULT)
  const [tauxVariable2025, setTauxVariable2025] = useState(0.06)
  const [autresProduits2025, setAutresProduits2025] = useState(0)

  const [etpDiag2026, setEtpDiag2026] = useState(35)
  const [etpComm2026, setEtpComm2026] = useState(13)
  const [joursDispoDiag2026, setJoursDispoDiag2026] = useState(213)
  const [joursDispoComm2026, setJoursDispoComm2026] = useState(JOURS_COMM_DEFAULT)
  const [caCible2026, setCaCible2026] = useState(5_520_000)
  const [tauxVariable2026, setTauxVariable2026] = useState(0.07)
  const [budgetInsertions2026, setBudgetInsertions2026] = useState(41_000)
  const [budgetLogiciels2026, setBudgetLogiciels2026] = useState(15_000)
  const [masseSalariale2026, setMasseSalariale2026] = useState(2_820_720)
  const [direction2026, setDirection2026] = useState(182_000)
  const [freelances2026, setFreelances2026] = useState(121_000)
  const [autresChargesFixes2026, setAutresChargesFixes2026] = useState(340_000)
  const [autresProduits2026, setAutresProduits2026] = useState(60_000)

  const [upsellAmiante, setUpsellAmiante] = useState(0)
  const [caAmianteParDiag, setCaAmianteParDiag] = useState(245)
  const [margeAmianteParDiag, setMargeAmianteParDiag] = useState(120)

  const currentYear = new Date().getFullYear()
  const yearRef = currentYear - 1

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/breakeven-data?year=${yearRef}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.success) {
          setBalance2025(data.balance || null)
          setEtpByService2025(data.etpByService || {})
          if (data.etpByService?.Diagnostiqueurs != null) setEtpDiag2025(Math.round(data.etpByService.Diagnostiqueurs * 10) / 10)
          if (data.etpByService?.Commerciaux != null) setEtpComm2026(Math.round(data.etpByService.Commerciaux * 10) / 10)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Erreur chargement')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [yearRef])

  const ventes2025 = balance2025?.ventes_706 ?? 0
  const charges2025 = balance2025?.charges ?? 0
  const insertions2025 = balance2025?.insertions_6231 ?? 0
  const autresProd2025 = balance2025?.autres_produits ?? 0
  const variables2025 = ventes2025 * tauxVariable2025
  const fixes2025 = charges2025 - insertions2025 - variables2025

  const joursDiagVendables2025 = etpDiag2025 * joursDispoDiag2025
  const tjmDiagRealise2025 = joursDiagVendables2025 > 0 ? ventes2025 / joursDiagVendables2025 : 0
  const tjmEntreprise2025 = joursOuverture > 0 ? ventes2025 / joursOuverture : 0
  const resultat2025 = ventes2025 * (1 - tauxVariable2025) + autresProduits2025 - insertions2025 - fixes2025
  const marge2025 = ventes2025 !== 0 ? resultat2025 / ventes2025 : 0

  const caTotal2026 = caCible2026 + (upsellAmiante ? etpDiag2026 * 12 * caAmianteParDiag : 0)
  const margeAmiante2026 = upsellAmiante ? etpDiag2026 * 12 * margeAmianteParDiag : 0
  const joursDiag2026 = etpDiag2026 * joursDispoDiag2026
  const joursComm2026 = etpComm2026 * joursDispoComm2026
  const tjmDiag2026 = joursDiag2026 > 0 ? caTotal2026 / joursDiag2026 : 0
  const resultat2026Simpl = caTotal2026 * (1 - tauxVariable2026) + margeAmiante2026 + autresProduits2026 - budgetInsertions2026 * 12 - (masseSalariale2026 + direction2026 + freelances2026 + autresChargesFixes2026 + budgetLogiciels2026 * 12)
  const marge2026 = caTotal2026 !== 0 ? resultat2026Simpl / caTotal2026 : 0

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Seuil de rentabilité & TJM</h1>
        <p className="text-gray-600 mb-8">Modèle TJM et projection annuelle (données BDD + hypothèses modifiables).</p>

        {loading && <p className="text-gray-500">Chargement des données {yearRef}…</p>}
        {error && <p className="text-red-600 mb-4">Erreur : {error}</p>}

        {/* ——— Inputs ——— */}
        <section className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hypothèses globales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Jours d'ouverture société (JO)</label>
              <input
                type="number"
                value={joursOuverture}
                onChange={(e) => setJoursOuverture(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">Feedback {yearRef}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">ETP diagnostiqueurs {yearRef}</label>
              <input
                type="number"
                step="0.1"
                value={etpDiag2025}
                onChange={(e) => setEtpDiag2025(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Jours disponibles / ETP diag {yearRef}</label>
              <input
                type="number"
                value={joursDispoDiag2025}
                onChange={(e) => setJoursDispoDiag2025(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Taux variable v {yearRef} (hors insertions)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={tauxVariable2025}
                onChange={(e) => setTauxVariable2025(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Autres produits {yearRef} (€/an)</label>
              <input
                type="number"
                value={autresProduits2025}
                onChange={(e) => setAutresProduits2025(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">Hypothèses {currentYear}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">ETP diagnostiqueurs</label>
              <input type="number" step="0.1" value={etpDiag2026} onChange={(e) => setEtpDiag2026(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ETP commerciaux</label>
              <input type="number" step="0.1" value={etpComm2026} onChange={(e) => setEtpComm2026(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Jours dispo / ETP diag</label>
              <input type="number" value={joursDispoDiag2026} onChange={(e) => setJoursDispoDiag2026(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Jours dispo / ETP commercial</label>
              <input type="number" value={joursDispoComm2026} onChange={(e) => setJoursDispoComm2026(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">CA cible {currentYear} CORE (€/an)</label>
              <input type="number" value={caCible2026} onChange={(e) => setCaCible2026(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Taux variable v {currentYear}</label>
              <input type="number" step="0.01" min="0" max="1" value={tauxVariable2026} onChange={(e) => setTauxVariable2026(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Budget insertions (€/mois)</label>
              <input type="number" value={budgetInsertions2026} onChange={(e) => setBudgetInsertions2026(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Budget logiciels (€/mois)</label>
              <input type="number" value={budgetLogiciels2026} onChange={(e) => setBudgetLogiciels2026(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Masse salariale {currentYear} (€/an)</label>
              <input type="number" value={masseSalariale2026} onChange={(e) => setMasseSalariale2026(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Direction (€/an)</label>
              <input type="number" value={direction2026} onChange={(e) => setDirection2026(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Freelances (€/an)</label>
              <input type="number" value={freelances2026} onChange={(e) => setFreelances2026(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Autres charges fixes (€/an)</label>
              <input type="number" value={autresChargesFixes2026} onChange={(e) => setAutresChargesFixes2026(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Autres produits {currentYear} (€/an)</label>
              <input type="number" value={autresProduits2026} onChange={(e) => setAutresProduits2026(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">Upsell amiante</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Activer (0=non, 1=oui)</label>
              <input type="number" min="0" max="1" value={upsellAmiante} onChange={(e) => setUpsellAmiante(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">CA amiante / diag / mois (HT)</label>
              <input type="number" value={caAmianteParDiag} onChange={(e) => setCaAmianteParDiag(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Marge amiante / diag / mois (HT)</label>
              <input type="number" value={margeAmianteParDiag} onChange={(e) => setMargeAmianteParDiag(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
          </div>
        </section>

        {/* ——— 2025 Données & KPIs ——— */}
        <section className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{yearRef} — Données & KPIs</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="divide-y divide-gray-200">
                <tr><td className="py-2 text-gray-700">Ventes (706) {yearRef}</td><td className="py-2 font-medium">{formatCurrency(ventes2025)}</td></tr>
                <tr><td className="py-2 text-gray-700">Autres produits</td><td className="py-2 font-medium">{formatCurrency(autresProd2025)}</td></tr>
                <tr><td className="py-2 text-gray-700">Charges totales</td><td className="py-2 font-medium">{formatCurrency(charges2025)}</td></tr>
                <tr><td className="py-2 text-gray-700">Insertions (6231)</td><td className="py-2 font-medium">{formatCurrency(insertions2025)}</td></tr>
                <tr><td className="py-2 text-gray-700">Variables hors insertions</td><td className="py-2 font-medium">{formatCurrency(variables2025)}</td></tr>
                <tr><td className="py-2 text-gray-700">Fixes</td><td className="py-2 font-medium">{formatCurrency(fixes2025)}</td></tr>
                <tr><td className="py-2 text-gray-700">Jours diag vendables</td><td className="py-2 font-medium">{Math.round(joursDiagVendables2025)}</td></tr>
                <tr><td className="py-2 text-gray-700">TJM diag réalisé</td><td className="py-2 font-medium">{formatCurrency(tjmDiagRealise2025)}</td></tr>
                <tr><td className="py-2 text-gray-700">TJM entreprise</td><td className="py-2 font-medium">{formatCurrency(tjmEntreprise2025)}</td></tr>
                <tr><td className="py-2 text-gray-700">Résultat</td><td className="py-2 font-medium">{formatCurrency(resultat2025)}</td></tr>
                <tr><td className="py-2 text-gray-700">Marge</td><td className="py-2 font-medium">{formatPercent(marge2025)}</td></tr>
              </tbody>
            </table>
          </div>
          {Object.keys(etpByService2025).length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">ETP par service ({yearRef}, calculés depuis Payfit)</h3>
              <ul className="text-sm text-gray-600">
                {Object.entries(etpByService2025).map(([service, etp]) => (
                  <li key={service}>{service}: {etp}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ——— Seuils 2025 ——— */}
        <section className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Seuils {yearRef} — CA & TJM par marge cible</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Marge cible</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">CA ventes requis</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">TJM diag requis</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">TJM entreprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {MARGES_CIBLES.map((m) => {
                  const caRequis = (fixes2025 + insertions2025 - autresProduits2025) / (1 - tauxVariable2025 - m)
                  const tjmDiagRequis = joursDiagVendables2025 > 0 ? caRequis / joursDiagVendables2025 : 0
                  const tjmEntRequis = joursOuverture > 0 ? caRequis / joursOuverture : 0
                  return (
                    <tr key={m}>
                      <td className="px-4 py-2">{formatPercent(m)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(caRequis)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(tjmDiagRequis)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(tjmEntRequis)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ——— 2026 Projection ——— */}
        <section className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{currentYear} — Projection</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="divide-y divide-gray-200">
                <tr><td className="py-2 text-gray-700">CA total (core + amiante)</td><td className="py-2 font-medium">{formatCurrency(caTotal2026)}</td></tr>
                <tr><td className="py-2 text-gray-700">Jours diag vendables</td><td className="py-2 font-medium">{Math.round(joursDiag2026)}</td></tr>
                <tr><td className="py-2 text-gray-700">Jours commerciaux</td><td className="py-2 font-medium">{Math.round(joursComm2026)}</td></tr>
                <tr><td className="py-2 text-gray-700">TJM diag</td><td className="py-2 font-medium">{formatCurrency(tjmDiag2026)}</td></tr>
                <tr><td className="py-2 text-gray-700">Résultat au CA cible</td><td className="py-2 font-medium">{formatCurrency(resultat2026Simpl)}</td></tr>
                <tr><td className="py-2 text-gray-700">Marge</td><td className="py-2 font-medium">{formatPercent(marge2026)}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ——— Seuils 2026 ——— */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Seuils {currentYear} — CA & TJM par marge cible</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Marge cible</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">CA total requis</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">TJM diag requis</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">TJM entreprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {MARGES_CIBLES.map((m) => {
                  const chargesFixes = masseSalariale2026 + direction2026 + freelances2026 + autresChargesFixes2026 + budgetLogiciels2026 * 12 + budgetInsertions2026 * 12
                  const caRequis = (chargesFixes - autresProduits2026 - margeAmiante2026) / (1 - tauxVariable2026 - m)
                  const tjmDiagRequis = joursDiag2026 > 0 ? caRequis / joursDiag2026 : 0
                  const tjmEntRequis = joursOuverture > 0 ? caRequis / joursOuverture : 0
                  return (
                    <tr key={m}>
                      <td className="px-4 py-2">{formatPercent(m)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(caRequis)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(tjmDiagRequis)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(tjmEntRequis)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Breakeven
