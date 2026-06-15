import { authenticateUser, getUserByEmail } from '../../../server/usersService.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const user = await authenticateUser(request.body ?? {})
    const latest = await getUserByEmail(user.email)
    response.status(200).json({ user: latest ?? user })
  } catch (error) {
    response.status(error.status || 500).json({ error: error.message || 'Failed to authenticate user' })
  }
}
