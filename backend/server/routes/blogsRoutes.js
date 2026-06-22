import { Router } from 'express'
import {
  create,
  createComment,
  getBlog,
  getBlogs,
  getComments,
  getUserBlogs,
  remove,
  removeComment,
  update,
  updateComment,
} from '../controllers/blogsController.js'

const router = Router()

router.get('/', getBlogs)
router.get('/user/:email', getUserBlogs)
router.get('/:id/comments', getComments)
router.post('/:id/comments', createComment)
router.put('/:id/comments/:commentId', updateComment)
router.delete('/:id/comments/:commentId', removeComment)
router.get('/:id', getBlog)
router.post('/', create)
router.put('/:id', update)
router.delete('/:id', remove)

export default router
