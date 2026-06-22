import { Router } from 'express'
import { getProfile, onboarding, savePassword, saveProfile } from '../controllers/usersController.js'

const router = Router()

router.post('/onboarding', onboarding)
router.get('/profile/:email', getProfile)
router.put('/profile', saveProfile)
router.put('/password', savePassword)

export default router
