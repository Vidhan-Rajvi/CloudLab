const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const apiRequest = async (path) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
    },
  })

  let data

  try {
    data = await response.json()
  } catch {
    throw new Error('The backend returned an invalid JSON response.')
  }

  if (!response.ok) {
    throw new Error(
      data?.detail || `API request failed with status ${response.status}`,
    )
  }

  return data
}

export const fetchRoot = () => apiRequest('/')

export const fetchReadiness = () => apiRequest('/health/ready')

export const fetchLiveness = () => apiRequest('/health/live')
