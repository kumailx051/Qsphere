import { Router } from 'express'
import {
  getThreads,
  getCommunities,
  createCommunity,
  getThreadById,
  streamThread,
  create,
  update,
  remove,
  vote,
  addReply,
  editReply,
  removeReply,
  voteOnReply,
  acceptAnswer,
} from '../controllers/threadsController.js'

const router = Router()

router.get('/communities', getCommunities)
router.post('/communities', createCommunity)
router.get('/', getThreads)
router.get('/:id/stream', streamThread)
router.get('/:id', getThreadById)
router.post('/', create)
router.put('/:id', update)
router.delete('/:id', remove)
router.post('/:id/vote', vote)

router.post('/:threadId/replies', addReply)
router.put('/:threadId/replies/:replyId', editReply)
router.delete('/:threadId/replies/:replyId', removeReply)
router.post('/:threadId/replies/:replyId/vote', voteOnReply)
router.post('/:threadId/replies/:replyId/accept', acceptAnswer)

export default router
