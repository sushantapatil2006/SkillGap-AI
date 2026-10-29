import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { listAttempts } from '../api/assessment'
import { getCareerResult } from '../api/career'
import { getProfile, saveProfile } from '../api/profile'
import { useAuth } from '../context/AuthContext'
import { AccountSettingsModal } from './AccountSettingsModal'
import { AddSkillModal } from './AddSkillModal'
import { AssessmentView } from './AssessmentView'
import { CareerPathsView } from './CareerPathsView'
import { CatalogView } from './CatalogView'
import { Dashboard } from './Dashboard'
import { LearningPlanView } from './LearningPlanView'
import { ProfileModal } from './ProfileModal'
import { Sidebar } from './Sidebar'
import { SkillGapsView } from './SkillGapsView'
import { Topbar } from './Topbar'

export function Workspace() {
  const { user, logout, deleteMyAccount } = useAuth()
  const [activeTab, setActiveTab] = useState('Overview')
  const [profile, setProfile] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [latestResult, setLatestResult] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showAddSkillModal, setShowAddSkillModal] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)

  function notify(msg) {
    setToast(msg)
    window.setTimeout(() => setToast(''), 3000)
  }

  // Load database profile and attempts
  useEffect(() => {
    async function loadWorkspaceData() {
      setLoading(true)
      try {
        // 1. Fetch profile
        try {
          const profileData = await getProfile()
          setProfile(profileData)
        } catch (profileErr) {
          if (profileErr.status === 404) {
            // New user without profile
            setProfile(null)
          } else if (profileErr.status === 401) {
            notify('Session expired. Please sign in again.')
            logout()
            return
          }
        }

        // 2. Fetch attempts
        try {
          const attemptsList = await listAttempts()
          setAttempts(attemptsList || [])

          // 3. Fetch latest completed attempt results if available
          const latestCompleted = (attemptsList || []).find((a) => a.status === 'completed')
          if (latestCompleted) {
            try {
              const res = await getCareerResult(latestCompleted.id)
              setLatestResult(res)
            } catch {
              // 404 or 503 is expected when model hasn't run yet
            }
          }
        } catch (attemptsErr) {
          if (attemptsErr.status === 401) {
            notify('Session expired. Please sign in again.')
            logout()
            return
          }
          setAttempts([])
        }
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadWorkspaceData()
    }
  }, [user])

  async function refreshCareerResults() {
    try {
      const attemptsList = await listAttempts()
      setAttempts(attemptsList || [])
      const latestCompleted = (attemptsList || []).find((a) => a.status === 'completed')
      if (latestCompleted) {
        const res = await getCareerResult(latestCompleted.id)
        setLatestResult(res)
      }
    } catch (err) {
      console.warn('Failed to refresh career result:', err)
    }
  }

  async function handleSaveProfile(updatedProfile) {
    try {
      const saved = await saveProfile(updatedProfile)
      setProfile(saved)
      setShowProfileModal(false)
      notify('Profile successfully saved to database!')
      await refreshCareerResults()
    } catch (err) {
      if (err.status === 401) {
        notify('Session expired. Please sign in again.')
        logout()
      } else {
        notify(`Profile save error: ${err.message}`)
      }
      throw err
    }
  }

  async function handleAddSkill(newSkill) {
    const existingSkills = profile?.skills || []
    // Ensure case-insensitive uniqueness
    if (existingSkills.some((s) => s.name.toLowerCase() === newSkill.name.toLowerCase())) {
      notify(`Skill "${newSkill.name}" already exists in your profile.`)
      return
    }

    const updatedProfile = {
      display_name: profile?.display_name || user?.email?.split('@')[0] || 'Learner',
      education_level: profile?.education_level || "Bachelor's degree",
      specialization: profile?.specialization || 'Computer Science',
      experience_months: profile?.experience_months ?? 0,
      experience_summary: profile?.experience_summary || '',
      project_summary: profile?.project_summary || '',
      skills: [...existingSkills, newSkill],
      desired_roles: profile?.desired_roles || ['Software Engineer'],
    }

    try {
      const saved = await saveProfile(updatedProfile)
      setProfile(saved)
      notify(`${newSkill.name} added to your database profile!`)
      await refreshCareerResults()
    } catch (err) {
      notify(`Failed to save skill: ${err.message}`)
    }
  }

  async function handleRefreshAttempts() {
    try {
      const updated = await listAttempts()
      setAttempts(updated || [])
    } catch {}
  }

  return (
    <div className="app-shell">
      <Sidebar
        active={activeTab}
        setActive={setActiveTab}
        profile={profile}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      <main className="main-content">
        <Topbar
          active={activeTab}
          user={user}
          profile={profile}
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenAccount={() => setShowAccountModal(true)}
          onLogout={logout}
        />

        <div className="page-content">
          {activeTab === 'Overview' && (
            <Dashboard
              profile={profile}
              attempts={attempts}
              latestResult={latestResult}
              onOpenProfile={() => setShowProfileModal(true)}
              onOpenAssessment={() => setActiveTab('Assessments')}
              onAddSkill={() => setShowAddSkillModal(true)}
              setActiveTab={setActiveTab}
              notify={notify}
            />
          )}

          {activeTab === 'Career paths' && (
            <CareerPathsView
              profile={profile}
              latestResult={latestResult}
              attempts={attempts}
              onOpenAssessment={() => setActiveTab('Assessments')}
              onOpenProfile={() => setShowProfileModal(true)}
            />
          )}

          {activeTab === 'Skill gaps' && (
            <SkillGapsView
              profile={profile}
              latestResult={latestResult}
              onAddSkill={() => setShowAddSkillModal(true)}
              onUpdateProfile={handleSaveProfile}
              notify={notify}
            />
          )}

          {activeTab === 'Learning plan' && (
            <LearningPlanView
              latestResult={latestResult}
              attempts={attempts}
              onOpenAssessment={() => setActiveTab('Assessments')}
              onOpenProfile={() => setShowProfileModal(true)}
            />
          )}

          {activeTab === 'Assessments' && (
            <AssessmentView
              profile={profile}
              onOpenProfile={() => setShowProfileModal(true)}
              notify={notify}
              onSelectAttemptResult={(result) => setLatestResult(result)}
            />
          )}

          {activeTab === 'Catalogs' && <CatalogView notify={notify} />}
        </div>
      </main>

      {/* Modals */}
      {showProfileModal && (
        <ProfileModal
          profile={profile}
          skills={profile?.skills || []}
          onClose={() => setShowProfileModal(false)}
          onSave={handleSaveProfile}
        />
      )}

      {showAddSkillModal && (
        <AddSkillModal
          onClose={() => setShowAddSkillModal(false)}
          onAdd={handleAddSkill}
        />
      )}

      {showAccountModal && (
        <AccountSettingsModal
          user={user}
          onClose={() => setShowAccountModal(false)}
          onDeleteAccount={deleteMyAccount}
          onLogout={logout}
        />
      )}

      {toast && (
        <div className="toast">
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  )
}
