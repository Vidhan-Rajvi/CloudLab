const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const apiRequest = async (path, options = {}) => {
  const { method = 'GET', body, headers = {} } = options

  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  }

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  let data

  try {
    data = await response.json()
  } catch {
    throw new Error('The backend returned an invalid JSON response.')
  }

  if (!response.ok) {
    const detail = Array.isArray(data?.detail)
      ? data.detail.map((err) => err.msg).join(', ')
      : data?.detail
    throw new Error(
      detail || `API request failed with status ${response.status}`,
    )
  }

  return data
}

export const fetchRoot = () => apiRequest('/')

export const fetchReadiness = () => apiRequest('/health/ready')

export const fetchLiveness = () => apiRequest('/health/live')

// Phase 9.6 — Infrastructure Design Persistence API
export const fetchDesigns = () => apiRequest('/designs')

export const fetchDesignById = (designId) => apiRequest(`/designs/${designId}`)

export const createDesign = (payload) =>
  apiRequest('/designs', {
    method: 'POST',
    body: payload,
  })

export const updateDesign = (designId, payload) =>
  apiRequest(`/designs/${designId}`, {
    method: 'PUT',
    body: payload,
  })

export const deleteDesign = (designId) =>
  apiRequest(`/designs/${designId}`, {
    method: 'DELETE',
  })
