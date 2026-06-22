import { asyncHandler } from '../utils/errors.js'
import {
  autocompleteText,
  chatWithAssistant,
  generateBlogContent,
  generateBlogExcerpt,
  generateGroupDescription,
  generateTopic,
  modifyText,
  optimizeGroupTitle,
  suggestProjectDescription,
  suggestTitles,
} from '../services/aiService.js'

export const topic = asyncHandler(async (request, response) => {
  response.json(await generateTopic(request.body ?? {}))
})

export const groupTitle = asyncHandler(async (request, response) => {
  response.json(await optimizeGroupTitle(request.body ?? {}))
})

export const groupDescription = asyncHandler(async (request, response) => {
  response.json(await generateGroupDescription(request.body ?? {}))
})

export const blogExcerpt = asyncHandler(async (request, response) => {
  response.json(await generateBlogExcerpt(request.body ?? {}))
})

export const blogContent = asyncHandler(async (request, response) => {
  response.json(await generateBlogContent(request.body ?? {}))
})

export const projectDescription = asyncHandler(async (request, response) => {
  response.json(await suggestProjectDescription(request.body ?? {}))
})

export const titles = asyncHandler(async (request, response) => {
  response.json(await suggestTitles(request.body ?? {}))
})

export const text = asyncHandler(async (request, response) => {
  response.json(await modifyText(request.body ?? {}))
})

export const autocomplete = asyncHandler(async (request, response) => {
  response.json(await autocompleteText(request.body ?? {}))
})

export const chat = asyncHandler(async (request, response) => {
  response.json(await chatWithAssistant(request.body ?? {}))
})
