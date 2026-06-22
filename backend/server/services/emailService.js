import { createHttpError } from '../utils/errors.js'

export const sendOtpEmail = async (emailAddress, otp) => {
  const serviceId = process.env.EMAILJS_SERVICE_ID
  const templateId = process.env.EMAILJS_TEMPLATE_ID
  const publicKey = process.env.EMAILJS_PUBLIC_KEY
  const privateKey = process.env.EMAILJS_PRIVATE_KEY

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    throw createHttpError(500, 'EmailJS credentials are not configured in environment variables.')
  }

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: {
        to_email: emailAddress,
        email: emailAddress,
        otp,
        code: otp,
      },
    }),
  })

  if (!response.ok) {
    throw createHttpError(500, `EmailJS API request failed: ${await response.text()}`)
  }
}
