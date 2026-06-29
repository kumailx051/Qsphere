import { Router } from 'express'
import {
  createForGroup,
  createTask,
  deleteChat,
  discussionActivity,
  discussionPresence,
  discussionTyping,
  discussionUnread,
  editChat,
  getChat,
  getDocuments,
  getOne,
  getSubmissions,
  listForGroup,
  listTasks,
  postChat,
  readChat,
  reactToChat,
  remove,
  removeTask,
  reviewSubmission,
  submitTask,
  updateTask,
  updateOne,
} from '../controllers/projectsController.js'
import { upload } from '../middleware/upload.js'

const router = Router()

router.get('/groups/:groupId/projects', listForGroup)
router.post('/groups/:groupId/projects', upload.single('referenceFile'), createForGroup)
router.get('/projects/:id', getOne)
router.put('/projects/:id', updateOne)
router.delete('/projects/:id', remove)
router.get('/projects/:projectId/tasks', listTasks)
router.post('/projects/:projectId/tasks', upload.single('referenceFile'), createTask)
router.put('/tasks/:id', updateTask)
router.delete('/tasks/:id', removeTask)
router.post('/tasks/:taskId/submit', upload.single('submissionFile'), submitTask)
router.get('/tasks/:taskId/submissions', getSubmissions)
router.put('/submissions/:id/review', reviewSubmission)
router.get('/projects/:projectId/discussion/activity', discussionActivity)
router.get('/projects/:projectId/discussion/unread', discussionUnread)
router.post('/projects/:projectId/discussion/presence', discussionPresence)
router.post('/projects/:projectId/discussion/typing', discussionTyping)
router.get('/projects/:projectId/chat', getChat)
router.post('/projects/:projectId/chat', upload.single('attachment'), postChat)
router.post('/projects/:projectId/chat/read', readChat)
router.post('/projects/:projectId/chat/:messageId/reactions', reactToChat)
router.put('/projects/:projectId/chat/:messageId', editChat)
router.delete('/projects/:projectId/chat/:messageId', deleteChat)
router.get('/projects/:projectId/documents', getDocuments)

export default router
