import { requireAdminAccess } from '../middleware/auth.js'
import { asyncHandler } from '../utils/errors.js'
import {
  getAdminSummary,
  getAdminUserById,
  listAdminBlogReports,
  listAdminUsers,
  reviewAdminBlogReport,
  updateAdminUser,
} from '../services/adminService.js'
import { createFontTemplate, deleteFontTemplate, getFontSettings, upsertFontSettings } from '../services/fontSettingsService.js'

export const summary = asyncHandler(async (request, response) => {
  const admin = await requireAdminAccess(request, response)
  if (!admin) return
  response.json(await getAdminSummary())
})

export const listUsers = asyncHandler(async (request, response) => {
  const admin = await requireAdminAccess(request, response)
  if (!admin) return
  response.json(await listAdminUsers(request.query ?? {}))
})

export const getUser = asyncHandler(async (request, response) => {
  const admin = await requireAdminAccess(request, response)
  if (!admin) return
  response.json(await getAdminUserById(request.params.id))
})

export const updateUser = asyncHandler(async (request, response) => {
  const admin = await requireAdminAccess(request, response)
  if (!admin) return
  response.json(await updateAdminUser(request.params.id, request.body ?? {}, admin))
})

export const listBlogReports = asyncHandler(async (request, response) => {
  const admin = await requireAdminAccess(request, response)
  if (!admin) return
  response.json(await listAdminBlogReports(request.query ?? {}))
})

export const reviewBlogReport = asyncHandler(async (request, response) => {
  const admin = await requireAdminAccess(request, response)
  if (!admin) return
  response.json(await reviewAdminBlogReport(request.params.id, request.body ?? {}, admin))
})

export const getSettings = asyncHandler(async (request, response) => {
  response.json(await getFontSettings())
})

export const saveSettings = asyncHandler(async (request, response) => {
  const admin = await requireAdminAccess(request, response)
  if (!admin) return
  const { fontFamily, sizeScales } = request.body ?? {}
  response.json(await upsertFontSettings(fontFamily, sizeScales, admin.emailAddress))
})

export const saveFontTemplate = asyncHandler(async (request, response) => {
  const admin = await requireAdminAccess(request, response)
  if (!admin) return
  const { name, fontFamily, sizeScales } = request.body ?? {}
  response.status(201).json(await createFontTemplate(name, fontFamily, sizeScales, admin.emailAddress))
})

export const removeFontTemplate = asyncHandler(async (request, response) => {
  const admin = await requireAdminAccess(request, response)
  if (!admin) return
  response.json(await deleteFontTemplate(request.params.id))
})
