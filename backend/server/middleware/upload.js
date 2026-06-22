import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { uploadsDir } from '../config.js'

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, uploadsDir),
  filename: (_request, file, callback) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    callback(null, unique + path.extname(file.originalname))
  },
})

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
})
