import { asyncHandler } from '../utils/errors.js'
import {
  createEvent,
  getEventById,
  getEventRegistrationConflicts,
  getEventRegistrationForUser,
  listEvents,
  listManagedEvents,
  upsertEventRegistration,
} from '../services/eventsService.js'

export const getEvents = asyncHandler(async (_request, response) => {
  response.json(await listEvents())
})

export const getEvent = asyncHandler(async (request, response) => {
  response.json(await getEventById(request.params.id))
})

export const create = asyncHandler(async (request, response) => {
  response.status(201).json(await createEvent(request.body ?? {}))
})

export const getRegistration = asyncHandler(async (request, response) => {
  response.json(await getEventRegistrationForUser(request.params.id, request.query.email))
})

export const getRegistrationConflicts = asyncHandler(async (request, response) => {
  response.json(await getEventRegistrationConflicts(request.params.id, request.query))
})

export const upsertRegistration = asyncHandler(async (request, response) => {
  response.status(201).json(await upsertEventRegistration(request.params.id, request.body ?? {}))
})

export const getManaged = asyncHandler(async (request, response) => {
  response.json(await listManagedEvents(request.params.email))
})
