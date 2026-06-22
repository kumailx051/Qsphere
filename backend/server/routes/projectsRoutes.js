import { Router } from 'express'
import {
  createForGroup,
  createTask,
  deleteChat,
  editChat,
  getChat,
  getDocuments,
  getOne,
  getSubmissions,
  listForGroup,
  listTasks,
  postChat,
  readChat,
  remove,
  removeTask,
  reviewSubmission,
  submitTask,
  updateTask,
} from '../controllers/projectsController.js'
import { upload } from '../middleware/upload.js'

const router = Router()

router.get('/groups/:groupId/projects', listForGroup)
router.post('/groups/:groupId/projects', upload.single('referenceFile'), createForGroup)
router.get('/projects/:id', getOne)
router.delete('/projects/:id', remove)
router.get('/projects/:projectId/tasks', listTasks)
router.post('/projects/:projectId/tasks', upload.single('referenceFile'), createTask)
router.put('/tasks/:id', updateTask)
router.delete('/tasks/:id', removeTask)
router.post('/tasks/:taskId/submit', upload.single('submissionFile'), submitTask)
router.get('/tasks/:taskId/submissions', getSubmissions)
router.put('/submissions/:id/review', reviewSubmission)
router.get('/projects/:projectId/chat', getChat)
router.post('/projects/:projectId/chat', postChat)
router.post('/projects/:projectId/chat/read', readChat)
router.put('/projects/:projectId/chat/:messageId', editChat)
router.delete('/projects/:projectId/chat/:messageId', deleteChat)
router.get('/projects/:projectId/documents', getDocuments)

export default router
