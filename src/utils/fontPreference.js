const FONT_KEY = 'qsphere_font_preference'
const SCALES_KEY = 'qsphere_font_scales'
let globalFontSyncTimer = null
let lastAppliedGlobalSignature = null

export const fontOptions = {
  default: {
    label: 'Default',
    heading: "'Syne', 'Inter', 'Segoe UI', sans-serif",
    body: "'DM Sans', 'Inter', 'Segoe UI', sans-serif",
    accent: "'Archivo Black', 'Inter', 'Segoe UI', sans-serif",
    googleUrl: null,
  },
  professional: {
    label: 'Professional',
    heading: "'Manrope', 'Inter', 'Segoe UI', sans-serif",
    body: "'Manrope', 'Inter', 'Segoe UI', sans-serif",
    accent: "'Manrope', 'Inter', 'Segoe UI', sans-serif",
    googleUrl:
      'https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap',
  },
  funky: {
    label: 'Funky',
    heading: "'Bungee', cursive",
    body: "'Nunito', sans-serif",
    accent: "'Bungee', cursive",
    googleUrl:
      'https://fonts.googleapis.com/css2?family=Bungee&family=Nunito:ital,wght@0,200..1000;1,200..1000&display=swap',
  },
}

const sizeVarPatterns = [
  '--type-heroHeading-size',
  '--type-wordmark-size',
  '--type-displayNumber-size',
  '--type-heading-size',
  '--type-heading-soft-size',
  '--type-sectionHeading-size',
  '--type-cardHeading-size',
  '--type-titleSm-size',
  '--type-titleMd-size',
  '--type-bodyLarge-size',
  '--type-bodyText-size',
  '--type-cardBody-size',
  '--type-navText-size',
  '--type-statValue-size',
  '--type-labelText-size',
  '--type-uiText-size',
  '--type-helperText-size',
  '--type-metaText-size',
  '--type-microText-size',
  '--type-tinyText-size',
  '--type-captionText-size',
  '--type-proseBody-size',
  '--type-proseH1-size',
  '--type-proseH2-size',
  '--type-proseH3-size',
  '--type-proseH4-size',
]

export const sizeRoles = [
  { id: 'heroHeading', label: 'Hero Title', vars: ['--type-heroHeading-size', '--type-heading-soft-size'] },
  { id: 'wordmark', label: 'Wordmark', vars: ['--type-wordmark-size', '--type-displayNumber-size'] },
  { id: 'heading', label: 'Page / Blog Heading', vars: ['--type-heading-size', '--type-heading-soft-size'] },
  { id: 'sectionHeading', label: 'Section Heading', vars: ['--type-sectionHeading-size'] },
  { id: 'cardHeading', label: 'Card Title', vars: ['--type-cardHeading-size', '--type-titleSm-size', '--type-titleMd-size'] },
  { id: 'bodyText', label: 'Body Text', vars: ['--type-bodyText-size', '--type-bodyLarge-size'] },
  { id: 'cardBody', label: 'Card Body', vars: ['--type-cardBody-size'] },
  { id: 'navText', label: 'Nav Text', vars: ['--type-navText-size'] },
  { id: 'statValue', label: 'Stat Value', vars: ['--type-statValue-size'] },
  { id: 'small', label: 'Small / Meta Text', vars: ['--type-labelText-size', '--type-captionText-size', '--type-metaText-size', '--type-microText-size', '--type-tinyText-size', '--type-uiText-size', '--type-helperText-size'] },
  { id: 'prose', label: 'Blog Prose', vars: ['--type-proseBody-size', '--type-proseH1-size', '--type-proseH2-size', '--type-proseH3-size', '--type-proseH4-size'] },
]

const originalValues = {
  '--type-heroHeading-size': 'clamp(2rem, 3.8vw, 3.8rem)',
  '--type-wordmark-size': 'clamp(3.05rem, 9.9vw, 9.1rem)',
  '--type-displayNumber-size': 'clamp(5rem, 12vw, 9rem)',
  '--type-heading-size': 'clamp(1.72rem, 2.8vw, 2.9rem)',
  '--type-heading-soft-size': 'clamp(1.65rem, 2.5vw, 2.7rem)',
  '--type-sectionHeading-size': 'clamp(1.26rem, 1.72vw, 1.78rem)',
  '--type-cardHeading-size': 'clamp(1.02rem, 1.14vw, 1.28rem)',
  '--type-titleSm-size': '1.125rem',
  '--type-titleMd-size': '1.25rem',
  '--type-bodyLarge-size': '1.125rem',
  '--type-bodyText-size': '1rem',
  '--type-cardBody-size': '0.875rem',
  '--type-navText-size': '0.875rem',
  '--type-statValue-size': 'clamp(1.22rem, 1.48vw, 1.72rem)',
  '--type-labelText-size': '0.72rem',
  '--type-uiText-size': '0.8125rem',
  '--type-helperText-size': '0.75rem',
  '--type-metaText-size': '0.6875rem',
  '--type-microText-size': '0.625rem',
  '--type-tinyText-size': '0.72rem',
  '--type-captionText-size': '0.8rem',
  '--type-proseBody-size': 'clamp(1rem, 0.45vw + 0.92rem, 1.08rem)',
  '--type-proseH1-size': 'clamp(1.85rem, 2.6vw, 2.45rem)',
  '--type-proseH2-size': 'clamp(1.55rem, 2vw, 2rem)',
  '--type-proseH3-size': 'clamp(1.22rem, 1.4vw, 1.5rem)',
  '--type-proseH4-size': 'clamp(1.08rem, 1vw, 1.2rem)',
}

