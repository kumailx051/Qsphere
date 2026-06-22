import crypto from 'crypto'

export const hashPassword = (password) => crypto.createHash('sha256').update(String(password || '')).digest('hex')
