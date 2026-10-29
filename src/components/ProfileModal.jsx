import { useState } from 'react'
import { Check, X } from 'lucide-react'

export function ProfileModal({ profile, skills, onClose, onSave }) {
  const [name, setName] = useState(profile?.display_name || 'Alex Morgan')
  const [role, setRole] = useState(
    profile?.desired_roles?.[0] || 'Machine Learning Engineer'
  )
  const [education, setEducation] = useState(
    profile?.education_level || "Bachelor's degree"
  )
  const [specialization, setSpecialization] = useState(
    profile?.specialization || 'Computer Science'
  )
  const [experienceMonths, setExperienceMonths] = useState(
    profile?.experience_months ?? 12
  )
  const [projectSummary, setProjectSummary] = useState(
    profile?.project_summary || ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      // Map current skills to SkillClaim schema
      const skillClaims = (skills || []).map((s) => ({
        name: s.name,
        level: Math.max(0, Math.min(4, Number(s.level) || 0)),
        evidence: s.evidence || '',
      }))

      await onSave({
        display_name: name.trim() || 'Alex Morgan',
        education_level: education,
        specialization: specialization.trim() || 'General',
        experience_months: Math.max(0, Math.min(720, Number(experienceMonths) || 0)),
        experience_summary: profile?.experience_summary || '',
        project_summary: projectSummary.trim(),
        skills: skillClaims,
        desired_roles: role.trim() ? [role.trim()] : [],
      })
    } catch (err) {
      setError(err?.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Profile details</p>
            <h2>Shape your signal</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <p className="modal-copy">
          A few details help us tune role compatibility and learning priorities.
        </p>

        <label>
          Display name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={200}
            required
          />
        </label>

        <label>
          Target role
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Machine Learning Engineer"
            maxLength={200}
          />
        </label>

        <label>
          Education level
          <select
            value={education}
            onChange={(e) => setEducation(e.target.value)}
          >
            <option value="Secondary school">Secondary school</option>
            <option value="Diploma or vocational qualification">Diploma or vocational</option>
            <option value="Undergraduate degree in progress">Undergraduate in progress</option>
            <option value="Bachelor's degree">Bachelor's degree</option>
            <option value="Postgraduate degree">Postgraduate degree</option>
            <option value="Self-taught / other">Self-taught / other</option>
          </select>
        </label>

        <label>
          Specialization / Field
          <input
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            placeholder="e.g. Computer Science, Statistics, Physics"
            maxLength={200}
          />
        </label>

        <label>
          Practical experience (Months)
          <input
            type="number"
            min={0}
            max={720}
            value={experienceMonths}
            onChange={(e) => setExperienceMonths(e.target.value)}
          />
        </label>

        {error && (
          <p style={{ color: '#b03d32', fontSize: '11px', marginTop: '12px', marginBottom: '0' }}>
            {error}
          </p>
        )}

        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="primary-button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save profile'} <Check size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
