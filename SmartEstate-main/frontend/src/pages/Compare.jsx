import { useEffect, useState } from 'react'
import { getMetadata, predictPrice, explainPrediction } from '../api/client.js'
import ScoreDial from '../components/ScoreDial.jsx'

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

function makeDefaultProperty(neighborhood = '') {
  return {
    id: crypto.randomUUID(),
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
    neighborhood,
    kitchen_qual: 'Gd',
    bsmt_qual: 'Gd',
  }
}

const LABELS = ['A', 'B', 'C']

export default function Compare() {
  const [meta, setMeta] = useState(null)
  const [properties, setProperties] = useState([])
  const [results, setResults] = useState(null) // [{ prediction, explanation }]
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getMetadata()
      .then((m) => {
        setMeta(m)
        setProperties([
          makeDefaultProperty(m.neighborhoods[0]),
          makeDefaultProperty(m.neighborhoods[1] || m.neighborhoods[0]),
        ])
      })
      .catch((e) => setError(`Could not reach the API — is it running? (${e.message})`))
  }, [])

  const updateProperty = (index, key) => (e) => {
    const raw = e.target.value
    setProperties((props) =>
      props.map((p, i) =>
        i === index ? { ...p, [key]: NUMERIC_FIELDS.includes(key) ? Number(raw) : raw } : p,
      ),
    )
  }

  const addProperty = () => {
    if (properties.length >= 3) return
    setProperties((props) => [...props, makeDefaultProperty(meta?.neighborhoods[0])])
  }

  const removeProperty = (index) => {
    if (properties.length <= 2) return
    setProperties((props) => props.filter((_, i) => i !== index))
  }

  const runComparison = async () => {
    setLoading(true)
    setError(null)
    try {
      const outcomes = await Promise.all(
        properties.map(async (p) => {
          const [prediction, explanation] = await Promise.all([predictPrice(p), explainPrediction(p)])
          return { prediction, explanation }
        }),
      )
      setResults(outcomes)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const rows =
    results &&
    results.map((r, i) => {
      const p = properties[i]
      const sqft = p.total_bsmt_sf + p.first_flr + p.second_flr
      return {
        label: LABELS[i],
        neighborhood: p.neighborhood,
        price: r.prediction.predicted_price,
        pricePerSqft: r.prediction.predicted_price / sqft,
        investmentScore: r.prediction.investment_score,
        neighborhoodAvg: r.prediction.neighborhood_avg_price,
        topPositive: r.explanation.top_positive_contributors[0]?.feature,
        topNegative: r.explanation.top_negative_contributors[0]?.feature,
      }
    })

  const bestValue = rows && [...rows].sort((a, b) => a.pricePerSqft - b.pricePerSqft)[0]
  const bestInvestment = rows && [...rows].sort((a, b) => b.investmentScore - a.investmentScore)[0]

  if (error && !meta) {
    return (
      <div className="border border-rust/40 bg-rust/5 text-rust rounded-sm p-6 font-body text-sm max-w-xl">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <span className="text-xs uppercase tracking-[0.2em] text-brass font-body">
            Comparison Engine
          </span>
          <h2 className="font-display text-3xl text-parchment mt-1">Weigh properties side by side</h2>
          <p className="text-muted font-body text-sm mt-2 max-w-xl">
            Appraise two or three properties at once and see which offers the better value, and why.
          </p>
        </div>
        {properties.length < 3 && (
          <button
            onClick={addProperty}
            className="border border-hairline text-muted hover:text-parchment hover:border-brass text-sm font-body px-4 py-2 transition-colors"
          >
            + Add property
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((p, i) => (
          <PropertyCard
            key={p.id}
            index={i}
            label={LABELS[i]}
            property={p}
            meta={meta}
            onChange={updateProperty}
            onRemove={() => removeProperty(i)}
            canRemove={properties.length > 2}
          />
        ))}
      </div>

      <button
        onClick={runComparison}
        disabled={loading || !meta}
        className="border border-brass text-brass px-6 py-3 text-sm font-body tracking-wide hover:bg-brass hover:text-ink transition-colors disabled:opacity-40"
      >
        {loading ? 'Appraising all…' : 'Compare properties'}
      </button>

      {error && meta && <p className="text-rust text-sm font-body">{error}</p>}

      {results && (
        <div className="space-y-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((r, i) => (
              <div key={i} className="bg-slate border border-hairline rounded-sm p-6 flex flex-col items-center gap-4">
                <span className="text-xs uppercase tracking-[0.2em] text-brass font-body self-start">
                  Property {LABELS[i]}
                </span>
                <div className="font-display text-3xl text-parchment font-semibold tabular-nums">
                  ${r.prediction.predicted_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <ScoreDial
                  label="Investment score"
                  value={Math.round(r.prediction.investment_score)}
                  max={100}
                  accent="#C9A227"
                />
              </div>
            ))}
          </div>

          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-brass font-body">The verdict</span>
            <div className="mt-3 space-y-2 font-body text-sm">
              <p className="text-parchment">
                <span className="text-sage font-semibold">Property {bestValue.label}</span> offers the
                best value at{' '}
                <span className="font-mono">${bestValue.pricePerSqft.toFixed(0)}/sqft</span>.
              </p>
              <p className="text-parchment">
                <span className="text-sage font-semibold">Property {bestInvestment.label}</span> has the
                strongest investment score at{' '}
                <span className="font-mono">{Math.round(bestInvestment.investmentScore)}/100</span>.
              </p>
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-brass font-body">Ledger</span>
            <div className="mt-3 overflow-x-auto border border-hairline rounded-sm">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="border-b border-hairline bg-slate">
                    <th className="text-left px-4 py-3 text-muted font-normal">Metric</th>
                    {rows.map((r) => (
                      <th key={r.label} className="text-left px-4 py-3 text-parchment font-medium">
                        Property {r.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono text-parchment">
                  <LedgerRow label="Neighborhood" rows={rows} render={(r) => r.neighborhood} mono={false} />
                  <LedgerRow
                    label="Predicted price"
                    rows={rows}
                    render={(r) => `$${r.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    highlightKey="price"
                    lowerIsBetter
                  />
                  <LedgerRow
                    label="Price / sqft"
                    rows={rows}
                    render={(r) => `$${r.pricePerSqft.toFixed(0)}`}
                    highlightKey="pricePerSqft"
                    lowerIsBetter
                  />
                  <LedgerRow
                    label="Investment score"
                    rows={rows}
                    render={(r) => `${Math.round(r.investmentScore)}/100`}
                    highlightKey="investmentScore"
                  />
                  <LedgerRow
                    label="Neighborhood avg"
                    rows={rows}
                    render={(r) => `$${r.neighborhoodAvg?.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  />
                  <LedgerRow label="Top positive driver" rows={rows} render={(r) => r.topPositive} mono={false} />
                  <LedgerRow label="Top negative driver" rows={rows} render={(r) => r.topNegative} mono={false} />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LedgerRow({ label, rows, render, highlightKey, lowerIsBetter = false, mono = true }) {
  let bestLabel = null
  if (highlightKey) {
    const sorted = [...rows].sort((a, b) =>
      lowerIsBetter ? a[highlightKey] - b[highlightKey] : b[highlightKey] - a[highlightKey],
    )
    bestLabel = sorted[0]?.label
  }

  return (
    <tr className="border-b border-hairline last:border-0">
      <td className="px-4 py-3 text-muted font-body">{label}</td>
      {rows.map((r) => (
        <td
          key={r.label}
          className={`px-4 py-3 ${mono ? 'font-mono' : 'font-body'} ${
            r.label === bestLabel ? 'text-sage font-semibold' : 'text-parchment'
          }`}
        >
          {render(r)}
        </td>
      ))}
    </tr>
  )
}

function PropertyCard({ index, label, property, meta, onChange, onRemove, canRemove }) {
  return (
    <div className="bg-slate border border-hairline rounded-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-brass font-body">
          Property {label}
        </span>
        {canRemove && (
          <button
            onClick={onRemove}
            className="text-muted hover:text-rust text-xs font-body transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      <MiniField label={`Quality — ${property.overall_qual}/10`}>
        <input
          type="range"
          min="1"
          max="10"
          value={property.overall_qual}
          onChange={onChange(index, 'overall_qual')}
          className="w-full accent-brass"
        />
      </MiniField>

      <div className="grid grid-cols-2 gap-3">
        <MiniField label="Lot area">
          <input
            type="number"
            min="1000"
            max="20000"
            value={property.lot_area}
            onChange={onChange(index, 'lot_area')}
            className="input"
          />
        </MiniField>
        <MiniField label="Year built">
          <input
            type="number"
            min="1900"
            max="2025"
            value={property.year_built}
            onChange={onChange(index, 'year_built')}
            className="input"
          />
        </MiniField>
        <MiniField label="Basement sqft">
          <input
            type="number"
            min="0"
            max="3000"
            value={property.total_bsmt_sf}
            onChange={onChange(index, 'total_bsmt_sf')}
            className="input"
          />
        </MiniField>
        <MiniField label="1st floor sqft">
          <input
            type="number"
            min="300"
            max="3000"
            value={property.first_flr}
            onChange={onChange(index, 'first_flr')}
            className="input"
          />
        </MiniField>
        <MiniField label="2nd floor sqft">
          <input
            type="number"
            min="0"
            max="2000"
            value={property.second_flr}
            onChange={onChange(index, 'second_flr')}
            className="input"
          />
        </MiniField>
        <MiniField label="Garage">
          <input
            type="number"
            min="0"
            max="4"
            value={property.garage_cars}
            onChange={onChange(index, 'garage_cars')}
            className="input"
          />
        </MiniField>
      </div>

      <MiniField label="Neighborhood">
        <select
          value={property.neighborhood}
          onChange={onChange(index, 'neighborhood')}
          className="input"
        >
          {meta?.neighborhoods.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </MiniField>

      <div className="grid grid-cols-2 gap-3">
        <MiniField label="Kitchen">
          <select
            value={property.kitchen_qual}
            onChange={onChange(index, 'kitchen_qual')}
            className="input"
          >
            {meta?.kitchen_qual_options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </MiniField>
        <MiniField label="Basement">
          <select value={property.bsmt_qual} onChange={onChange(index, 'bsmt_qual')} className="input">
            {meta?.bsmt_qual_options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </MiniField>
      </div>
    </div>
  )
}

function MiniField({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] text-muted font-body mb-1">{label}</span>
      {children}
    </label>
  )
}