import { strFromU8, unzipSync } from 'fflate'

const cleanText = (value) =>
  String(value || '')
    .replaceAll('\u0000', ' ')
    .replace(/[\u2012-\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\r/g, '')

const normalizeLine = (line) => cleanText(line).trim()

const toLines = (text) =>
  cleanText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

const decodeHtmlEntities = (value) =>
  String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

const isSectionHeading = (line) =>
  /^(summary|profile|about|skills|technical skills|core skills|competencies|experience|education|projects|certifications|contact|references)$/i.test(
    normalizeLine(line),
  )

const isContactLine = (line) =>
  /@|https?:\/\/|linkedin|github|portfolio|curriculum vitae|resume|cv\b|\+?\d[\d\s().-]{7,}\d/i.test(
    normalizeLine(line),
  )

const findFirstMatch = (text, pattern) => {
  const match = text.match(pattern)
  return match?.[0]?.trim() || ''
}

const isLikelyName = (line) => {
  const candidate = normalizeLine(line)
  if (!candidate || candidate.length < 4 || candidate.length > 48) return false
  if (/@|https?:\/\/|linkedin|github|curriculum|resume|cv\b|portfolio/i.test(candidate)) return false
  const words = candidate.split(/\s+/)
  if (words.length < 2 || words.length > 4) return false
  return words.every((word) => /^[A-Za-z][A-Za-z'.-]*$/.test(word))
}

const extractName = (text) => {
  const lines = toLines(text)
  return lines.find(isLikelyName) || ''
}

const extractSectionValue = (text, labels, options = {}) => {
  const lines = cleanText(text).split('\n')
  const normalizedLabels = labels.map((label) => label.toLowerCase())
  const { multiline = false, maxLines = 4 } = options

  for (let index = 0; index < lines.length; index += 1) {
    const line = normalizeLine(lines[index])
    const lower = line.toLowerCase()
    const matchedLabel = normalizedLabels.find((label) => lower.startsWith(label))
    if (!matchedLabel) continue

    const inlineValue = line.slice(matchedLabel.length).replace(/^[:\-–]\s*/, '').trim()
    if (inlineValue && !multiline) return inlineValue

    const block = inlineValue ? [inlineValue] : []
    for (let inner = index + 1; inner < lines.length && block.length < maxLines; inner += 1) {
      const nextLine = normalizeLine(lines[inner])
      if (!nextLine || isSectionHeading(nextLine)) break
      block.push(nextLine)
      if (!multiline) break
    }

    if (block.length) return block.join(' ')
  }

  return ''
}

const extractSummary = (text) => {
  const normalized = cleanText(text)
  const summarySection =
    extractSectionValue(normalized, ['summary', 'profile', 'professional summary', 'about'], {
      multiline: true,
      maxLines: 6,
    }) ||
    toLines(normalized)
      .filter((line) => !isLikelyName(line) && !isContactLine(line) && !isSectionHeading(line))
      .slice(0, 4)
      .join(' ')

  return summarySection.slice(0, 320).trim()
}

const extractSkills = (text) => {
  const skillBlock =
    extractSectionValue(text, ['skills', 'technical skills', 'core skills', 'competencies'], {
      multiline: true,
      maxLines: 8,
    }) || ''

  if (!skillBlock) return []

  return skillBlock
    .split(/[,\u2022|/]/)
    .map((skill) => normalizeLine(skill))
    .filter(Boolean)
    .slice(0, 8)
}

const extractRoleOrAffiliation = (text) => {
  const lines = toLines(text)
  const namedLines = lines.filter(
    (line) => !isLikelyName(line) && !isContactLine(line) && !isSectionHeading(line),
  )

  return {
    currentRole:
      extractSectionValue(text, [
        'current role',
        'role',
        'title',
        'headline',
        'designation',
        'position',
      ]) ||
      namedLines[0] ||
      '',
    organization:
      extractSectionValue(text, ['organization', 'company', 'institute', 'university']) ||
      namedLines[1] ||
      '',
  }
}

const extractXmlText = (xmlText) =>
  decodeHtmlEntities(
    String(xmlText || '')
      .replace(/<w:tab[^>]*\/>/g, '\t')
      .replace(/<w:br[^>]*\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<\/w:tr>/g, '\n')
      .replace(/<[^>]+>/g, ' '),
  )

const extractDocxText = async (file) => {
  const buffer = new Uint8Array(await file.arrayBuffer())
  const zipped = unzipSync(buffer)
  const relevantEntries = Object.entries(zipped).filter(([name]) =>
    /^word\/(document|header\d+|footer\d+)\.xml$/i.test(name),
  )

  return relevantEntries
    .map(([, bytes]) => extractXmlText(strFromU8(bytes)))
    .join('\n')
}

const stripRtf = (value) =>
  cleanText(
    String(value || '')
      .replace(/\\par[d]?/gi, '\n')
      .replace(/\\tab/gi, '\t')
      .replace(/\\'[0-9a-f]{2}/gi, ' ')
      .replace(/\\[a-z]+-?\d*\s?/gi, ' ')
      .replace(/[{}]/g, ' '),
  )

const decodePdfLiteral = (value) =>
  String(value || '')
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, ' ')
    .replace(/\\f/g, ' ')
    .replace(/\\(\d{3})/g, (_match, octal) => String.fromCharCode(Number.parseInt(octal, 8)))

const extractPdfText = async (file) => {
  const raw = new TextDecoder('latin1').decode(await file.arrayBuffer())
  const segments = []

  for (const match of raw.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) {
    if (match[1]) {
      segments.push(decodePdfLiteral(match[1]))
    }
  }

  for (const match of raw.matchAll(/\[(.*?)\]\s*TJ/gs)) {
    const chunk = match[1] || ''
    for (const inner of chunk.matchAll(/\((?:\\.|[^\\)])*\)/g)) {
      segments.push(decodePdfLiteral(inner[0].slice(1, -1)))
    }
  }

  return cleanText(segments.join('\n'))
}

export const extractResumeText = async (file) => {
  if (!file) return ''

  const extension = String(file.name || '')
    .split('.')
    .pop()
    ?.toLowerCase()

  if (extension === 'docx') {
    return extractDocxText(file)
  }

  if (extension === 'pdf') {
    return extractPdfText(file)
  }

  try {
    if (typeof file.text === 'function') {
      const text = await file.text()
      if (extension === 'rtf' || extension === 'doc') {
        return stripRtf(text)
      }
      return text
    }
  } catch {
    // fall through
  }

  const buffer = await file.arrayBuffer()
  try {
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
    if (extension === 'rtf' || extension === 'doc') {
      return stripRtf(decoded)
    }
    return decoded
  } catch {
    const decoded = new TextDecoder().decode(buffer)
    if (extension === 'rtf' || extension === 'doc') {
      return stripRtf(decoded)
    }
    return decoded
  }
}

export const parseResumeAutofill = (resumeText, fallbackName = '') => {
  const text = cleanText(resumeText)
  const fullName = extractName(text) || fallbackName
  const email = findFirstMatch(text, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  const phone = findFirstMatch(text, /(?:\+?\d[\d\s().-]{7,}\d)/)
  const linkedinUrl = findFirstMatch(text, /https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)
  const portfolioUrl =
    findFirstMatch(text, /https?:\/\/(?!(?:www\.)?linkedin\.com\/)[^\s)]+/i) ||
    findFirstMatch(text, /(?:www\.)[^\s)]+\.[A-Za-z]{2,}[^\s)]+/i)
  const location =
    extractSectionValue(text, ['location', 'address', 'city']) ||
    findFirstMatch(text, /\b[A-Za-z]+(?:\s+[A-Za-z]+)*,\s*[A-Za-z]+(?:\s+[A-Za-z]+)*\b/)
  const availability = extractSectionValue(text, ['availability', 'available from', 'notice period'])
  const yearsExperience =
    extractSectionValue(text, ['experience', 'years of experience']) ||
    findFirstMatch(text, /\b\d+\+?\s+years?\b/i)
  const summary = extractSummary(text)
  const skills = extractSkills(text)
  const { currentRole, organization } = extractRoleOrAffiliation(text)

  return {
    fullName,
    email,
    phone,
    linkedinUrl,
    portfolioUrl,
    location,
    currentRole,
    organization,
    availability,
    yearsExperience,
    summary,
    skills,
  }
}
