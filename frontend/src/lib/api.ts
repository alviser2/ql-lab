import axios, { AxiosError } from 'axios'

export type ApiError = Error & {
  code?: string
  details?: unknown
  status?: number
}

type ApiErrorPayload = {
  code?: unknown
  error?: unknown
  message?: unknown
  details?: unknown
}

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

const api = axios.create({
  // Production-friendly default: same-origin reverse proxy (/api)
  baseURL: configuredBaseUrl && configuredBaseUrl.length > 0 ? configuredBaseUrl : '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ql-lab-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function toApiError(raw: unknown): ApiError {
  const axiosErr = raw as AxiosError<ApiErrorPayload>
  const data = axiosErr.response?.data

  const code =
    typeof data?.code === 'string'
      ? data.code
      : typeof data?.error === 'string'
        ? data.error
        : undefined

  const message =
    typeof data?.message === 'string'
      ? data.message
      : typeof data?.error === 'string'
        ? data.error
        : axiosErr.message || 'Lỗi hệ thống'

  const err: ApiError = new Error(message)
  if (code) err.code = code
  if (data?.details !== undefined) err.details = data.details
  if (axiosErr.response?.status) err.status = axiosErr.response.status
  return err
}

// Auto-redirect to login on 401 + normalize errors
api.interceptors.response.use(
  (res) => res,
  (rawErr: unknown) => {
    const axiosErr = rawErr as AxiosError
    if (axiosErr.response?.status === 401) {
      localStorage.removeItem('ql-lab-token')
      localStorage.removeItem('ql-lab-auth')
      window.location.href = '/login'
    }
    return Promise.reject(toApiError(rawErr))
  },
)

export default api
