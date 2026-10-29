import { useState } from 'react'
import { ArrowUpRight, Check, Plus, Target, Trash2 } from 'lucide-react'

export function SkillGapsView({ profile, latestResult, onAddSkill, onUpdateProfile, notify }) {
  const skills = profile?.skills || []
  const topRoleGaps = latestResult?.recommendations?.[0]?.gaps || []
  const gapsMap = new Map(topRoleGaps.map((g) => [g.name.toLowerCase(), g]))

  const levelLabels = [
    '0: No experience / exploring',
    '1: Guided basics',
    '2: Routine tasks with help',
    '3: Independent delivery',
    '4: Architecture & review expertise',
  ]

  async function handleLevelChange(skillName, newLevel) {
    const updatedSkills = skills.map((s) =>
      s.name === skillName ? { ...s, level: Number(newLevel) } : s
    )
    try {
      await onUpdateProfile({ ...profile, skills: updatedSkills })
      notify(`Updated ${skillName} to level ${newLevel}`)
    } catch (err) {
      notify(`Failed to update skill: ${err.message}`)
    }
  }

  async function handleDeleteSkill(skillName) {
    const updatedSkills = skills.filter((s) => s.name !== skillName)
    try {
      await onUpdateProfile({ ...profile, skills: updatedSkills })
      notify(`Removed ${skillName} from profile`)
    } catch (err) {
      notify(`Failed to remove skill: ${err.message}`)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <p className="eyebrow" style={{ margin: '0 0 8px' }}>
            <span className="pulse" /> Technical Inventory & Requirement Shortfalls
          </p>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: 0, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
            Skill Inventory & Gap Analysis
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '12px 0 0', maxWidth: '640px', lineHeight: 1.6 }}>
            Levels follow standardized behavioral anchors (0 to 4). Changes are saved directly to your
            backend profile and database.
          </p>
        </div>

        <button className="primary-button" onClick={onAddSkill}>
          <Plus size={15} /> Add technical skill <ArrowUpRight size={15} />
        </button>
      </div>

      {/* Top Role Gaps Warning Banner if gaps exist */}
      {topRoleGaps.length > 0 && (
        <div
          style={{
            background: '#faf4ec',
            border: '1px solid #f1e0cf',
            padding: '18px 22px',
            borderRadius: '8px',
            marginBottom: '24px',
          }}
        >
          <strong style={{ fontSize: '13px', color: '#8d551c', display: 'block', marginBottom: '4px' }}>
            {topRoleGaps.length} Requirement Gaps for {latestResult?.recommendations?.[0]?.role_title}
          </strong>
          <p style={{ fontSize: '12px', color: '#6d4b24', margin: 0, lineHeight: 1.5 }}>
            The skills below represent the highest leverage points for your top-ranked career target.
            Close these gaps by building project evidence and practicing independent delivery.
          </p>
        </div>
      )}

      {/* Skills Table */}
      <section className="panel" style={{ padding: '24px' }}>
        <div className="panel-heading" style={{ marginBottom: '20px' }}>
          <div>
            <p className="eyebrow">Database Profile</p>
            <h2 style={{ fontSize: '17px' }}>Your Technical Claims ({skills.length})</h2>
          </div>
          <span style={{ fontFamily: 'DM Mono', fontSize: '11px', color: 'var(--muted)' }}>
            Strictly unique names
          </span>
        </div>

        {skills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Target size={32} color="#a0aba3" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', margin: '0 0 8px' }}>No skills in database profile</h3>
            <p style={{ fontSize: '12px', color: 'var(--muted)', maxWidth: '400px', margin: '0 auto 20px', lineHeight: 1.6 }}>
              Add your languages, libraries, and tools with self-reported proficiency and evidence.
            </p>
            <button className="primary-button" onClick={onAddSkill}>
              <Plus size={15} /> Add technical skill
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {skills.map((skill) => {
              const gapInfo = gapsMap.get(skill.name.toLowerCase())
              return (
                <div
                  key={skill.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    background: 'var(--paper)',
                    flexWrap: 'wrap',
                    gap: '14px',
                  }}
                >
                  <div style={{ minWidth: '220px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '14px' }}>{skill.name}</strong>
                      {gapInfo && (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: '#f8ebd8',
                            color: '#8f571b',
                            fontFamily: 'DM Mono',
                            fontWeight: 700,
                          }}
                        >
                          Target Gap: L{gapInfo.required_level}
                        </span>
                      )}
                    </div>
                    {skill.evidence && (
                      <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '4px 0 0', lineHeight: 1.4 }}>
                        Evidence: {skill.evidence}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'grid', gap: '4px', textAlign: 'right' }}>
                      <select
                        value={skill.level}
                        onChange={(e) => handleLevelChange(skill.name, e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          fontSize: '11px',
                          fontFamily: 'Manrope',
                          background: '#fff',
                        }}
                      >
                        {levelLabels.map((lbl, idx) => (
                          <option key={idx} value={idx}>
                            {lbl}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      className="icon-button"
                      title="Remove skill from profile"
                      onClick={() => handleDeleteSkill(skill.name)}
                      style={{ color: '#b03d32', width: '32px', height: '32px' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
