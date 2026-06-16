export const clearLegacyAuthStorage = () => {
  if (typeof window === 'undefined') return

  ;[
    'qsphere_logged_in',
    'qsphere_email',
    'qsphere_onboarding_profile',
    'qsphere_email_to_verify',
    'qsphere_otp_flow',
  ].forEach((key) => {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore storage cleanup failures
    }
  })
}

export const emitAuthChanged = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('qsphere-auth-changed'))
}

export const fetchCurrentUser = async () => {
  try {
    const response = await fetch('/api/auth/me')
    if (!response.ok) {
      if (response.status === 401) clearLegacyAuthStorage()
      return null
    }

    const result = await response.json()
    return result?.user || null
  } catch {
    return null
  }
}

export const fetchVerificationTarget = async () => {
  try {
    const response = await fetch('/api/auth/verification-target')
    if (!response.ok) return null

    const result = await response.json()
    return result?.emailAddress || null
  } catch {
    return null
  }
}

export const logoutCurrentUser = async () => {
  try {
    await fetch('/api/auth/logout', { method: 'POST' })
  } finally {
    clearLegacyAuthStorage()
    emitAuthChanged()
  }
}
