import { Router } from 'express'
import {
  completeAdminFirstLogin,
  forgotPassword,
  getCurrentUser,
  getVerificationTarget,
  login,
  logout,
  register,
  resendOtpCode,
  resetUserPassword,
  verifyOtp,
} from '../controllers/authController.js'

const router = Router()

router.post('/register', register)
router.post('/verify-otp', verifyOtp)
router.post('/resend-otp', resendOtpCode)
router.post('/complete-admin-setup', completeAdminFirstLogin)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetUserPassword)
router.post('/login', login)
router.get('/verification-target', getVerificationTarget)
router.get('/me', getCurrentUser)
router.post('/logout', logout)

export default router
