import { requireAdminAccess } from '../middleware/auth.js'
import { asyncHandler } from '../utils/errors.js'
import { getAdminSummary, getAdminUserById, listAdminUsers, updateAdminUser } from '../services/adminService.js'

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
