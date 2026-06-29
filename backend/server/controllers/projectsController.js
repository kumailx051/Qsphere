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
  getProjectChatUnreadCounts,
  listProjectDocuments,
  listProjectsByGroupId,
  listProjectTasks,
  listTaskSubmissions,
  markProjectChatRead,
  reviewTaskSubmission,
  sendProjectChatMessage,
  submitTaskWork,
  toggleProjectChatReaction,
  updateProject,
  updateProjectTask,
} from '../services/projectsService.js'
import {
  getProjectDiscussionActivity,
  recordProjectDiscussionPresence,
  setProjectDiscussionTyping,
} from '../services/projectDiscussionRealtimeService.js'

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

export const updateOne = asyncHandler(async (request, response) => {
  response.json(await updateProject(request.params.id, request.body ?? {}))
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
  response.json(
    await listProjectChatMessages(
      request.params.projectId,
      request.query.userEmail,
      request.query.conversationType,
      request.query.targetEmail,
    ),
  )
})

export const postChat = asyncHandler(async (request, response) => {
  response.status(201).json(await sendProjectChatMessage(request.params.projectId, request.body ?? {}, request.file))
})

export const readChat = asyncHandler(async (request, response) => {
  response.json(
    await markProjectChatRead(
      request.params.projectId,
      request.body?.readerEmail,
      request.body?.conversationType,
      request.body?.targetEmail,
    ),
  )
})

export const discussionActivity = asyncHandler(async (request, response) => {
  response.json(getProjectDiscussionActivity({
    projectId: request.params.projectId,
    viewerEmail: request.query.viewerEmail,
    conversationType: request.query.conversationType,
    targetEmail: request.query.targetEmail,
  }))
})

export const discussionUnread = asyncHandler(async (request, response) => {
  response.json(await getProjectChatUnreadCounts(request.params.projectId, request.query.userEmail))
})

export const discussionPresence = asyncHandler(async (request, response) => {
  response.json(recordProjectDiscussionPresence({
    projectId: request.params.projectId,
    userEmail: request.body?.userEmail,
  }))
})

export const discussionTyping = asyncHandler(async (request, response) => {
  response.json(setProjectDiscussionTyping({
    projectId: request.params.projectId,
    userEmail: request.body?.userEmail,
    conversationType: request.body?.conversationType,
    targetEmail: request.body?.targetEmail,
    isTyping: request.body?.isTyping === true,
  }))
})

export const editChat = asyncHandler(async (request, response) => {
  response.json(await editProjectChatMessage(request.params.projectId, request.params.messageId, request.body ?? {}))
})

export const deleteChat = asyncHandler(async (request, response) => {
  response.json(await deleteProjectChatMessage(request.params.projectId, request.params.messageId, request.body ?? {}))
})

export const reactToChat = asyncHandler(async (request, response) => {
  response.json(
    await toggleProjectChatReaction(
      request.params.projectId,
      request.params.messageId,
      request.body ?? {},
    ),
  )
})

export const getDocuments = asyncHandler(async (request, response) => {
  response.json(await listProjectDocuments(request.params.projectId))
})
