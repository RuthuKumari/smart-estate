import { useEffect, useState } from 'react'
import { getModelDashboard } from '../api/client.js'
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

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getModelDashboard()
      .then(setData)
      .catch((e) => setError(`Could not reach the API — is it running? (${e.message})`))
  }, [])

  if (error) {
    return (
      <div className="border border-rust/40 bg-rust/5 text-rust rounded-sm p-6 font-body text-sm max-w-xl">
        {error}
      </div>
    )
  }

  if (!data) {
    return <p className="text-muted font-body text-sm">Loading model metrics…</p>
  }

  const bestR2 = Math.max(...data.model_comparison.map((m) => m.r2_score))

  return (
    <div className="space-y-10">
      <div>
        <span className="text-xs uppercase tracking-[0.2em] text-brass font-body">
          Under the Hood
        </span>
        <h2 className="font-display text-3xl text-parchment mt-1">Model performance</h2>
        <p className="text-muted font-body text-sm mt-2 max-w-xl">
          Every prediction on this platform comes from the tuned XGBoost model below — trained on
          the Ames Housing dataset and benchmarked against simpler baselines.
        </p>
      </div>

      <div>
        <span className="text-xs uppercase tracking-[0.2em] text-brass font-body">
          Model comparison (R²)
        </span>
        <div className="mt-3 grid sm:grid-cols-3 gap-4">
          {data.model_comparison.map((m) => (
            <div
              key={m.model}
              className={`bg-slate border rounded-sm p-5 ${
                m.r2_score === bestR2 ? 'border-brass' : 'border-hairline'
              }`}
            >
              <span className="text-xs text-muted font-body">{m.model}</span>
              <div
                className={`font-display text-3xl mt-1 tabular-nums ${
                  m.r2_score === bestR2 ? 'text-brass' : 'text-parchment'
                }`}
              >
                {m.r2_score.toFixed(3)}
              </div>
              {m.r2_score === bestR2 && (
                <span className="text-[10px] uppercase tracking-[0.15em] text-brass font-body">
                  In production
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="text-xs uppercase tracking-[0.2em] text-brass font-body">
          Top 15 feature importances
        </span>
        <p className="text-muted font-body text-xs mt-1 mb-3">
          How much each feature influences the model overall — not to be confused with the
          per-property SHAP breakdown on the Predict page, which shows impact for one specific
          property.
        </p>
        <div className="bg-slate border border-hairline rounded-sm p-4" style={{ height: 480 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.feature_importance}
              layout="vertical"
              margin={{ left: 24, right: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2A3542" horizontal={false} />
              <XAxis type="number" stroke="#8B96A5" fontSize={11} />
              <YAxis type="category" dataKey="feature" stroke="#8B96A5" fontSize={11} width={110} />
              <Tooltip
                contentStyle={{ background: '#1C2530', border: '1px solid #2A3542', fontSize: 12 }}
                labelStyle={{ color: '#EDEEF0' }}
                formatter={(value) => value.toFixed(4)}
              />
              <Bar dataKey="importance" radius={[2, 2, 2, 2]}>
                {data.feature_importance.map((_, i) => (
                  <Cell key={i} fill="#C9A227" fillOpacity={1 - i * 0.045} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}