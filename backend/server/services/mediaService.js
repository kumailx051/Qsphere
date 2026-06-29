import fs from 'fs/promises'
import { createHttpError } from '../utils/errors.js'

const uploadBase64ImageToImgBB = async (base64Data) => {
  const apiKey = process.env.IMGBB_API_KEY
  if (!apiKey) {
    throw createHttpError(500, 'ImgBB API key is not configured in environment variables.')
  }

  const params = new URLSearchParams()
  params.append('image', base64Data)

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: params,
  })

  if (!response.ok) {
    throw createHttpError(500, `ImgBB upload request failed: ${await response.text()}`)
  }

  const result = await response.json()
  if (!result.success) {
    throw createHttpError(500, `ImgBB returned failure: ${result.error?.message || 'Unknown error'}`)
  }

  return result.data.url
}

export const uploadImageToImgBB = async (base64DataUrl) => {
  const base64Data = String(base64DataUrl || '').replace(/^data:image\/\w+;base64,/, '')
  return uploadBase64ImageToImgBB(base64Data)
}

export const uploadImageFileToImgBB = async (filePath) => {
  const fileBuffer = await fs.readFile(filePath)
  return uploadBase64ImageToImgBB(fileBuffer.toString('base64'))
}
