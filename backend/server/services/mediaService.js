import { createHttpError } from '../utils/errors.js'

export const uploadImageToImgBB = async (base64DataUrl) => {
  const apiKey = process.env.IMGBB_API_KEY
  if (!apiKey) {
    throw createHttpError(500, 'ImgBB API key is not configured in environment variables.')
  }

  const base64Data = String(base64DataUrl || '').replace(/^data:image\/\w+;base64,/, '')
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
