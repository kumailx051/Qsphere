const PROFILE_STORAGE_KEY = 'qsphere_onboarding_profile'

const normalizeValue = (value) => String(value || '').trim()

export const normalizeEmail = (value) => normalizeValue(value).toLowerCase()

export const readStoredProfile = () => {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const getCurrentUserEmail = (profile = readStoredProfile()) =>
  normalizeEmail(
    profile?.emailAddress ||
      profile?.email ||
      localStorage.getItem('qsphere_email') ||
      localStorage.getItem('qsphere_email_to_verify'),
  )

export const getCurrentUserName = (profile = readStoredProfile()) =>
  normalizeValue(profile?.fullName) || 'QSphere Member'

export const getCurrentUserPhone = (profile = readStoredProfile()) =>
  normalizeValue(profile?.cellMain || profile?.phone)

export const getCurrentUserAffiliation = (profile = readStoredProfile()) =>
  normalizeValue(profile?.institute || profile?.organization)

export const getCurrentUserRoleSummary = (profile = readStoredProfile()) =>
  normalizeValue(
    profile?.roleTitle ||
      profile?.designation ||
      profile?.jobDescription ||
      profile?.degree ||
      profile?.role,
  )

export const getCurrentUserLocation = (profile = readStoredProfile()) =>
  normalizeValue(profile?.city || profile?.address)

