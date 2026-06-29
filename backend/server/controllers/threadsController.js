import { asyncHandler } from '../utils/errors.js'
import { getAuthEmail } from '../middleware/auth.js'
import { getProfileByEmail } from '../services/usersService.js'
import { publishThreadEvent, subscribeToThread } from '../realtime/threadEvents.js'
import {
  listThreads,
  listThreadCommunities,
  createThreadCommunity,
  getThread,
  createThread,
  updateThread,
  deleteThread,
  voteThread,
  createReply,
  updateReply,
  deleteReply,
  voteReply,
  acceptReply,
} from '../services/threadsService.js'

export const streamThread = (request, response) => {
  response.setHeader('Content-Type', 'text/event-stream')
  response.setHeader('Cache-Control', 'no-cache, no-transform')
  response.setHeader('Connection', 'keep-alive')
  response.setHeader('X-Accel-Buffering', 'no')
  response.flushHeaders?.()

  response.write(`data: ${JSON.stringify({ type: 'connected', threadId: request.params.id })}\n\n`)

  const unsubscribe = subscribeToThread(request.params.id, response)
  const heartbeat = setInterval(() => {
    response.write(': keep-alive\n\n')
  }, 25000)

  request.on('close', () => {
    clearInterval(heartbeat)
    unsubscribe()
  })
}

export const getThreads = asyncHandler(async (request, response) => {
  const userEmail = getAuthEmail(request)
  const { sort, tag, search, community } = request.query
  response.json(await listThreads({ sort, tag, search, community, userEmail }))
})

export const getCommunities = asyncHandler(async (_request, response) => {
  response.json(await listThreadCommunities())
})

export const createCommunity = asyncHandler(async (request, response) => {
  const userEmail = getAuthEmail(request)
  if (!userEmail) return response.status(401).json({ error: 'Authentication required.' })
  response.status(201).json(await createThreadCommunity({ ...request.body, createdByEmail: userEmail }))
})

export const getThreadById = asyncHandler(async (request, response) => {
  const userEmail = getAuthEmail(request)
  response.json(await getThread(request.params.id, userEmail))
})

export const create = asyncHandler(async (request, response) => {
  const userEmail = getAuthEmail(request)
  if (!userEmail) return response.status(401).json({ error: 'Authentication required.' })
  const profile = await getProfileByEmail(userEmail).catch(() => null)
  response.status(201).json(await createThread({
    ...request.body,
    authorEmail: userEmail,
    authorName: profile?.fullName || request.body?.authorName || '',
  }))
})

export const update = asyncHandler(async (request, response) => {
  const userEmail = getAuthEmail(request)
  if (!userEmail) return response.status(401).json({ error: 'Authentication required.' })
  response.json(await updateThread(request.params.id, { ...request.body, userEmail }))
})

export const remove = asyncHandler(async (request, response) => {
  const userEmail = getAuthEmail(request)
  if (!userEmail) return response.status(401).json({ error: 'Authentication required.' })
  response.json(await deleteThread(request.params.id, userEmail))
})

export const vote = asyncHandler(async (request, response) => {
  const userEmail = getAuthEmail(request)
  if (!userEmail) return response.status(401).json({ error: 'Authentication required.' })
  const { value } = request.body
  response.json(await voteThread(request.params.id, userEmail, Number(value)))
})

export const addReply = asyncHandler(async (request, response) => {
  const userEmail = getAuthEmail(request)
  if (!userEmail) return response.status(401).json({ error: 'Authentication required.' })
  const profile = await getProfileByEmail(userEmail).catch(() => null)
  const reply = await createReply(request.params.threadId, {
    ...request.body,
    authorEmail: userEmail,
    authorName: profile?.fullName || request.body?.authorName || '',
  })
  publishThreadEvent(request.params.threadId, { type: 'reply_created', replyId: reply.id })
  response.status(201).json(reply)
})

export const editReply = asyncHandler(async (request, response) => {
  const userEmail = getAuthEmail(request)
  if (!userEmail) return response.status(401).json({ error: 'Authentication required.' })
  const reply = await updateReply(request.params.replyId, { ...request.body, userEmail })
  publishThreadEvent(request.params.threadId, { type: 'reply_updated', replyId: reply.id })
  response.json(reply)
})

export const removeReply = asyncHandler(async (request, response) => {
  const userEmail = getAuthEmail(request)
  if (!userEmail) return response.status(401).json({ error: 'Authentication required.' })
  const result = await deleteReply(request.params.replyId, userEmail)
  publishThreadEvent(request.params.threadId, { type: 'reply_deleted', replyId: request.params.replyId })
  response.json(result)
})

export const voteOnReply = asyncHandler(async (request, response) => {
  const userEmail = getAuthEmail(request)
  if (!userEmail) return response.status(401).json({ error: 'Authentication required.' })
  const { value } = request.body
  const result = await voteReply(request.params.replyId, userEmail, Number(value))
  publishThreadEvent(request.params.threadId, { type: 'reply_voted', replyId: request.params.replyId })
  response.json(result)
})

export const acceptAnswer = asyncHandler(async (request, response) => {
  const userEmail = getAuthEmail(request)
  if (!userEmail) return response.status(401).json({ error: 'Authentication required.' })
  const result = await acceptReply(request.params.replyId, userEmail)
  publishThreadEvent(request.params.threadId, { type: 'reply_accepted', replyId: request.params.replyId })
  response.json(result)
})
