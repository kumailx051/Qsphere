import { getUserByEmail } from '../../../server/usersService.js'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const email = request.query.email || request.body?.email
    if (!email) {
      response.status(400).json({ error: 'email is required' })
      return
    }

    const user = await getUserByEmail(email)
    if (!user) {
      response.status(404).json({ error: 'User not found' })
      return
    }

    response.status(200).json({ user })
  } catch (error) {
    response.status(500).json({ error: 'Failed to load user' })
  }
}