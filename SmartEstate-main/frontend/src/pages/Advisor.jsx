import { useEffect, useState } from 'react'
import { getMetadata, getAdvisor } from '../api/client.js'
import ScoreDial from '../components/ScoreDial.jsx'

function defaultProperty(neighborhood = '') {
  return {
    overall_qual: 7,
    overall_cond: 5,
    lot_area: 9000,
    total_bsmt_sf: 2000,
    first_flr: 2000,
    second_flr: 2000,
    garage_cars: 2,
    full_bath: 2,
    half_bath: 1,
    year_built: 2003,
    neighborhood,
    kitchen_qual: 'Gd',
    bsmt_qual: 'Gd',
  }
}

const NUMERIC_FIELDS = [
  'overall_qual', 'overall_cond', 'lot_area', 'total_bsmt_sf',
  'first_flr', 'second_flr', 'garage_cars', 'full_bath', 'half_bath', 'year_built',
]

function priceStatusTone(status) {
  if (status === 'Underpriced') return 'text-sage'
  if (status === 'Overpriced') return 'text-rust'
  return 'text-brass'
}

function riskTone(risk) {
  if (risk === 'Low') return 'text-sage'
  if (risk === 'Medium') return 'text-brass'
  return 'text-rust' // High
}

function recommendationTone(rec) {
  if (rec === 'Excellent Investment') return 'text-sage'
  if (rec === 'Good Investment') return 'text-brass'
  if (rec === 'Average Investment') return 'text-parchment'
  return 'text-rust' // High Risk Investment
}

function familyTone(f) {
  if (f === 'Excellent' || f === 'Good') return 'text-sage'
  if (f === 'Average') return 'text-brass'
  return 'text-rust' // Limited
}

// "Investment", "Infrastructure", "Price Fairness", "Risk" — each capped
// at a different max (30 / 25 / 25 / 20) per property_health_service.py
const BREAKDOWN_MAX = {
  Investment: 30,
  Infrastructure: 25,
  'Price Fairness': 25,
  Risk: 20,
}

