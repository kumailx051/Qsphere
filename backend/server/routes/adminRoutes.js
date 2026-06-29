import { Router } from 'express'
import { getUser, listBlogReports, listUsers, reviewBlogReport, summary, updateUser } from '../controllers/adminController.js'

const router = Router()

router.get('/summary', summary)
router.get('/blog-reports', listBlogReports)
router.put('/blog-reports/:id', reviewBlogReport)
router.get('/users', listUsers)
router.get('/users/:id', getUser)
router.put('/users/:id', updateUser)

export default router
