import { request } from './client'

export async function getProfile() {
  return request('/profiles/me')
}

export async function saveProfile(profileData) {
  // Normalize skills to match SkillClaim schema
  const seenSkillNames = new Set()
  const uniqueSkills = []

  if (Array.isArray(profileData.skills)) {
    for (const skill of profileData.skills) {
      if (!skill || !skill.name) continue
      const normalizedName = skill.name.trim()
      const key = normalizedName.toLowerCase()
      if (!seenSkillNames.has(key)) {
        seenSkillNames.add(key)
        uniqueSkills.push({
          name: normalizedName,
          level: Math.max(0, Math.min(4, Number(skill.level) || 0)),
          evidence: String(skill.evidence || '').slice(0, 2000),
        })
      }
    }
  }

  const payload = {
    display_name: (profileData.display_name || 'Alex Morgan').trim().slice(0, 200),
    education_level: (profileData.education_level || "Bachelor's degree").trim().slice(0, 100),
    specialization: (profileData.specialization || 'Computer Science').trim().slice(0, 200),
    experience_months: Math.max(0, Math.min(720, Number(profileData.experience_months) || 0)),
    experience_summary: String(profileData.experience_summary || '').slice(0, 5000),
    project_summary: String(profileData.project_summary || '').slice(0, 5000),
    skills: uniqueSkills,
    desired_roles: Array.isArray(profileData.desired_roles)
      ? profileData.desired_roles.map((r) => String(r).trim()).filter(Boolean).slice(0, 10)
      : [],
  }

  return request('/profiles/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
