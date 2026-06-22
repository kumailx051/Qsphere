import { Router } from 'express'
import { list, readAll, readOne } from '../controllers/notificationsController.js'

const router = Router()

router.get('/:email', list)
router.patch('/:email/read-all', readAll)
router.patch('/:id/read', readOne)

export default router
