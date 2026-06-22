import crypto from 'crypto'
import pool from '../db.js'
import { authCookieName, isProduction, sessionSecret, verifyCookieName } from '../config.js'

const baseCookieOptions = ['Path=/', 'HttpOnly', 'SameSite=Lax']

if (isProduction) {
  baseCookieOptions.push('Secure')
}

const signCookieValue = (value) => {
  const payload = Buffer.from(String(value || ''), 'utf8').toString('base64url')
  const signature = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

const verifyCookieValue = (value) => {
  if (!value || !value.includes('.')) return null
  const [payload, signature] = value.split('.')
  const expected = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url')
  if (signature !== expected) return null

  try {
    return Buffer.from(payload, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

const parseCookies = (request) => {
  const header = request.headers.cookie || ''
  return header.split(';').reduce((cookies, pair) => {
    const [key, ...rest] = pair.trim().split('=')
    if (!key) return cookies
    cookies[key] = decodeURIComponent(rest.join('='))
    return cookies
  }, {})
}

const appendCookie = (response, cookieString) => {
  const current = response.getHeader('Set-Cookie')
  if (!current) {
    response.setHeader('Set-Cookie', [cookieString])
    return
  }

  const next = Array.isArray(current) ? [...current, cookieString] : [current, cookieString]
  response.setHeader('Set-Cookie', next)
}

export const setSignedCookie = (response, name, value, maxAgeSeconds = null) => {
  const parts = [`${name}=${encodeURIComponent(signCookieValue(value))}`, ...baseCookieOptions]
  if (maxAgeSeconds !== null) parts.push(`Max-Age=${maxAgeSeconds}`)
  appendCookie(response, parts.join('; '))
}

export const clearCookie = (response, name) => {
  appendCookie(
    response,
    `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}`,
  )
}

export const getSignedCookie = (request, name) => verifyCookieValue(parseCookies(request)[name])
export const getAuthEmail = (request) => getSignedCookie(request, authCookieName)
export const getVerificationEmail = (request) => getSignedCookie(request, verifyCookieName)

export const getAuthenticatedUser = async (request) => {
  const emailAddress = getAuthEmail(request)
  if (!emailAddress) return null

  const result = await pool.query('SELECT * FROM users WHERE "emailAddress" = $1 LIMIT 1', [emailAddress])
  return result.rows[0] || null
}

export const requireAdminAccess = async (request, response) => {
  const user = await getAuthenticatedUser(request)

  if (!user) {
    response.status(401).json({ error: 'Not authenticated' })
    return null
  }

  if (user.isActive === false) {
    clearCookie(response, authCookieName)
    response.status(403).json({ error: 'This account is suspended' })
    return null
  }

  if (String(user.role || '').toLowerCase() !== 'admin') {
    response.status(403).json({ error: 'Administrator access required' })
    return null
  }

  if (user.mustChangePassword === true || user.isVerified !== true) {
    clearCookie(response, authCookieName)
    response.status(403).json({ error: 'Administrator security setup is incomplete' })
    return null
  }

  return user
}
