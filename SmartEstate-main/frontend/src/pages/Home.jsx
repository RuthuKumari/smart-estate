import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="max-w-2xl">
      <span className="text-xs uppercase tracking-[0.2em] text-brass font-body">
        Decision Intelligence Platform
      </span>
      <h1 className="font-display text-4xl md:text-5xl font-semibold text-parchment mt-3 leading-tight">
        Every property, appraised, explained, and scored.
      </h1>
      <p className="text-muted font-body mt-4 leading-relaxed">
        SmartEstate runs a tuned XGBoost valuation model against structural, neighborhood, and
        engineered features, then explains every number with SHAP, scores the surrounding
        infrastructure, and hands off to a grounded AI advisor — no black boxes, no guesswork.
      </p>
      <Link
        to="/predict"
        className="inline-block mt-8 border border-brass text-brass px-5 py-2.5 text-sm font-body tracking-wide hover:bg-brass hover:text-ink transition-colors"
      >
        Run a valuation →
      </Link>
    </div>
  )
}