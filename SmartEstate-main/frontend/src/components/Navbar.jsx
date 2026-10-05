import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home' },
  { to: '/predict', label: 'Predict' },
  { to: '/neighborhood', label: 'Neighborhood' },
  { to: '/compare', label: 'Compare' },
  { to: '/advisor', label: 'Advisor' },
  { to: '/chat', label: 'Chat' },
  { to: '/dashboard', label: 'Model' },
]

export default function Navbar() {
  return (
    <header className="border-b border-hairline">
      <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold text-parchment">SmartEstate</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted font-body hidden sm:inline">
            Real Estate Intelligence
          </span>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-body">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `transition-colors ${isActive ? 'text-brass' : 'text-muted hover:text-parchment'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}