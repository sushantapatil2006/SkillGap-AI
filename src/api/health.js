import { request } from './client'

const BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '')
  : 'http://localhost:8000'

export async function checkHealthLive() {
  const res = await fetch(`${BASE_URL}/health/live`)
  if (!res.ok) throw new Error(`Live check failed: ${res.status}`)
  return res.json()
}

export async function checkHealthReady() {
  const res = await fetch(`${BASE_URL}/health/ready`)
  if (!res.ok) throw new Error(`Ready check failed: ${res.status}`)
  return res.json()
}

export async function checkHealthModel() {
  const res = await fetch(`${BASE_URL}/health/model`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { available: false, detail: body.detail || 'Model pending offline training' }
  }
  return { available: true, ...(await res.json()) }
}
