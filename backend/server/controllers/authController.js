import { authCookieName, verifyCookieName } from '../config.js'
import { clearCookie, getAuthEmail, getVerificationEmail, setSignedCookie } from '../middleware/auth.js'
import { asyncHandler } from '../utils/errors.js'
import {
  completeAdminSetup,
  loginUser,
  registerUser,
  resendOtp,
  resetPassword,
  startForgotPassword,
  verifyOtpAndApply,
} from '../services/authService.js'
import { getUserByEmail, sanitizeUser } from '../services/usersService.js'

export const register = asyncHandler(async (request, response) => {
  const result = await registerUser(request.body ?? {})
  setSignedCookie(response, verifyCookieName, result.emailAddress, 60 * 60)

  response.status(result.pendingRegistration ? 409 : 201).json({
    success: true,
    pendingRegistration: result.pendingRegistration,
    message: result.pendingRegistration
      ? 'You already have a pending verification. A new OTP has been sent to your email.'
      : 'OTP sent to your email.',
    emailAddress: result.emailAddress,
  })
})

export const verifyOtp = asyncHandler(async (request, response) => {
  const result = await verifyOtpAndApply(request.body ?? {})
  setSignedCookie(response, verifyCookieName, result.emailAddress, 60 * 60)

  if (result.adminFirstLogin) {
    clearCookie(response, authCookieName)
  }

  response.json(result)
})

export const resendOtpCode = asyncHandler(async (request, response) => {
  const result = await resendOtp(request.body ?? {})
  setSignedCookie(response, verifyCookieName, result.emailAddress, 60 * 60)
  response.json(result)
})

export const completeAdminFirstLogin = asyncHandler(async (request, response) => {
  const user = await completeAdminSetup({
    ...request.body,
    verificationEmail: getVerificationEmail(request),
  })

  clearCookie(response, verifyCookieName)
  setSignedCookie(response, authCookieName, user.emailAddress, 60 * 60 * 24 * 7)
  response.json({
    success: true,
    message: 'Administrator setup completed successfully.',
    user,
  })
})

export const forgotPassword = asyncHandler(async (request, response) => {
  response.json(await startForgotPassword(request.body ?? {}))
})

export const resetUserPassword = asyncHandler(async (request, response) => {
  const result = await resetPassword(request.body ?? {})
  clearCookie(response, authCookieName)
  clearCookie(response, verifyCookieName)
  response.json(result)
})

export const login = asyncHandler(async (request, response) => {
  const result = await loginUser(request.body ?? {})

  clearCookie(response, authCookieName)

  if (result.type === 'needsVerification' || result.type === 'adminOtp') {
    setSignedCookie(response, verifyCookieName, result.payload.emailAddress, 60 * 60)
    return response.status(result.status).json(result.payload)
  }

  if (result.type === 'adminPasswordChange') {
    setSignedCookie(response, verifyCookieName, result.payload.emailAddress, 60 * 60)
    return response.status(result.status).json(result.payload)
  }

  if (result.payload.needsVerificationCookie) {
    setSignedCookie(response, verifyCookieName, result.payload.emailAddress, 60 * 60)
  } else {
    clearCookie(response, verifyCookieName)
  }

  setSignedCookie(response, authCookieName, result.payload.emailAddress, 60 * 60 * 24 * 7)
  response.json({
    success: true,
    user: result.payload.user,
  })
})

export const getVerificationTarget = asyncHandler(async (request, response) => {
  const emailAddress = getVerificationEmail(request)
  if (!emailAddress) {
    response.status(404).json({ error: 'No verification target found' })
    return
  }

  response.json({ emailAddress })
})

export const getCurrentUser = asyncHandler(async (request, response) => {
  const emailAddress = getAuthEmail(request)
  if (!emailAddress) {
    response.status(401).json({ error: 'Not authenticated' })
    return
  }

  const user = await getUserByEmail(emailAddress)
  if (!user) {
    clearCookie(response, authCookieName)
    response.status(401).json({ error: 'Session expired' })
    return
  }

  if (user.isActive === false) {
    clearCookie(response, authCookieName)
    response.status(403).json({ error: 'This account has been suspended' })
    return
  }

  if (String(user.role || '').toLowerCase() === 'admin' && (user.mustChangePassword === true || user.isVerified !== true)) {
    clearCookie(response, authCookieName)
    response.status(403).json({ error: 'Administrator security setup is incomplete' })
    return
  }

  response.json({ success: true, user: sanitizeUser(user) })
})

export const logout = asyncHandler(async (_request, response) => {
  clearCookie(response, authCookieName)
  clearCookie(response, verifyCookieName)
  response.json({ success: true })
})
