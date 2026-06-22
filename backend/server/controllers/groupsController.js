import { asyncHandler } from '../utils/errors.js'
import {
  createGroup,
  createGroupType,
  deleteGroup,
  deleteGroupMember,
  listGroupMembers,
  listGroups,
  listGroupsByOwnerEmail,
  listGroupTypes,
  requestGroupJoin,
  updateGroup,
  updateGroupMember,
} from '../services/groupsDomainService.js'

export const getTypes = asyncHandler(async (_request, response) => {
  response.json(await listGroupTypes())
})

export const createType = asyncHandler(async (request, response) => {
  response.status(201).json(await createGroupType(request.body ?? {}))
})

export const create = asyncHandler(async (request, response) => {
  response.status(201).json(await createGroup(request.body ?? {}))
})

export const list = asyncHandler(async (_request, response) => {
  response.json(await listGroups())
})

export const listMine = asyncHandler(async (request, response) => {
  response.json(await listGroupsByOwnerEmail(request.params.email))
})

export const update = asyncHandler(async (request, response) => {
  response.json(await updateGroup(request.params.id, request.body ?? {}))
})

export const remove = asyncHandler(async (request, response) => {
  response.json(await deleteGroup(request.params.id))
})

export const listMembers = asyncHandler(async (request, response) => {
  response.json(await listGroupMembers(request.params.id))
})

export const join = asyncHandler(async (request, response) => {
  response.status(201).json(await requestGroupJoin(request.params.id, request.body ?? {}))
})

export const updateMember = asyncHandler(async (request, response) => {
  response.json(await updateGroupMember(request.params.id, request.params.memberEmail, request.body ?? {}))
})

export const removeMember = asyncHandler(async (request, response) => {
  response.json(await deleteGroupMember(request.params.id, request.params.memberEmail))
})
