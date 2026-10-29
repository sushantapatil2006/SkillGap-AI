import { request } from './client'

export async function getCurrentAssessment() {
  return request('/assessments/current')
}

export async function listAttempts(offset = 0) {
  return request(`/assessments/attempts?offset=${offset}`)
}

export async function getAttempt(attemptId) {
  return request(`/assessments/attempts/${encodeURIComponent(attemptId)}`)
}

export async function createAttempt() {
  return request('/assessments/attempts', { method: 'POST' })
}

export async function saveAnswers(attemptId, answersArray) {
  const payload = {
    answers: answersArray.map((a) => ({
      question_id: String(a.question_id),
      value: a.value,
    })),
  }
  return request(`/assessments/attempts/${encodeURIComponent(attemptId)}/answers`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function completeAttempt(attemptId) {
  return request(`/assessments/attempts/${encodeURIComponent(attemptId)}/complete`, {
    method: 'POST',
  })
}
