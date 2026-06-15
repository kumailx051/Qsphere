import { createUser } from '../../../server/usersService.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const user = await createUser(request.body ?? {})
    response.status(201).json({ user, otpCode: '123456' })
  } catch (error) {
    response.status(error.status || 500).json({ error: error.message || 'Registration failed' })
  }
}
