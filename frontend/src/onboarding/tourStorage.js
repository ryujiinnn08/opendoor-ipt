const PREFIX = 'opendoor-candidate-tour:v1:'
const memory = new Map()
export const freshTour = () => ({ version: 1, invitation: 'unseen', status: 'not_started', currentChapterId: 'intro', currentStepId: 'comfort', chapterStates: {}, showMascot: true, all: false })
export function readTour(id) {
  if (id == null) return freshTour()
  let value = memory.get(String(id))
  try { value = JSON.parse(localStorage.getItem(PREFIX + id)) ?? value } catch { /* private browsing */ }
  if (value?.version !== 1) return freshTour()
  return { ...freshTour(), ...value, chapterStates: { ...value.chapterStates }, status: value.status === 'in_progress' ? 'paused' : value.status }
}
export function saveTour(id, value) {
  if (id == null) return
  const safe = { ...value, updatedAt: new Date().toISOString() }
  memory.set(String(id), safe)
  try { localStorage.setItem(PREFIX + id, JSON.stringify(safe)) } catch { /* keep progress for this visit */ }
}
export function inviteCandidate(user) {
  if (user.role !== 'candidate' || user.id == null) return
  saveTour(user.id, { ...freshTour(), invitation: 'pending' })
}
