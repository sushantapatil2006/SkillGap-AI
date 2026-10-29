import { request } from './client'

function normalizeCareerResult(data) {
  if (!data) return data
  const roles = data.roles || data.recommendations || []
  const normalized = roles.map((r, idx) => ({
    ...r,
    rank: r.rank ?? idx + 1,
    role_title: r.role_title || r.title,
    title: r.title || r.role_title,
    compatibility: r.compatibility ?? r.compatibility_score ?? 0,
    compatibility_score: r.compatibility_score ?? r.compatibility ?? 0,
    gaps: r.gaps || r.skill_gaps || [],
    skill_gaps: r.skill_gaps || r.gaps || [],
    learning_plan: r.learning_plan || r.recommendations || [],
    recommendations: r.recommendations || r.learning_plan || [],
  }))

  return {
    ...data,
    roles: normalized,
    recommendations: normalized,
  }
}

export async function getCareerResult(attemptId) {
  const data = await request(`/career-results/${encodeURIComponent(attemptId)}`)
  return normalizeCareerResult(data)
}

export async function createCareerResult(attemptId) {
  const data = await request(`/career-results/${encodeURIComponent(attemptId)}`, {
    method: 'POST',
  })
  return normalizeCareerResult(data)
}

export async function getSkillsCatalog() {
  return request('/skills')
}

export async function getJobRolesCatalog() {
  return request('/job-roles')
}
