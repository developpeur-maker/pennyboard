import React, { useState, useEffect } from 'react'

const JO_DEFAULT = 251
const JOURS_DIAG_DEFAULT = 216
const JOURS_COMM_DEFAULT = 216
const MARGES_CIBLES = [0, 0.03, 0.06, 0.09, 0.12, 0.15, 0.2]

const formatCurrency = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}
const formatCurrency2 = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
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
    masse_salariale?: number
  } | null>(null)
  const [etpByService2025, setEtpByService2025] = useState<Record<string, number>>({})

  // Inputs modifiables (hypothèses globales + 2025 + 2026)
  const [joursOuverture, setJoursOuverture] = useState(JO_DEFAULT)
  const [etpDiag2025, setEtpDiag2025] = useState(35)
  const [etpComm2025, setEtpComm2025] = useState(13)
  const [joursDispoDiag2025, setJoursDispoDiag2025] = useState(JOURS_DIAG_DEFAULT)
  const [joursDispoComm2025, setJoursDispoComm2025] = useState(JOURS_COMM_DEFAULT)
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
  const [masseSalarialeBase, setMasseSalarialeBase] = useState<number | null>(null) // Masse sal. N-1 (module Salaires), base pour prorata ETP
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
          if (data.etpByService?.Commerciaux != null) {
            const comm = Math.round(data.etpByService.Commerciaux * 10) / 10
            setEtpComm2025(comm)
            setEtpComm2026(comm)
          }
          if (data.balance?.masse_salariale != null) setMasseSalarialeBase(Math.round(data.balance.masse_salariale))
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
  const joursComm2025 = etpComm2025 * joursDispoComm2025
  const tjmDiagRealise2025 = joursDiagVendables2025 > 0 ? ventes2025 / joursDiagVendables2025 : 0
  const tjmEntreprise2025 = joursOuverture > 0 ? ventes2025 / joursOuverture : 0
  const resultat2025 = ventes2025 * (1 - tauxVariable2025) + autresProduits2025 - insertions2025 - fixes2025
  const marge2025 = ventes2025 !== 0 ? resultat2025 / ventes2025 : 0

  // Masse salariale 2026 = base N-1 au prorata des ETP (base pour etpDiag2025 + etpComm2025)
  const baseEtp = etpDiag2025 + etpComm2025
  const masseSalariale2026 =
    masseSalarialeBase != null && baseEtp > 0
      ? Math.round(masseSalarialeBase * (etpDiag2026 + etpComm2026) / baseEtp)
      : (masseSalarialeBase ?? 0)

  const caTotal2026 = caCible2026 + (upsellAmiante ? etpDiag2026 * 12 * caAmianteParDiag : 0)
  const margeAmiante2026 = upsellAmiante ? etpDiag2026 * 12 * margeAmianteParDiag : 0
  const joursDiag2026 = etpDiag2026 * joursDispoDiag2026
  const joursComm2026 = etpComm2026 * joursDispoComm2026
  const tjmDiag2026 = joursDiag2026 > 0 ? caTotal2026 / joursDiag2026 : 0
  const resultat2026Simpl = caTotal2026 * (1 - tauxVariable2026) + margeAmiante2026 + autresProduits2026 - budgetInsertions2026 * 12 - (masseSalariale2026 + direction2026 + freelances2026 + autresChargesFixes2026 + budgetLogiciels2026 * 12)
  const marge2026 = caTotal2026 !== 0 ? resultat2026Simpl / caTotal2026 : 0

  const inputCls = 'block w-full rounded border border-gray-300 px-2 py-1 text-sm'
  const labelCls = 'block text-xs font-medium text-gray-600 mb-0.5'

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-3 sm:px-4 lg:px-6">
      <div className="max-w-[1600px] mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Seuil de rentabilité & TJM</h1>
        <p className="text-sm text-gray-600 mb-4">Hypothèses à gauche, résultats à droite — feedback instantané.</p>

        {loading && <p className="text-sm text-gray-500">Chargement {yearRef}…</p>}
        {error && <p className="text-sm text-red-600 mb-2">Erreur : {error}</p>}

        <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-4 xl:gap-6">
          <aside className="xl:sticky xl:top-4 xl:self-start space-y-4">
            <section className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Global</h2>
              <div><label className={labelCls}>JO (jours ouverture)</label><input type="number" value={joursOuverture} onChange={(e) => setJoursOuverture(Number(e.target.value))} className={inputCls} /></div>
            </section>

            <section className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Feedback {yearRef}</h2>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>ETP diag</label><input type="number" step="0.1" value={etpDiag2025} onChange={(e) => setEtpDiag2025(Number(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>Jours/ETP diag</label><input type="number" value={joursDispoDiag2025} onChange={(e) => setJoursDispoDiag2025(Number(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>ETP comm</label><input type="number" step="0.1" value={etpComm2025} onChange={(e) => setEtpComm2025(Number(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>Jours/ETP comm</label><input type="number" value={joursDispoComm2025} onChange={(e) => setJoursDispoComm2025(Number(e.target.value))} className={inputCls} /></div>
                <div className="col-span-2"><label className={labelCls}>Charges variable v</label><input type="number" step="0.01" min="0" max="1" value={tauxVariable2025} onChange={(e) => setTauxVariable2025(Number(e.target.value))} className={inputCls} /></div>
                <div className="col-span-2"><label className={labelCls}>Autres produits (€/an)</label><input type="number" value={autresProduits2025} onChange={(e) => setAutresProduits2025(Number(e.target.value))} className={inputCls} /></div>
              </div>
            </section>

            <section className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Hypothèses {currentYear}</h2>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>ETP diag</label><input type="number" step="0.1" value={etpDiag2026} onChange={(e) => setEtpDiag2026(Number(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>ETP comm</label><input type="number" step="0.1" value={etpComm2026} onChange={(e) => setEtpComm2026(Number(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>Jours/ETP diag</label><input type="number" value={joursDispoDiag2026} onChange={(e) => setJoursDispoDiag2026(Number(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>Jours/ETP comm</label><input type="number" value={joursDispoComm2026} onChange={(e) => setJoursDispoComm2026(Number(e.target.value))} className={inputCls} /></div>
                <div className="col-span-2"><label className={labelCls}>CA cible CORE (€/an)</label><input type="number" value={caCible2026} onChange={(e) => setCaCible2026(Number(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>Taux variable v</label><input type="number" step="0.01" min="0" max="1" value={tauxVariable2026} onChange={(e) => setTauxVariable2026(Number(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>Insertions (€/mois)</label><input type="number" value={budgetInsertions2026} onChange={(e) => setBudgetInsertions2026(Number(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>Logiciels (€/mois)</label><input type="number" value={budgetLogiciels2026} onChange={(e) => setBudgetLogiciels2026(Number(e.target.value))} className={inputCls} /></div>
                <div>
                  <label className={labelCls}>Masse sal. (€/an)</label>
                  <input
                    type="number"
                    readOnly
                    disabled
                    value={masseSalariale2026}
                    className={`${inputCls} bg-gray-100 text-gray-600 cursor-not-allowed`}
                    title="Base N-1 × (ETP diag + ETP comm) / (ETP diag N-1 + ETP comm N-1) — recalcul auto au prorata"
                  />
                </div>
                <div><label className={labelCls}>Direction (€/an)</label><input type="number" value={direction2026} onChange={(e) => setDirection2026(Number(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>Freelances (€/an)</label><input type="number" value={freelances2026} onChange={(e) => setFreelances2026(Number(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>Autres fixes (€/an)</label><input type="number" value={autresChargesFixes2026} onChange={(e) => setAutresChargesFixes2026(Number(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>Autres produits (€/an)</label><input type="number" value={autresProduits2026} onChange={(e) => setAutresProduits2026(Number(e.target.value))} className={inputCls} /></div>
              </div>
            </section>

            <section className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Upsell amiante</h2>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>Activer (0/1)</label><input type="number" min="0" max="1" value={upsellAmiante} onChange={(e) => setUpsellAmiante(Number(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>CA/diag/mois (€)</label><input type="number" value={caAmianteParDiag} onChange={(e) => setCaAmianteParDiag(Number(e.target.value))} className={inputCls} /></div>
                <div className="col-span-2"><label className={labelCls}>Marge/diag/mois (€)</label><input type="number" value={margeAmianteParDiag} onChange={(e) => setMargeAmianteParDiag(Number(e.target.value))} className={inputCls} /></div>
              </div>
            </section>
          </aside>

          <div className="min-w-0 space-y-4">
            <section className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-emerald-800 mb-3">Scénario {currentYear} — Résumé</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div><span className="text-gray-600">CA total</span><p className="font-semibold text-gray-900">{formatCurrency(caTotal2026)}</p></div>
                <div><span className="text-gray-600">Résultat</span><p className={`font-semibold ${resultat2026Simpl >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(resultat2026Simpl)}</p></div>
                <div><span className="text-gray-600">Marge</span><p className="font-semibold text-gray-900">{formatPercent(marge2026)}</p></div>
                <div><span className="text-gray-600">TJM diag</span><p className="font-semibold text-gray-900">{formatCurrency(tjmDiag2026)}</p></div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">{yearRef} — Données & KPIs</h2>
                <table className="min-w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    <tr><td className="py-1 text-gray-600">Ventes (706)</td><td className="py-1 text-right font-medium">{formatCurrency(ventes2025)}</td></tr>
                    <tr><td className="py-1 text-gray-600">Autres produits</td><td className="py-1 text-right font-medium">{formatCurrency(autresProd2025)}</td></tr>
                    <tr><td className="py-1 text-gray-600">Charges / Insertions</td><td className="py-1 text-right font-medium">{formatCurrency(charges2025)} / {formatCurrency(insertions2025)}</td></tr>
                    <tr><td className="py-1 text-gray-600">Variables / Fixes</td><td className="py-1 text-right font-medium">{formatCurrency(variables2025)} / {formatCurrency(fixes2025)}</td></tr>
                    <tr><td className="py-1 text-gray-600">Jours diag vendables</td><td className="py-1 text-right font-medium">{Math.round(joursDiagVendables2025)}</td></tr>
                    <tr><td className="py-1 text-gray-600">TJM diag réalisé</td><td className="py-1 text-right font-medium">{formatCurrency(tjmDiagRealise2025)}</td></tr>
                    <tr><td className="py-1 text-gray-600">TJM entreprise</td><td className="py-1 text-right font-medium">{formatCurrency(tjmEntreprise2025)}</td></tr>
                    <tr><td className="py-1 text-gray-600">Résultat</td><td className="py-1 text-right font-medium">{formatCurrency(resultat2025)}</td></tr>
                    <tr><td className="py-1 text-gray-600">Marge</td><td className="py-1 text-right font-medium">{formatPercent(marge2025)}</td></tr>
                  </tbody>
                </table>
                {Object.keys(etpByService2025).length > 0 && (
                  <p className="mt-2 text-xs text-gray-500">ETP Payfit: {Object.entries(etpByService2025).map(([s, e]) => `${s}: ${e}`).join(', ')}</p>
                )}
              </section>

              <section className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">{currentYear} — Projection</h2>
                <table className="min-w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    <tr><td className="py-1 text-gray-600">CA total (core + amiante)</td><td className="py-1 text-right font-medium">{formatCurrency(caTotal2026)}</td></tr>
                    <tr><td className="py-1 text-gray-600">Jours diag / comm</td><td className="py-1 text-right font-medium">{Math.round(joursDiag2026)} / {Math.round(joursComm2026)}</td></tr>
                    <tr><td className="py-1 text-gray-600">TJM diag</td><td className="py-1 text-right font-medium">{formatCurrency(tjmDiag2026)}</td></tr>
                    <tr><td className="py-1 text-gray-600">Résultat</td><td className="py-1 text-right font-medium">{formatCurrency(resultat2026Simpl)}</td></tr>
                    <tr><td className="py-1 text-gray-600">Marge</td><td className="py-1 text-right font-medium">{formatPercent(marge2026)}</td></tr>
                  </tbody>
                </table>
              </section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 overflow-x-auto">
                <h2 className="text-sm font-semibold text-gray-900 mb-2">Seuils {yearRef}</h2>
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-gray-500">Marge</th>
                      <th className="px-2 py-1.5 text-right text-gray-500">CA requis</th>
                      <th className="px-2 py-1.5 text-right text-gray-500">TJM diag</th>
                      <th className="px-2 py-1.5 text-right text-gray-500">CA/jour comm.</th>
                      <th className="px-2 py-1.5 text-right text-gray-500">TJM entreprise</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {MARGES_CIBLES.map((m) => {
                      const caRequis = (fixes2025 + insertions2025 - autresProduits2025) / (1 - tauxVariable2025 - m)
                      const tjmDiagRequis = joursDiagVendables2025 > 0 ? caRequis / joursDiagVendables2025 : 0
                      const caParJourComm = joursComm2025 > 0 ? caRequis / joursComm2025 : null
                      const tjmEntRequis = joursOuverture > 0 ? caRequis / joursOuverture : 0
                      return (
                        <tr key={m}>
                          <td className="px-2 py-1">{formatPercent(m)}</td>
                          <td className="px-2 py-1 text-right">{formatCurrency(caRequis)}</td>
                          <td className="px-2 py-1 text-right">{formatCurrency(tjmDiagRequis)}</td>
                          <td className="px-2 py-1 text-right">{caParJourComm != null ? formatCurrency2(caParJourComm) : '—'}</td>
                          <td className="px-2 py-1 text-right">{formatCurrency2(tjmEntRequis)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </section>
              <section className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 overflow-x-auto">
                <h2 className="text-sm font-semibold text-gray-900 mb-2">Seuils {currentYear}</h2>
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-gray-500">Marge</th>
                      <th className="px-2 py-1.5 text-right text-gray-500">CA requis</th>
                      <th className="px-2 py-1.5 text-right text-gray-500">TJM diag</th>
                      <th className="px-2 py-1.5 text-right text-gray-500">CA/jour comm.</th>
                      <th className="px-2 py-1.5 text-right text-gray-500">TJM entreprise</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {MARGES_CIBLES.map((m) => {
                      const chargesFixes = masseSalariale2026 + direction2026 + freelances2026 + autresChargesFixes2026 + budgetLogiciels2026 * 12 + budgetInsertions2026 * 12
                      const caRequis = (chargesFixes - autresProduits2026 - margeAmiante2026) / (1 - tauxVariable2026 - m)
                      const tjmDiagRequis = joursDiag2026 > 0 ? caRequis / joursDiag2026 : 0
                      const caParJourComm = joursComm2026 > 0 ? caRequis / joursComm2026 : null
                      const tjmEntRequis = joursOuverture > 0 ? caRequis / joursOuverture : 0
                      return (
                        <tr key={m}>
                          <td className="px-2 py-1">{formatPercent(m)}</td>
                          <td className="px-2 py-1 text-right">{formatCurrency(caRequis)}</td>
                          <td className="px-2 py-1 text-right">{formatCurrency(tjmDiagRequis)}</td>
                          <td className="px-2 py-1 text-right">{caParJourComm != null ? formatCurrency2(caParJourComm) : '—'}</td>
                          <td className="px-2 py-1 text-right">{formatCurrency2(tjmEntRequis)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Breakeven
