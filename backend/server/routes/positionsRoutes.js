import { Router } from 'express'
import {
  create,
  decideApplication,
  getApplicationConflicts,
  getApplication,
  getManaged,
  getPosition,
  getPositions,
  upsertApplication,
} from '../controllers/positionsController.js'
import { upload } from '../middleware/upload.js'

const router = Router()

router.get('/owner/:email/manage', getManaged)
router.get('/:id/application-conflicts', getApplicationConflicts)
router.get('/:id/application', getApplication)
router.post('/:id/applications/:applicationId/decision', decideApplication)
router.post('/:id/applications', upload.single('resumeFile'), upsertApplication)
router.get('/', getPositions)
router.get('/:id', getPosition)
router.post('/', create)

export default router
