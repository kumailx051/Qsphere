import { Router } from 'express'
import {
  autocomplete,
  blogContent,
  blogExcerpt,
  chat,
  groupDescription,
  groupTitle,
  providerConnect,
  providerDisconnect,
  providerStatus,
  projectDescription,
  text,
  titles,
  topic,
} from '../controllers/aiController.js'

const router = Router()

router.get('/providers/status', providerStatus)
router.post('/providers/connect', providerConnect)
router.delete('/providers/:provider', providerDisconnect)
router.post('/generate-topic', topic)
router.post('/optimize-group-title', groupTitle)
router.post('/generate-group-description', groupDescription)
router.post('/generate-blog-excerpt', blogExcerpt)
router.post('/generate-blog-content', blogContent)
router.post('/suggest-project-description', projectDescription)
router.post('/suggest-titles', titles)
router.post('/modify-text', text)
router.post('/autocomplete', autocomplete)
router.post('/chat', chat)

export default router
