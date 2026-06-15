import { verifyUserOtp } from '../../../server/usersService.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const user = await verifyUserOtp(request.body ?? {})
    response.status(200).json({ user, otp: '123456' })
  } catch (error) {
    response.status(error.status || 500).json({ error: error.message || 'OTP verification failed' })
  }
}
