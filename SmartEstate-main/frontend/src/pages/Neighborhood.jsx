import { useEffect, useState } from 'react'
import { getMetadata, getLocationInsights } from '../api/client.js'
import ScoreDial from '../components/ScoreDial.jsx'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const CATEGORY_COLORS = {
  Hospitals: '#E2725B',
  Schools: '#34D399',
  Restaurants: '#FBBF24',
  Shopping: '#A78BFA',
  Parks: '#4ADE80',
  'Bus Stops': '#38BDF8',
}

function dotIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #0F1720;"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

function propertyIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;background:#C9A227;border:2px solid #0F1720;transform:rotate(45deg);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

export default function Neighborhood() {
  const [neighborhoods, setNeighborhoods] = useState([])
  const [selected, setSelected] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getMetadata()
      .then((m) => {
        setNeighborhoods(m.neighborhoods)
        setSelected(m.neighborhoods[0])
      })
      .catch((e) => setError(`Could not reach the API — is it running? (${e.message})`))
  }, [])

  const analyze = async () => {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await getLocationInsights(selected)
      setData(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const radarData = data
    ? Object.entries(data.score_data['Category Scores']).map(([category, score]) => ({ category, score }))
    : []

  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs uppercase tracking-[0.2em] text-brass font-body">
          Location Intelligence
        </span>
        <h2 className="font-display text-3xl text-parchment mt-1">Neighborhood analysis</h2>
        <p className="text-muted font-body text-sm mt-2 max-w-xl">
          Pulls live infrastructure data — hospitals, schools, transit, parks, shopping, dining —
          around a neighborhood's center point and scores it for livability.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end max-w-md">
        <label className="flex-1">
          <span className="block text-xs text-muted font-body mb-1.5">Neighborhood</span>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className="input">
            {neighborhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={analyze}
          disabled={loading || !selected}
          className="border border-brass text-brass px-5 py-2 text-sm font-body tracking-wide hover:bg-brass hover:text-ink transition-colors disabled:opacity-40"
        >
          {loading ? 'Scanning…' : 'Analyze'}
        </button>
      </div>

      {error && <p className="text-rust text-sm font-body">{error}</p>}

      {data && (
        <>
          <div className="flex flex-wrap gap-10 items-center">
            <ScoreDial
              label="Infrastructure score"
              value={data.score_data['Overall Score']}
              max={10}
              accent="#C9A227"
            />
            <div className="bg-slate border border-hairline rounded-sm px-6 py-4">
              <span className="text-xs uppercase tracking-[0.2em] text-muted font-body">Grade</span>
              <div className="font-display text-3xl text-parchment mt-1">{data.score_data.Grade}</div>
            </div>
            <p className="max-w-sm text-sm font-body text-muted">{data.score_data.Recommendation}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate border border-hairline rounded-sm p-4" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#2A3542" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: '#8B96A5', fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 5]} tick={{ fill: '#8B96A5', fontSize: 10 }} />
                  <Radar dataKey="score" stroke="#C9A227" fill="#C9A227" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-sm overflow-hidden border border-hairline" style={{ height: 300 }}>
              <MapContainer center={[data.lat, data.lon]} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                <Marker position={[data.lat, data.lon]} icon={propertyIcon()}>
                  <Popup>Neighborhood center</Popup>
                </Marker>
                {Object.entries(data.infrastructure).map(([category, places]) =>
                  places.map((place, i) => (
                    <Marker
                      key={`${category}-${i}`}
                      position={[place.lat, place.lon]}
                      icon={dotIcon(CATEGORY_COLORS[category] || '#8B96A5')}
                    >
                      <Popup>
                        <strong>{category}</strong>
                        <br />
                        {place.name}
                        <br />
                        {place.distance} km away
                      </Popup>
                    </Marker>
                  )),
                )}
              </MapContainer>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-slate border border-sage/30 rounded-sm p-4">
              <span className="text-xs uppercase tracking-[0.2em] text-sage font-body">Strengths</span>
              <ul className="mt-2 space-y-1 text-sm font-body text-parchment">
                {data.score_data.Strengths.length === 0 && <li className="text-muted">None detected</li>}
                {data.score_data.Strengths.map((s) => (
                  <li key={s}>+ {s}</li>
                ))}
              </ul>
            </div>
            <div className="bg-slate border border-rust/30 rounded-sm p-4">
              <span className="text-xs uppercase tracking-[0.2em] text-rust font-body">Weaknesses</span>
              <ul className="mt-2 space-y-1 text-sm font-body text-parchment">
                {data.score_data.Weaknesses.length === 0 && <li className="text-muted">None detected</li>}
                {data.score_data.Weaknesses.map((w) => (
                  <li key={w}>− {w}</li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-brass font-body">
              Nearby facilities
            </span>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
              {Object.entries(data.infrastructure).map(([category, places]) => (
                <div key={category} className="bg-slate border border-hairline rounded-sm p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: CATEGORY_COLORS[category] || '#8B96A5' }}
                    />
                    <span className="text-sm font-body text-parchment font-medium">{category}</span>
                  </div>
                  {places.length === 0 ? (
                    <p className="text-xs text-muted font-body">No results found</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {places.slice(0, 5).map((p, i) => (
                        <li key={i} className="text-xs font-body text-muted flex justify-between gap-2">
                          <span className="truncate">{p.name.split(',')[0]}</span>
                          <span className="font-mono text-parchment shrink-0">{p.distance} km</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}