export default function Advisor() {
  const [meta, setMeta] = useState(null)
  const [property, setProperty] = useState(null)
  const [askingPrice, setAskingPrice] = useState(210000)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getMetadata()
      .then((m) => {
        setMeta(m)
        setProperty(defaultProperty(m.neighborhoods[0]))
      })
      .catch((e) => setError(`Could not reach the API — is it running? (${e.message})`))
  }, [])

  const updateField = (key) => (e) => {
    const raw = e.target.value
    setProperty((p) => ({ ...p, [key]: NUMERIC_FIELDS.includes(key) ? Number(raw) : raw }))
  }

  const runAdvisor = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await getAdvisor({ property, asking_price: Number(askingPrice) })
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (error && !meta) {
    return (
      <div className="border border-rust/40 bg-rust/5 text-rust rounded-sm p-6 font-body text-sm max-w-xl">
        {error}
      </div>
    )
  }

  if (!property) {
    return <p className="text-muted font-body text-sm">Loading…</p>
  }

  const summary = result?.summary
  const health = result?.property_health
  const priceAnalysis = summary?.['Price Analysis']

  return (
    <div className="space-y-10">
      <div>
        <span className="text-xs uppercase tracking-[0.2em] text-brass font-body">
          AI Property Advisor
        </span>
        <h2 className="font-display text-3xl text-parchment mt-1">
          Get a grounded second opinion
        </h2>
        <p className="text-muted font-body text-sm mt-2 max-w-xl">
          Enter the property details and the price you're being asked to pay. The advisor
          weighs prediction, investment score, and neighborhood infrastructure together —
          every verdict here traces back to a real number, not a guess.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* ---- Input form ---- */}
        <div className="bg-slate border border-hairline rounded-sm p-6 space-y-4">
          <Field label="Asking price ($)">
            <input
              type="number"
              min="1"
              value={askingPrice}
              onChange={(e) => setAskingPrice(e.target.value)}
              className="input"
            />
          </Field>

          <Field label={`Quality — ${property.overall_qual}/10`}>
            <input
              type="range" min="1" max="10"
              value={property.overall_qual}
              onChange={updateField('overall_qual')}
              className="w-full accent-brass"
            />
          </Field>

          <Field label={`Condition — ${property.overall_cond}/10`}>
            <input
              type="range" min="1" max="10"
              value={property.overall_cond}
              onChange={updateField('overall_cond')}
              className="w-full accent-brass"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Lot area (sq ft)">
              <input type="number" min="1000" max="20000" value={property.lot_area} onChange={updateField('lot_area')} className="input" />
            </Field>
            <Field label="Year built">
              <input type="number" min="1900" max="2025" value={property.year_built} onChange={updateField('year_built')} className="input" />
            </Field>
            <Field label="Basement (sq ft)">
              <input type="number" min="0" max="3000" value={property.total_bsmt_sf} onChange={updateField('total_bsmt_sf')} className="input" />
            </Field>
            <Field label="1st floor (sq ft)">
              <input type="number" min="300" max="3000" value={property.first_flr} onChange={updateField('first_flr')} className="input" />
            </Field>
            <Field label="2nd floor (sq ft)">
              <input type="number" min="0" max="2000" value={property.second_flr} onChange={updateField('second_flr')} className="input" />
            </Field>
            <Field label="Garage capacity">
              <input type="number" min="0" max="4" value={property.garage_cars} onChange={updateField('garage_cars')} className="input" />
            </Field>
            <Field label="Full baths">
              <input type="number" min="0" max="4" value={property.full_bath} onChange={updateField('full_bath')} className="input" />
            </Field>
            <Field label="Half baths">
              <input type="number" min="0" max="2" value={property.half_bath} onChange={updateField('half_bath')} className="input" />
            </Field>
          </div>

          <Field label="Neighborhood">
            <select value={property.neighborhood} onChange={updateField('neighborhood')} className="input">
              {meta?.neighborhoods.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Kitchen quality">
              <select value={property.kitchen_qual} onChange={updateField('kitchen_qual')} className="input">
                {meta?.kitchen_qual_options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Basement quality">
              <select value={property.bsmt_qual} onChange={updateField('bsmt_qual')} className="input">
                {meta?.bsmt_qual_options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
          </div>

          <button
            onClick={runAdvisor}
            disabled={loading}
            className="w-full border border-brass text-brass px-6 py-3 text-sm font-body tracking-wide hover:bg-brass hover:text-ink transition-colors disabled:opacity-40"
          >
            {loading ? 'Consulting the advisor…' : 'Get advisor opinion'}
          </button>

          {error && <p className="text-rust text-sm font-body">{error}</p>}
        </div>

        {/* ---- Results ---- */}
        <div className="space-y-6">
          {!result && (
            <div className="h-full flex items-center justify-center border border-dashed border-hairline rounded-sm p-10 text-muted font-body text-sm text-center">
              Fill in the property and asking price, then run the advisor to see its opinion here.
            </div>
          )}

          {result && summary && health && (
            <>
              {/* Top dials */}
              <div className="grid grid-cols-3 gap-4">
                <ScoreDial label="Investment" value={Math.round(result.investment_score)} max={100} accent="#C9A227" />
                <ScoreDial label="Infrastructure" value={Math.round(result.infrastructure_score * 10)} max={100} accent="#C9A227" />
                <ScoreDial label="Health score" value={Math.round(health['Health Score'])} max={100} accent="#C9A227" />
              </div>

              {/* Verdict strip */}
              <div className="bg-slate border border-hairline rounded-sm p-6 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <span className="text-xs uppercase tracking-[0.2em] text-brass font-body block mb-1">
                    {health['Status']}
                  </span>
                  <span className="text-2xl tracking-wide">{health['Rating']}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted font-body block mb-1">
                    Confidence
                  </span>
                  <span className="font-display text-2xl text-parchment tabular-nums">
                    {summary['Confidence']}%
                  </span>
                </div>
              </div>

              {/* Price analysis */}
              <div className="bg-slate border border-hairline rounded-sm p-6 space-y-3">
                <span className="text-xs uppercase tracking-[0.2em] text-brass font-body">Price analysis</span>
                <p className={`font-display text-2xl ${priceStatusTone(priceAnalysis.status)}`}>
                  {priceAnalysis.status}
                </p>
                <p className="text-muted font-body text-sm">{priceAnalysis.message}</p>
                {priceAnalysis.difference > 0 && (
                  <p className="font-mono text-sm text-parchment">
                    ${priceAnalysis.difference.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    {' '}({priceAnalysis.percentage}%) {priceAnalysis.status === 'Underpriced' ? 'below' : 'above'} market value
                  </p>
                )}
              </div>

              {/* Recommendation + Family suitability + Risk, side by side */}
              <div className="grid grid-cols-3 gap-4">
                <VerdictCard label="Investment" value={summary['Investment Recommendation']} tone={recommendationTone(summary['Investment Recommendation'])} />
                <VerdictCard label="Family fit" value={summary['Family Suitability']} tone={familyTone(summary['Family Suitability'])} />
                <VerdictCard label="Risk" value={summary['Risk']} tone={riskTone(summary['Risk'])} />
              </div>

              {/* Health breakdown */}
              <div className="bg-slate border border-hairline rounded-sm p-6 space-y-4">
                <span className="text-xs uppercase tracking-[0.2em] text-brass font-body">Health score breakdown</span>
                <div className="space-y-3">
                  {Object.entries(health['Breakdown']).map(([label, value]) => {
                    const max = BREAKDOWN_MAX[label] ?? 30
                    const pct = Math.min(100, (value / max) * 100)
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-xs font-body text-muted mb-1">
                          <span>{label}</span>
                          <span className="font-mono text-parchment">{value} / {max}</span>
                        </div>
                        <div className="h-2 bg-ink border border-hairline rounded-sm overflow-hidden">
                          <div className="h-full bg-brass" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function VerdictCard({ label, value, tone }) {
  return (
    <div className="bg-slate border border-hairline rounded-sm p-4 flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-[0.15em] text-muted font-body">{label}</span>
      <span className={`font-body text-sm font-semibold ${tone}`}>{value}</span>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-muted font-body mb-1">{label}</span>
      {children}
    </label>
  )
}