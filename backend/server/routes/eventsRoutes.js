import { Router } from 'express'
import {
  create,
  getEvent,
  getEvents,
  getManaged,
  getRegistrationConflicts,
  getRegistration,
  upsertRegistration,
} from '../controllers/eventsController.js'

const router = Router()

router.get('/owner/:email/manage', getManaged)
router.get('/:id/registration-conflicts', getRegistrationConflicts)
router.get('/:id/registration', getRegistration)
router.post('/:id/registrations', upsertRegistration)
router.get('/', getEvents)
router.get('/:id', getEvent)
router.post('/', create)

export default router
