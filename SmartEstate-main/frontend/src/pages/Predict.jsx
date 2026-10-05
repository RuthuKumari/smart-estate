import { useEffect, useState } from 'react'
import { getMetadata, predictPrice, explainPrediction, priceFairness } from '../api/client.js'
import PriceTicket from '../components/PriceTicket.jsx'
import ScoreDial from '../components/ScoreDial.jsx'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const DEFAULT_FORM = {
  overall_qual: 7,
  overall_cond: 5,
  lot_area: 8450,
  total_bsmt_sf: 856,
  first_flr: 856,
  second_flr: 854,
  garage_cars: 2,
  full_bath: 2,
  half_bath: 1,
  year_built: 2003,
  neighborhood: '',
  kitchen_qual: 'Gd',
  bsmt_qual: 'Gd',
}

const NUMERIC_FIELDS = [
  'overall_qual',
  'overall_cond',
  'lot_area',
  'total_bsmt_sf',
  'first_flr',
  'second_flr',
  'garage_cars',
  'full_bath',
  'half_bath',
  'year_built',
]

export default function Predict() {
  const [meta, setMeta] = useState(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [askingPrice, setAskingPrice] = useState('')
  const [result, setResult] = useState(null)
  const [explanation, setExplanation] = useState(null)
  const [fairness, setFairness] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getMetadata()
      .then((m) => {
        setMeta(m)
        setForm((f) => ({ ...f, neighborhood: m.neighborhoods[0] }))
      })
      .catch((e) => setError(`Could not reach the API — is it running on port 8000? (${e.message})`))
  }, [])

  const update = (key) => (e) => {
    const raw = e.target.value
    setForm((f) => ({ ...f, [key]: NUMERIC_FIELDS.includes(key) ? Number(raw) : raw }))
  }

  const runValuation = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const [pred, exp] = await Promise.all([predictPrice(form), explainPrediction(form)])
      setResult(pred)
      setExplanation(exp)

      if (askingPrice) {
        const fair = await priceFairness({ ...form, asking_price: Number(askingPrice) })
        setFairness(fair)
      } else {
        setFairness(null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const chartData = explanation
    ? [
        ...explanation.top_positive_contributors.map((c) => ({ ...c, sign: 'positive' })),
        ...explanation.top_negative_contributors.map((c) => ({ ...c, sign: 'negative' })),
      ].sort((a, b) => a.impact - b.impact)
    : []

  if (error && !meta) {
    return (
      <div className="border border-rust/40 bg-rust/5 text-rust rounded-sm p-6 font-body text-sm max-w-xl">
        {error}
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-10">
      {/* FORM */}
      <form onSubmit={runValuation} className="space-y-5">
        <div>
          <span className="text-xs uppercase tracking-[0.2em] text-brass font-body">Step 1</span>
          <h2 className="font-display text-2xl text-parchment mt-1">Describe the property</h2>
        </div>

        <Field label={`Overall quality — ${form.overall_qual}/10`}>
          <input
            type="range"
            min="1"
            max="10"
            value={form.overall_qual}
            onChange={update('overall_qual')}
            className="w-full accent-brass"
          />
        </Field>

        <Field label={`Overall condition — ${form.overall_cond}/10`}>
          <input
            type="range"
            min="1"
            max="10"
            value={form.overall_cond}
            onChange={update('overall_cond')}
            className="w-full accent-brass"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
            <Field label="Lot area (sq ft)">
                <input type="number" min="1000" max="20000" value={form.lot_area} onChange={update('lot_area')} className="input" />
            </Field>
            <Field label="Year built">
                <input type="number" min="1900" max="2025" value={form.year_built} onChange={update('year_built')} className="input" />
            </Field>
            <Field label="Basement area (sq ft)">
                <input type="number" min="0" max="3000" value={form.total_bsmt_sf} onChange={update('total_bsmt_sf')} className="input" />
            </Field>
            <Field label="1st floor (sq ft)">
                <input type="number" min="300" max="3000" value={form.first_flr} onChange={update('first_flr')} className="input" />
            </Field>
            <Field label="2nd floor (sq ft)">
                <input type="number" min="0" max="2000" value={form.second_flr} onChange={update('second_flr')} className="input" />
            </Field>
          <Field label="Garage capacity">
            <input
              type="number"
              min="0"
              max="4"
              value={form.garage_cars}
              onChange={update('garage_cars')}
              className="input"
            />
          </Field>
          <Field label="Full bathrooms">
            <input
              type="number"
              min="0"
              max="4"
              value={form.full_bath}
              onChange={update('full_bath')}
              className="input"
            />
          </Field>
          <Field label="Half bathrooms">
            <input
              type="number"
              min="0"
              max="2"
              value={form.half_bath}
              onChange={update('half_bath')}
              className="input"
            />
          </Field>
        </div>

        <Field label="Neighborhood">
          <select value={form.neighborhood} onChange={update('neighborhood')} className="input">
            {meta?.neighborhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Kitchen quality">
            <select value={form.kitchen_qual} onChange={update('kitchen_qual')} className="input">
              {meta?.kitchen_qual_options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Basement quality">
            <select value={form.bsmt_qual} onChange={update('bsmt_qual')} className="input">
              {meta?.bsmt_qual_options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Asking price (optional — for fairness check)">
          <input
            type="number"
            placeholder="e.g. 190000"
            value={askingPrice}
            onChange={(e) => setAskingPrice(e.target.value)}
            className="input"
          />
        </Field>

        <button
          type="submit"
          disabled={loading || !meta}
          className="w-full border border-brass text-brass py-3 text-sm font-body tracking-wide hover:bg-brass hover:text-ink transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          {loading ? 'Appraising…' : 'Run valuation'}
        </button>

        {error && meta && <p className="text-rust text-xs font-body">{error}</p>}
      </form>

      {/* RESULTS */}
      <div className="space-y-8">
        {!result && (
          <div className="border border-dashed border-hairline rounded-sm py-24 flex flex-col items-center gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-muted font-body">Step 2</span>
            <p className="text-muted font-body text-sm">Fill in the property details and run a valuation.</p>
          </div>
        )}

        {result && (
          <>
            <div className="flex flex-wrap gap-8 items-start">
              <PriceTicket
                price={result.predicted_price}
                neighborhood={form.neighborhood}
                avgPrice={result.neighborhood_avg_price}
              />
              <ScoreDial
                label="Investment score"
                value={Math.round(result.investment_score)}
                max={100}
                accent="#C9A227"
              />
            </div>

            {fairness && (
              <div
                className={`border rounded-sm px-5 py-4 font-body text-sm ${
                  fairness.status === 'Underpriced'
                    ? 'border-sage/40 bg-sage/5 text-sage'
                    : fairness.status === 'Overpriced'
                    ? 'border-rust/40 bg-rust/5 text-rust'
                    : 'border-hairline bg-slate text-muted'
                }`}
              >
                <span className="font-semibold">{fairness.status}.</span> {fairness.message}{' '}
                {fairness.percentage > 0 &&
                  `(${fairness.percentage}% ${fairness.status === 'Underpriced' ? 'below' : 'above'} market value)`}
              </div>
            )}

            {explanation && (
              <div>
                <span className="text-xs uppercase tracking-[0.2em] text-brass font-body">
                  Why this price
                </span>
                <h3 className="font-display text-xl text-parchment mt-1 mb-4">Feature contribution</h3>
                <div className="bg-slate border border-hairline rounded-sm p-4" style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A3542" horizontal={false} />
                      <XAxis type="number" stroke="#8B96A5" fontSize={11} />
                      <YAxis type="category" dataKey="feature" stroke="#8B96A5" fontSize={11} width={110} />
                      <Tooltip
                        contentStyle={{ background: '#1C2530', border: '1px solid #2A3542', fontSize: 12 }}
                        labelStyle={{ color: '#EDEEF0' }}
                      />
                      <Bar dataKey="impact" radius={[2, 2, 2, 2]}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.impact >= 0 ? '#34D399' : '#E2725B'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-muted text-xs font-body mt-2">
                  Green bars push the price up, rust bars pull it down.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-muted font-body mb-1.5">{label}</span>
      {children}
    </label>
  )
}