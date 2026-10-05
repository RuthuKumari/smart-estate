const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      if (Array.isArray(body.detail)) {
        detail = body.detail
          .map((d) => `${d.loc?.[d.loc.length - 1]}: ${d.msg}`)
          .join('; ')
      } else {
        detail = body.detail || JSON.stringify(body)
      }
    } catch {
      // response wasn't JSON — keep statusText
    }
    throw new Error(`${res.status}: ${detail}`)
  }

  return res.json()
}

export const getMetadata = () => request('/metadata')

export const predictPrice = (payload) =>
  request('/predict', { method: 'POST', body: JSON.stringify(payload) })

export const explainPrediction = (payload) =>
  request('/explain', { method: 'POST', body: JSON.stringify(payload) })

export const priceFairness = (payload) =>
  request('/price-fairness', { method: 'POST', body: JSON.stringify(payload) })

export const getAdvisor = (payload) =>
  request('/advisor', { method: 'POST', body: JSON.stringify(payload) })

export const getLocationInsights = (neighborhood) =>
  request(`/location-insights/${encodeURIComponent(neighborhood)}`)

export const getModelDashboard = () => request('/model-dashboard')

export const getNeighborhoodComparison = (neighborhood) =>
  request(`/neighborhood-price-comparison/${encodeURIComponent(neighborhood)}`)

export const sendChatMessage = (payload) =>
  request('/chat', { method: 'POST', body: JSON.stringify(payload) })