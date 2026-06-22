import { asyncHandler } from '../utils/errors.js'
import {
  createProject,
  createProjectTask,
  deleteProject,
  deleteProjectChatMessage,
  deleteProjectTask,
  editProjectChatMessage,
  getProjectById,
  listProjectChatMessages,
  listProjectDocuments,
  listProjectsByGroupId,
  listProjectTasks,
  listTaskSubmissions,
  markProjectChatRead,
  reviewTaskSubmission,
  sendProjectChatMessage,
  submitTaskWork,
  updateProjectTask,
} from '../services/projectsService.js'

export const listForGroup = asyncHandler(async (request, response) => {
  response.json(await listProjectsByGroupId(request.params.groupId))
})

export const getOne = asyncHandler(async (request, response) => {
  response.json(await getProjectById(request.params.id))
})

export const createForGroup = asyncHandler(async (request, response) => {
  response.status(201).json(await createProject(request.params.groupId, request.body ?? {}, request.file))
})

export const remove = asyncHandler(async (request, response) => {
  response.json(await deleteProject(request.params.id))
})

export const listTasks = asyncHandler(async (request, response) => {
  response.json(await listProjectTasks(request.params.projectId))
})

export const createTask = asyncHandler(async (request, response) => {
  response.status(201).json(await createProjectTask(request.params.projectId, request.body ?? {}, request.file))
})

export const updateTask = asyncHandler(async (request, response) => {
  response.json(await updateProjectTask(request.params.id, request.body ?? {}))
})

export const removeTask = asyncHandler(async (request, response) => {
  response.json(await deleteProjectTask(request.params.id))
})

export const submitTask = asyncHandler(async (request, response) => {
  response.status(201).json(await submitTaskWork(request.params.taskId, request.body ?? {}, request.file))
})

export const getSubmissions = asyncHandler(async (request, response) => {
  response.json(await listTaskSubmissions(request.params.taskId))
})

export const reviewSubmission = asyncHandler(async (request, response) => {
  response.json(await reviewTaskSubmission(request.params.id, request.body ?? {}))
})

export const getChat = asyncHandler(async (request, response) => {
  response.json(await listProjectChatMessages(request.params.projectId, request.query.userEmail))
})

export const postChat = asyncHandler(async (request, response) => {
  response.status(201).json(await sendProjectChatMessage(request.params.projectId, request.body ?? {}))
})

export const readChat = asyncHandler(async (request, response) => {
  response.json(await markProjectChatRead(request.params.projectId, request.body?.readerEmail))
})

export const editChat = asyncHandler(async (request, response) => {
  response.json(await editProjectChatMessage(request.params.projectId, request.params.messageId, request.body ?? {}))
})

export const deleteChat = asyncHandler(async (request, response) => {
  response.json(await deleteProjectChatMessage(request.params.projectId, request.params.messageId, request.body ?? {}))
})

export const getDocuments = asyncHandler(async (request, response) => {
  response.json(await listProjectDocuments(request.params.projectId))
})
