export default function PriceTicket({ price, neighborhood, avgPrice }) {
  const diff = avgPrice ? price - avgPrice : null
  const diffPct = avgPrice ? (diff / avgPrice) * 100 : null

  return (
    <div className="relative bg-slate border border-hairline rounded-sm px-8 py-7 max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] tracking-[0.2em] uppercase text-muted font-body">
          Appraised Value
        </span>
        <span className="text-[11px] font-mono text-muted">{neighborhood?.toUpperCase()}</span>
      </div>

      <div className="font-display text-5xl text-parchment font-semibold tabular-nums">
        ${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>

      <div className="my-5 border-t border-dashed border-hairline" />

      <div className="flex items-center justify-between text-sm font-mono">
        <span className="text-muted">Neighborhood avg</span>
        <span className="text-parchment">
          {avgPrice ? `$${avgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
        </span>
      </div>

      {diffPct !== null && (
        <div className={`mt-1 text-sm font-mono ${diff >= 0 ? 'text-sage' : 'text-rust'}`}>
          {diff >= 0 ? '▲' : '▼'} {Math.abs(diffPct).toFixed(1)}% vs. area average
        </div>
      )}
    </div>
  )
}