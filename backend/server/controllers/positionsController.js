import { asyncHandler } from '../utils/errors.js'
import {
  createPosition,
  decidePositionApplication,
  getPositionApplicationConflicts,
  getPositionApplicationForUser,
  getPositionById,
  listManagedPositions,
  listPositions,
  upsertPositionApplication,
} from '../services/positionsService.js'

export const getPositions = asyncHandler(async (_request, response) => {
  response.json(await listPositions())
})

export const getPosition = asyncHandler(async (request, response) => {
  response.json(await getPositionById(request.params.id))
})

export const create = asyncHandler(async (request, response) => {
  response.status(201).json(await createPosition(request.body ?? {}))
})

export const getApplication = asyncHandler(async (request, response) => {
  response.json(await getPositionApplicationForUser(request.params.id, request.query.email))
})

export const getApplicationConflicts = asyncHandler(async (request, response) => {
  response.json(await getPositionApplicationConflicts(request.params.id, request.query))
})

export const upsertApplication = asyncHandler(async (request, response) => {
  response
    .status(201)
    .json(await upsertPositionApplication(request.params.id, request.body ?? {}, request.file ?? null))
})

export const decideApplication = asyncHandler(async (request, response) => {
  response.status(200).json(
    await decidePositionApplication(
      request.params.id,
      request.params.applicationId,
      request.body ?? {},
    ),
  )
})

export const getManaged = asyncHandler(async (request, response) => {
  response.json(await listManagedPositions(request.params.email))
})
