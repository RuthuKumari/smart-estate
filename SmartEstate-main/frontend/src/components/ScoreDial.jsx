export default function ScoreDial({ label, value, max = 100, suffix = '', accent = '#C9A227' }) {
  const pct = Math.max(0, Math.min(1, value / max))
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-[110px] h-[110px]">
        <svg width="110" height="110" viewBox="0 0 110 110" className="-rotate-90">
          <circle cx="55" cy="55" r={radius} fill="none" stroke="#2A3542" strokeWidth="8" />
          <circle
            cx="55"
            cy="55"
            r={radius}
            fill="none"
            stroke={accent}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-xl text-parchment tabular-nums">
            {value}
            {suffix}
          </span>
        </div>
      </div>
      <span className="text-xs uppercase tracking-wide text-muted font-body text-center max-w-[110px]">
        {label}
      </span>
    </div>
  )
}