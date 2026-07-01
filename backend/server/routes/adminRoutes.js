import { Router } from 'express'
import { getUser, listBlogReports, listUsers, reviewBlogReport, summary, updateUser, getSettings, saveSettings, saveFontTemplate, removeFontTemplate } from '../controllers/adminController.js'

const router = Router()

router.get('/summary', summary)
router.get('/blog-reports', listBlogReports)
router.put('/blog-reports/:id', reviewBlogReport)
router.get('/users', listUsers)
router.get('/users/:id', getUser)
router.put('/users/:id', updateUser)
router.get('/font-settings', getSettings)
router.put('/font-settings', saveSettings)
router.post('/font-settings/templates', saveFontTemplate)
router.delete('/font-settings/templates/:id', removeFontTemplate)

export default router
