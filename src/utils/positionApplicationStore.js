import { getStoredPositions } from './positionStore'
import { normalizeEmail } from './profileStore'

export const POSITION_APPLICATIONS_STORAGE_KEY = 'qsphere_position_applications'

const readApplications = () => {
  try {
    const raw = localStorage.getItem(POSITION_APPLICATIONS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeApplications = (applications) => {
  localStorage.setItem(POSITION_APPLICATIONS_STORAGE_KEY, JSON.stringify(applications))
}

const byNewest = (left, right) =>
  new Date(right.updatedAt || right.submittedAt || 0).getTime() -
  new Date(left.updatedAt || left.submittedAt || 0).getTime()

export const getStoredPositionApplications = () => readApplications().sort(byNewest)

export const getPositionApplicationsByPositionId = (positionId) =>
  getStoredPositionApplications().filter((application) => String(application.positionId) === String(positionId))

export const getPositionApplicationForApplicant = (positionId, email) =>
  getStoredPositionApplications().find(
    (application) =>
      String(application.positionId) === String(positionId) &&
      normalizeEmail(application.email) === normalizeEmail(email),
  ) || null

export const savePositionApplication = (applicationDraft) => {
  const applications = readApplications()
  const normalizedPositionId = String(applicationDraft.positionId)
  const normalizedApplicationEmail = normalizeEmail(applicationDraft.email)
  const existingIndex = applications.findIndex(
    (item) =>
      String(item.positionId) === normalizedPositionId &&
      normalizeEmail(item.email) === normalizedApplicationEmail,
  )

  const existingItem = existingIndex >= 0 ? applications[existingIndex] : null
  const nextApplication = {
    ...existingItem,
    ...applicationDraft,
    email: normalizedApplicationEmail,
    submittedAt: existingItem?.submittedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (existingIndex >= 0) {
    applications.splice(existingIndex, 1, nextApplication)
  } else {
    applications.unshift(nextApplication)
  }

  writeApplications(applications)
  return nextApplication
}

export const getManagedPositionsWithApplications = (ownerEmail) => {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail)
  const applications = readApplications()

  return getStoredPositions()
    .filter(
      (position) =>
        normalizeEmail(position.ownerEmail) === normalizedOwnerEmail ||
        normalizeEmail(position.contact) === normalizedOwnerEmail,
    )
    .map((position) => {
      const positionApplications = applications
        .filter((application) => String(application.positionId) === String(position.id))
        .sort(byNewest)

      return {
        ...position,
        applications: positionApplications,
        applicationCount: positionApplications.length,
      }
    })
    .sort((left, right) => {
      const leftTime = new Date(left.deadline || 0).getTime()
      const rightTime = new Date(right.deadline || 0).getTime()
      return leftTime - rightTime
    })
}

