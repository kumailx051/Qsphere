import { createHttpError } from '../utils/errors.js'
import { normalizeEmail } from '../utils/strings.js'

const ONLINE_WINDOW_MS = 15000
const TYPING_WINDOW_MS = 7000

const presenceStore = new Map()
const typingStore = new Map()

const getProjectKey = (projectId) => String(Number(projectId) || '')

const getPresenceMap = (projectId) => {
  const key = getProjectKey(projectId)
  if (!presenceStore.has(key)) {
    presenceStore.set(key, new Map())
  }
  return presenceStore.get(key)
}

const getConversationKey = (projectId, conversationType = 'channel', viewerEmail = '', targetEmail = '') => {
  const normalizedType = String(conversationType || 'channel').toLowerCase() === 'direct' ? 'direct' : 'channel'
  const projectKey = getProjectKey(projectId)

  if (normalizedType === 'direct') {
    const participants = [normalizeEmail(viewerEmail), normalizeEmail(targetEmail)].filter(Boolean).sort()
    if (participants.length !== 2) {
      throw createHttpError(400, 'Direct message target is required')
    }
    return `${projectKey}:direct:${participants.join('|')}`
  }

  return `${projectKey}:channel`
}

const cleanupPresence = (projectId) => {
  const now = Date.now()
  const presenceMap = getPresenceMap(projectId)

  for (const [email, lastSeenAt] of presenceMap.entries()) {
    if (now - lastSeenAt > ONLINE_WINDOW_MS) {
      presenceMap.delete(email)
    }
  }

  return presenceMap
}

const cleanupTyping = (projectId, conversationType = 'channel', viewerEmail = '', targetEmail = '') => {
  const now = Date.now()
  const conversationKey = getConversationKey(projectId, conversationType, viewerEmail, targetEmail)
  const conversationTyping = typingStore.get(conversationKey) || new Map()

  for (const [email, expiresAt] of conversationTyping.entries()) {
    if (expiresAt <= now) {
      conversationTyping.delete(email)
    }
  }

  if (conversationTyping.size === 0) {
    typingStore.delete(conversationKey)
    return new Map()
  }

  typingStore.set(conversationKey, conversationTyping)
  return conversationTyping
}

export const recordProjectDiscussionPresence = ({ projectId, userEmail }) => {
  const normalizedUserEmail = normalizeEmail(userEmail)
  const normalizedProjectId = Number(projectId)

  if (!normalizedProjectId || !normalizedUserEmail) {
    throw createHttpError(400, 'Project and user email are required')
  }

  const presenceMap = cleanupPresence(normalizedProjectId)
  presenceMap.set(normalizedUserEmail, Date.now())

  return { success: true }
}

export const setProjectDiscussionTyping = ({ projectId, userEmail, conversationType, targetEmail, isTyping }) => {
  const normalizedUserEmail = normalizeEmail(userEmail)
  const normalizedProjectId = Number(projectId)

  if (!normalizedProjectId || !normalizedUserEmail) {
    throw createHttpError(400, 'Project and user email are required')
  }

  recordProjectDiscussionPresence({ projectId: normalizedProjectId, userEmail: normalizedUserEmail })

  const conversationKey = getConversationKey(normalizedProjectId, conversationType, normalizedUserEmail, targetEmail)
  const conversationTyping = typingStore.get(conversationKey) || new Map()

  if (isTyping) {
    conversationTyping.set(normalizedUserEmail, Date.now() + TYPING_WINDOW_MS)
    typingStore.set(conversationKey, conversationTyping)
  } else {
    conversationTyping.delete(normalizedUserEmail)
    if (conversationTyping.size === 0) {
      typingStore.delete(conversationKey)
    } else {
      typingStore.set(conversationKey, conversationTyping)
    }
  }

  return { success: true }
}

export const getProjectDiscussionActivity = ({ projectId, viewerEmail, conversationType, targetEmail }) => {
  const normalizedViewerEmail = normalizeEmail(viewerEmail)
  const normalizedProjectId = Number(projectId)

  if (!normalizedProjectId) {
    throw createHttpError(400, 'Project is required')
  }

  const presenceMap = cleanupPresence(normalizedProjectId)
  const conversationTyping = cleanupTyping(normalizedProjectId, conversationType, normalizedViewerEmail, targetEmail)

  return {
    onlineEmails: Array.from(presenceMap.keys()),
    typingEmails: Array.from(conversationTyping.keys()).filter((email) => email !== normalizedViewerEmail),
  }
}
