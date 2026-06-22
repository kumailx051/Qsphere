import { Router } from 'express'
import { getUser, listUsers, summary, updateUser } from '../controllers/adminController.js'

const router = Router()

router.get('/summary', summary)
router.get('/users', listUsers)
router.get('/users/:id', getUser)
router.put('/users/:id', updateUser)

export default router
