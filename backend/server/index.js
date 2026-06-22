import { port } from './config.js'
import { runMigrations } from './migrations/index.js'
import { createApp } from './app.js'

const start = async () => {
  await runMigrations()

  const app = createApp()
  app.listen(port, () => {
    console.log(`QSphere API running on http://localhost:${port}`)
  })
}

start().catch((error) => {
  console.error('Unable to start API server:', error)
  process.exit(1)
})