export function getScaledFontValue(varName, scale = 1) {
  const original = originalValues[varName]
  if (!original) return null
  return scaleSizeValue(original, scale)
}

function scaleSizeValue(value, scale) {
  if (typeof value !== 'string' || scale === 1) return value

  return value.replace(/(-?\d*\.?\d+)(rem|em|px|vw|vh|vmin|vmax|ch|ex|cm|mm|in|pt|pc|%)\b/g, (_, rawNumber, unit) => {
    const next = Number(rawNumber) * scale
    return `${next.toFixed(3).replace(/\.?0+$/, '')}${unit}`
  })
}

export function getStoredFontPreference() {
  try {
    const raw = localStorage.getItem(FONT_KEY)
    if (raw && fontOptions[raw]) return raw
  } catch {}
  return 'default'
}

export function getStoredFontScales() {
  try {
    const raw = localStorage.getItem(SCALES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch {}
  return {}
}

export function getDefaultScales() {
  const obj = {}
  for (const prop of Object.keys(originalValues)) {
    obj[prop] = 1
  }
  return obj
}

export function applyFontPreference(key) {
  const choice = key || getStoredFontPreference()
  const config = fontOptions[choice]
  if (!config) return

  const existing = document.getElementById('qs-font-link')
  if (existing) existing.remove()

  if (config.googleUrl) {
    const link = document.createElement('link')
    link.id = 'qs-font-link'
    link.rel = 'stylesheet'
    link.href = config.googleUrl
    document.head.appendChild(link)
  }

  document.documentElement.style.setProperty('--font-heading', config.heading)
  document.documentElement.style.setProperty('--font-body', config.body)
  document.documentElement.style.setProperty('--font-accent', config.accent)

  try {
    localStorage.setItem(FONT_KEY, choice)
  } catch {}
}

export function applyFontScales(scales) {
  const root = document.documentElement
  for (const [prop, original] of Object.entries(originalValues)) {
    const scale = typeof scales[prop] === 'number' ? scales[prop] : 1
    root.style.setProperty(prop, scaleSizeValue(original, scale))
  }
  try {
    localStorage.setItem(SCALES_KEY, JSON.stringify(scales))
  } catch {}
}

export function resetFontScales() {
  const root = document.documentElement
  for (const [prop, original] of Object.entries(originalValues)) {
    root.style.setProperty(prop, original)
  }
  try {
    localStorage.removeItem(SCALES_KEY)
  } catch {}
}

export async function fetchGlobalFontSettings() {
  try {
    const res = await fetch('/api/admin/font-settings')
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function applyGlobalFontSettings() {
  const data = await fetchGlobalFontSettings()
  if (!data) return false

  const current = data.current || data
  const nextSignature = JSON.stringify({
    fontFamily: current.fontFamily || 'default',
    sizeScales: current.sizeScales || {},
  })

  if (lastAppliedGlobalSignature === nextSignature) {
    return true
  }

  if (current.fontFamily && fontOptions[current.fontFamily]) {
    applyFontPreference(current.fontFamily)
  }

  if (current.sizeScales && typeof current.sizeScales === 'object' && Object.keys(current.sizeScales).length > 0) {
    applyFontScales(current.sizeScales)
  }

  lastAppliedGlobalSignature = nextSignature

  return true
}

export function startGlobalFontSettingsSync(intervalMs = 5000) {
  if (typeof window === 'undefined') return () => {}

  if (globalFontSyncTimer) {
    window.clearInterval(globalFontSyncTimer)
  }

  globalFontSyncTimer = window.setInterval(() => {
    applyGlobalFontSettings().catch(() => {})
  }, intervalMs)

  return () => {
    if (globalFontSyncTimer) {
      window.clearInterval(globalFontSyncTimer)
      globalFontSyncTimer = null
    }
  }
}

export async function saveFontSettingsToApi(fontFamily, sizeScales) {
  try {
    const res = await fetch('/api/admin/font-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fontFamily, sizeScales }),
    })
    if (!res.ok) throw new Error('Failed to save font settings')
    return await res.json()
  } catch (err) {
    throw err
  }
}

export async function saveFontTemplateToApi(name, fontFamily, sizeScales) {
  const res = await fetch('/api/admin/font-settings/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, fontFamily, sizeScales }),
  })
  if (!res.ok) throw new Error('Failed to save font template')
  return await res.json()
}

export async function deleteFontTemplateFromApi(id) {
  const res = await fetch(`/api/admin/font-settings/templates/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete font template')
  return await res.json()
}
