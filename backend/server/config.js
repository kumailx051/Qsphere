import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

export const port = Number(process.env.PORT || 3001)
export const sessionSecret = process.env.SESSION_SECRET || 'qsphere-dev-session-secret'
export const authCookieName = 'qsphere_auth'
export const verifyCookieName = 'qsphere_verify_email'
export const isProduction = process.env.NODE_ENV === 'production'
export const openRouterModel = 'openai/gpt-oss-120b:free'
export const openCodeModel = 'DeepSeek V4 Flash Free'
export const openRouterEndpoint = 'https://openrouter.ai/api/v1/chat/completions'
export const openCodeEndpoint = 'https://api.opencode.ai/v1/chat/completions'

const currentDir = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1')
export const uploadsDir = path.join(currentDir, '..', '..', 'uploads')
