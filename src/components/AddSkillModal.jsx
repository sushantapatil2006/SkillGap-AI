import { useState } from 'react'
import { Check, X } from 'lucide-react'

export function AddSkillModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [level, setLevel] = useState(2)
  const [evidence, setEvidence] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    if (e) e.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) {
      setError('Please enter a skill name.')
      return
    }

    const accents = ['lime', 'blue', 'violet', 'orange', 'pink']
    const randomAccent = accents[Math.floor(Math.random() * accents.length)]

    onAdd({
      name: cleanName,
      level: Number(level),
      evidence: evidence.trim(),
      accent: randomAccent,
    })
    onClose()
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Inventory update</p>
            <h2>Add technical skill</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <p className="modal-copy">
          Add a skill to your technical inventory with self-reported proficiency and evidence.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Skill name
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              placeholder="e.g. PyTorch, Docker, PostgreSQL, React"
              autoFocus
              maxLength={200}
              required
            />
          </label>

          <label>
            Proficiency level
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value={0}>Level 0: No experience / exploring</option>
              <option value={1}>Level 1: Guided basics (walkthroughs)</option>
              <option value={2}>Level 2: Routine tasks with help</option>
              <option value={3}>Level 3: Independent delivery</option>
              <option value={4}>Level 4: Architecture & design expertise</option>
            </select>
          </label>

          <label>
            Evidence / Projects (optional)
            <input
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="e.g. Built data processing pipeline in course project"
              maxLength={2000}
            />
          </label>

          {error && (
            <p style={{ color: '#b03d32', fontSize: '11px', marginTop: '10px' }}>
              {error}
            </p>
          )}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              Add to profile <Check size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
