import { ArrowUpRight, BookOpen, Compass, Target } from 'lucide-react'

export function SectionView({ active, onOpenProfile, onOpenAssessment }) {
  const meta = {
    'Career paths': {
      icon: <Compass size={24} />,
      title: 'Make this view your next focus.',
      desc: 'Your profile intelligence will become more useful as you complete the assessment and add evidence from projects, certifications, and experience.',
      buttonText: 'Take skill assessment',
      action: onOpenAssessment,
    },
    'Skill gaps': {
      icon: <Target size={24} />,
      title: 'Identify your leverage points.',
      desc: 'Review the technical proficiencies required by your target roles against self-reported and evidence-backed skill claims.',
      buttonText: 'Update skill inventory',
      action: onOpenProfile,
    },
    'Learning plan': {
      icon: <BookOpen size={24} />,
      title: 'A sequenced roadmap for growth.',
      desc: 'SkillGap AI prioritizes prerequisites before advanced skills, ensuring each project builds a portfolio-ready artifact.',
      buttonText: 'Refine learning goals',
      action: onOpenProfile,
    },
  }[active] || {
    icon: <Compass size={24} />,
    title: 'Make this view your next focus.',
    desc: 'Your profile intelligence will become more useful as you complete the assessment and add evidence from projects, certifications, and experience.',
    buttonText: 'Continue profile',
    action: onOpenProfile,
  }

  return (
    <section className="empty-section">
      <div className="empty-icon">{meta.icon}</div>
      <p className="eyebrow">{active}</p>
      <h1>{meta.title}</h1>
      <p>{meta.desc}</p>
      <button className="primary-button" onClick={meta.action}>
        {meta.buttonText} <ArrowUpRight size={16} />
      </button>
    </section>
  )
}
