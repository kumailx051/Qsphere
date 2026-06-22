import { authCookieName, verifyCookieName } from '../config.js'
import { clearCookie, getAuthEmail, getVerificationEmail, setSignedCookie } from '../middleware/auth.js'
import { asyncHandler } from '../utils/errors.js'
import { getProfileByEmail, submitOnboarding, updatePassword, updateProfile } from '../services/usersService.js'

export const onboarding = asyncHandler(async (request, response) => {
  const user = await submitOnboarding({
    sessionEmail: getAuthEmail(request) || getVerificationEmail(request),
    payload: request.body ?? {},
  })

  clearCookie(response, verifyCookieName)
  setSignedCookie(response, authCookieName, user.emailAddress, 60 * 60 * 24 * 7)
  response.json({ success: true, user })
})

export const getProfile = asyncHandler(async (request, response) => {
  response.json(await getProfileByEmail(request.params.email))
})

export const saveProfile = asyncHandler(async (request, response) => {
  response.json(await updateProfile(request.body ?? {}))
})

export const savePassword = asyncHandler(async (request, response) => {
  response.json(await updatePassword(request.body ?? {}))
})
