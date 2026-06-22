import { asyncHandler } from '../utils/errors.js'
import {
  listNotificationsByEmail,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService.js'

export const list = asyncHandler(async (request, response) => {
  response.json(await listNotificationsByEmail(request.params.email))
})

export const readAll = asyncHandler(async (request, response) => {
  response.json(await markAllNotificationsRead(request.params.email))
})

export const readOne = asyncHandler(async (request, response) => {
  response.json(await markNotificationRead(request.params.id))
})
