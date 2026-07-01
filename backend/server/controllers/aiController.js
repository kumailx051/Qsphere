import { getAuthenticatedUser } from '../middleware/auth.js'
import { asyncHandler, createHttpError } from '../utils/errors.js'
import {
  autocompleteText,
  chatWithAssistant,
  connectAiProvider,
  disconnectAiProvider,
  generateBlogContent,
  generateBlogExcerpt,
  generateGroupDescription,
  generateTopic,
  getAiProviderStatus,
  modifyText,
  optimizeGroupTitle,
  suggestProjectDescription,
  suggestTitles,
} from '../services/aiService.js'

const requireAiUser = async (request, response) => {
  const user = await getAuthenticatedUser(request)

  if (!user) {
    throw createHttpError(401, 'Not authenticated')
  }

  if (user.isActive === false) {
    response.status(403).json({ error: 'This account is suspended' })
    return null
  }

  return user
}

export const providerStatus = asyncHandler(async (request, response) => {
  const user = await requireAiUser(request, response)
  if (!user) return
  response.json(await getAiProviderStatus(user))
})

export const providerConnect = asyncHandler(async (request, response) => {
  const user = await requireAiUser(request, response)
  if (!user) return
  response.json(await connectAiProvider(user, request.body ?? {}))
})

export const providerDisconnect = asyncHandler(async (request, response) => {
  const user = await requireAiUser(request, response)
  if (!user) return
  response.json(await disconnectAiProvider(user, request.params.provider))
})

export const topic = asyncHandler(async (request, response) => {
  const user = await requireAiUser(request, response)
  if (!user) return
  response.json(await generateTopic(user, request.body ?? {}))
})

export const groupTitle = asyncHandler(async (request, response) => {
  const user = await requireAiUser(request, response)
  if (!user) return
  response.json(await optimizeGroupTitle(user, request.body ?? {}))
})

export const groupDescription = asyncHandler(async (request, response) => {
  const user = await requireAiUser(request, response)
  if (!user) return
  response.json(await generateGroupDescription(user, request.body ?? {}))
})

export const blogExcerpt = asyncHandler(async (request, response) => {
  const user = await requireAiUser(request, response)
  if (!user) return
  response.json(await generateBlogExcerpt(user, request.body ?? {}))
})

export const blogContent = asyncHandler(async (request, response) => {
  const user = await requireAiUser(request, response)
  if (!user) return
  response.json(await generateBlogContent(user, request.body ?? {}))
})

export const projectDescription = asyncHandler(async (request, response) => {
  const user = await requireAiUser(request, response)
  if (!user) return
  response.json(await suggestProjectDescription(user, request.body ?? {}))
})

export const titles = asyncHandler(async (request, response) => {
  const user = await requireAiUser(request, response)
  if (!user) return
  response.json(await suggestTitles(user, request.body ?? {}))
})

export const text = asyncHandler(async (request, response) => {
  const user = await requireAiUser(request, response)
  if (!user) return
  response.json(await modifyText(user, request.body ?? {}))
})

export const autocomplete = asyncHandler(async (request, response) => {
  const user = await requireAiUser(request, response)
  if (!user) return
  response.json(await autocompleteText(user, request.body ?? {}))
})

export const chat = asyncHandler(async (request, response) => {
  const user = await requireAiUser(request, response)
  if (!user) return
  response.json(await chatWithAssistant(user, request.body ?? {}))
})
