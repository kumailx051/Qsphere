import { Router } from 'express'
import {
  create,
  createType,
  getTypes,
  join,
  list,
  listMembers,
  listMine,
  remove,
  removeMember,
  update,
  updateMember,
} from '../controllers/groupsController.js'

const router = Router()

router.get('/group-types', getTypes)
router.post('/group-types', createType)
router.post('/groups', create)
router.get('/groups', list)
router.get('/groups/my/:email', listMine)
router.put('/groups/:id', update)
router.delete('/groups/:id', remove)
router.get('/groups/:id/members', listMembers)
router.post('/groups/:id/members', join)
router.put('/groups/:id/members/:memberEmail', updateMember)
router.delete('/groups/:id/members/:memberEmail', removeMember)

export default router
