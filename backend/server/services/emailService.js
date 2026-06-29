import { createHttpError } from '../utils/errors.js'

const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send'

const getEmailJsConfig = () => {
  const serviceId = String(process.env.EMAILJS_SERVICE_ID || '').trim()
  const publicKey = String(
    process.env.EMAILJS_PUBLIC_KEY || process.env.EMAILJS_USER_ID || '',
  ).trim()
  const privateKey = String(process.env.EMAILJS_PRIVATE_KEY || '').trim()

  if (!serviceId) {
    throw createHttpError(500, 'EmailJS service id is not configured in environment variables.')
  }

  if (!publicKey) {
    throw createHttpError(500, 'EmailJS public key is not configured in environment variables.')
  }

  return { serviceId, publicKey, privateKey }
}

const getBrandConfig = () => ({
  companyName: String(process.env.COMPANY_NAME || 'QSphere').trim() || 'QSphere',
  websiteLink:
    String(process.env.APP_PUBLIC_URL || 'http://localhost:5173').trim() ||
    'http://localhost:5173',
  supportEmail: String(process.env.EMAILJS_REPLY_TO || '').trim(),
  senderName:
    String(process.env.EMAILJS_FROM_NAME || process.env.COMPANY_NAME || 'QSphere').trim() ||
    'QSphere',
  logoUrl: String(process.env.EMAILJS_LOGO_URL || '').trim(),
})

const getTemplateId = (kind) => {
  const directTemplateId =
    kind === 'otp'
      ? String(process.env.EMAILJS_OTP_TEMPLATE_ID || '').trim()
      : String(process.env.EMAILJS_POSITION_DECISION_TEMPLATE_ID || '').trim()

  const fallbackTemplateId = String(process.env.EMAILJS_TEMPLATE_ID || '').trim()
  const templateId = directTemplateId || fallbackTemplateId

  if (!templateId) {
    throw createHttpError(500, 'EmailJS template id is not configured in environment variables.')
  }

  return templateId
}

const normalizeTemplateParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (value === undefined || value === null) return [key, '']
      if (typeof value === 'number') return [key, String(value)]
      if (typeof value === 'boolean') return [key, value ? 'true' : 'false']
      if (Array.isArray(value)) return [key, value.join(', ')]
      if (typeof value === 'object') return [key, JSON.stringify(value)]
      return [key, String(value)]
    }),
  )

const sendEmailJsTemplate = async ({ to, templateId, templateParams = {} }) => {
  if (!to) throw createHttpError(400, 'Recipient email is required')

  const { serviceId, publicKey, privateKey } = getEmailJsConfig()

  const response = await fetch(EMAILJS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      ...(privateKey ? { accessToken: privateKey } : {}),
      template_params: normalizeTemplateParams({
        to_email: to,
        email: to,
        ...templateParams,
      }),
    }),
  })

  const responseText = await response.text()
  if (!response.ok) {
    throw createHttpError(
      response.status >= 500 ? 500 : 400,
      responseText || 'EmailJS failed to send the email.',
    )
  }

  return responseText
}

export const sendOtpEmail = async (emailAddress, otp, options = {}) => {
  const purpose = String(options.purpose || 'verification').trim().toLowerCase()
  const brand = getBrandConfig()

  const subject =
    purpose === 'reset-password'
      ? `${brand.companyName} password reset code`
      : purpose === 'admin-setup'
        ? `${brand.companyName} administrator setup code`
        : `${brand.companyName} verification code`

  await sendEmailJsTemplate({
    to: emailAddress,
    templateId: getTemplateId('otp'),
    templateParams: {
      otp,
      code: otp,
      verification_code: otp,
      email_address: emailAddress,
      purpose,
      company_name: brand.companyName,
      website_link: brand.websiteLink,
      support_email: brand.supportEmail,
      reply_to: brand.supportEmail,
      sender_name: brand.senderName,
      from_name: brand.senderName,
      logo_url: brand.logoUrl,
      expires_minutes: '10',
      email_subject: subject,
    },
  })
}

export const sendPositionDecisionEmail = async (emailAddress, params = {}) => {
  const brand = getBrandConfig()

  await sendEmailJsTemplate({
    to: emailAddress,
    templateId: getTemplateId('position-decision'),
    templateParams: {
      company_name: brand.companyName,
      website_link: brand.websiteLink,
      support_email: brand.supportEmail,
      reply_to: brand.supportEmail,
      sender_name: brand.senderName,
      from_name: brand.senderName,
      logo_url: brand.logoUrl,
      ...params,
    },
  })
}
