import express from 'express'
import cors from 'cors'
import { uploadsDir } from './config.js'
import adminRoutes from './routes/adminRoutes.js'
import aiRoutes from './routes/aiRoutes.js'
import authRoutes from './routes/authRoutes.js'
import blogCategoriesRoutes from './routes/blogCategoriesRoutes.js'
import blogsRoutes from './routes/blogsRoutes.js'
import groupsRoutes from './routes/groupsRoutes.js'
import notificationsRoutes from './routes/notificationsRoutes.js'
import projectsRoutes from './routes/projectsRoutes.js'
import usersRoutes from './routes/usersRoutes.js'

export const createApp = () => {
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '50mb' }))
  app.use('/uploads', express.static(uploadsDir))

  app.get('/api/health', async (_request, response) => {
    response.json({ ok: true, service: 'qsphere-api' })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/users', usersRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/api/blog-categories', blogCategoriesRoutes)
  app.use('/api/blogs', blogsRoutes)
  app.use('/api/notifications', notificationsRoutes)
  app.use('/api/ai', aiRoutes)
  app.use('/api', groupsRoutes)
  app.use('/api', projectsRoutes)

  app.use((error, _request, response, _next) => {
    console.error(error)
    response.status(error.status || 500).json({ error: error.message || 'Internal server error' })
  })

  return app
}
