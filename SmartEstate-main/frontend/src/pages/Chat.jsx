import { useEffect, useRef, useState } from 'react'
import { getMetadata, sendChatMessage } from '../api/client.js'

function defaultProperty(neighborhood = '') {
  return {
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

const NUMERIC_FIELDS = [
  'overall_qual', 'overall_cond', 'lot_area', 'total_bsmt_sf',
  'first_flr', 'second_flr', 'garage_cars', 'full_bath', 'half_bath', 'year_built',
]

const SUGGESTIONS = [
  "What's this property worth?",
  'Why is the price what it is?',
  'How\'s the neighborhood infrastructure?',
  'Is this a good investment?',
]

export default function Chat() {
  const [meta, setMeta] = useState(null)
  const [property, setProperty] = useState(null)
  const [askingPrice, setAskingPrice] = useState('')
  const [panelOpen, setPanelOpen] = useState(true)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your property advisor assistant. Load a property on the left (or just ask me a general question) and I'll pull real numbers from the platform to answer." },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    getMetadata()
      .then((m) => {
        setMeta(m)
        setProperty(defaultProperty(m.neighborhoods[0]))
      })
      .catch(() => {
        // Chat can still work for general questions without metadata loaded —
        // don't hard-block the page like Advisor/Compare do.
      })
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const updateField = (key) => (e) => {
    const raw = e.target.value
    setProperty((p) => ({ ...p, [key]: NUMERIC_FIELDS.includes(key) ? Number(raw) : raw }))
  }

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || loading) return

    const nextMessages = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const payload = {
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        property: property || null,
        asking_price: askingPrice ? Number(askingPrice) : null,
      }
      const data = await sendChatMessage(payload)
      setMessages((msgs) => [...msgs, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError(err.message)
      setMessages((msgs) => [
        ...msgs,
        { role: 'assistant', content: "Sorry, I couldn't reach the advisor service just now. Try again in a moment." },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-6 h-[75vh]">
      {/* ---- Property context panel ---- */}
      <div className={`bg-slate border border-hairline rounded-sm p-4 space-y-4 overflow-y-auto ${panelOpen ? '' : 'hidden md:block'}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.2em] text-brass font-body">Property context</span>
        </div>
        <p className="text-muted font-body text-xs">
          The assistant grounds its answers in this property's real numbers.
        </p>

        {!property ? (
          <p className="text-muted font-body text-xs">Loading metadata…</p>
        ) : (
          <>
            <Field label="Asking price ($, optional)">
              <input
                type="number"
                min="1"
                value={askingPrice}
                onChange={(e) => setAskingPrice(e.target.value)}
                className="input"
                placeholder="e.g. 210000"
              />
            </Field>

            <Field label={`Quality — ${property.overall_qual}/10`}>
              <input type="range" min="1" max="10" value={property.overall_qual} onChange={updateField('overall_qual')} className="w-full accent-brass" />
            </Field>
            <Field label={`Condition — ${property.overall_cond}/10`}>
              <input type="range" min="1" max="10" value={property.overall_cond} onChange={updateField('overall_cond')} className="w-full accent-brass" />
            </Field>

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

            <Field label="Neighborhood">
              <select value={property.neighborhood} onChange={updateField('neighborhood')} className="input">
                {meta?.neighborhoods.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
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
          </>
        )}
      </div>

      {/* ---- Chat window ---- */}
      <div className="bg-slate border border-hairline rounded-sm flex flex-col">
        <div className="border-b border-hairline p-4 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-brass font-body block">
              Advisor Chat
            </span>
            <h2 className="font-display text-xl text-parchment mt-1">Ask about this property</h2>
          </div>
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className="md:hidden text-muted hover:text-parchment text-xs font-body border border-hairline px-3 py-1.5"
          >
            {panelOpen ? 'Hide context' : 'Show context'}
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-sm px-4 py-3 text-sm font-body whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-brass text-ink'
                    : 'bg-ink border border-hairline text-parchment'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-ink border border-hairline text-muted rounded-sm px-4 py-3 text-sm font-body">
                Thinking…
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs font-body border border-hairline text-muted hover:text-parchment hover:border-brass px-3 py-1.5 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {error && <p className="px-5 pb-2 text-rust text-xs font-body">{error}</p>}

        <div className="border-t border-hairline p-4 flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about price, risk, neighborhood…"
            className="input flex-1 resize-none"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="border border-brass text-brass px-5 py-2 text-sm font-body tracking-wide hover:bg-brass hover:text-ink transition-colors disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] text-muted font-body mb-1">{label}</span>
      {children}
    </label>
  )
}