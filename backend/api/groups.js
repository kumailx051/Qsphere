import { deleteGroup, listGroups, upsertGroup } from '../server/groupsService.js'

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      const groups = await listGroups()
      response.status(200).json(groups)
      return
    }

    if (request.method === 'POST') {
      const group = await upsertGroup(request.body)
      response.status(201).json(group)
      return
    }

    if (request.method === 'PUT') {
      const group = await upsertGroup(request.body)
      response.status(200).json(group)
      return
    }

    if (request.method === 'DELETE') {
      const groupId = request.query.id || request.body?.id
      await deleteGroup(groupId)
      response.status(204).end()
      return
    }

    response.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    response.status(500).json({ error: 'Group API failed' })
  }
}
