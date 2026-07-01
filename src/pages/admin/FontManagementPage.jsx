import { useState, useEffect, useRef } from 'react'
import { Minus, Plus, RotateCcw, TextSelect, Type, HelpCircle, Save, Trash2, X } from 'lucide-react'
import AdminPageShell from './AdminPageShell'
import { useTheme } from '../../contexts/ThemeContext'
import { dayTheme, darkTheme } from '../../themeColors'
import {
  fontOptions, sizeRoles, getStoredFontPreference, getStoredFontScales,
  applyFontPreference, applyFontScales, getDefaultScales,
  saveFontSettingsToApi, fetchGlobalFontSettings, getScaledFontValue, saveFontTemplateToApi, deleteFontTemplateFromApi,
} from '../../utils/fontPreference'

const SIZE_MIN = 0.5
const SIZE_MAX = 2.5
const SIZE_STEP = 0.05

const roleInfo = {
  heroHeading: 'Page hero titles on the homepage and top-level sections.',
  wordmark: 'Large display text — the QSphere wordmark, big numeric counters.',
  heading: 'Page-level headings like blog post titles, dashboard section headers.',
  sectionHeading: 'Section titles within a page — "Openings grid", "Recent activity", etc.',
  cardHeading: 'Card and panel titles across blog cards, group cards, position cards.',
  bodyText: 'Primary reading text — paragraph content, descriptions, and running text.',
  cardBody: 'Text inside cards — blog excerpts, group descriptions, compact summaries.',
  navText: 'Navigation bar links and menu items.',
  statValue: 'Large numeric stats — "03", "12", "87%" on stat cards and hero metrics.',
  small: 'Labels, captions, badges, timestamps, helper text, meta info, tiny UI labels.',
  prose: 'Blog article body text — the rich-text editor output and full article reading view.',
}

const TooltipIcon = ({ id, palette, isDayMode }) => {
  const info = roleInfo[id]
  if (!info) return null
  return (
    <span className="relative group inline-flex items-center">
      <HelpCircle size={12} className="cursor-help" style={{ color: palette.textMuted }} />
      <span
        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 rounded-xl border p-2.5 text-[11px] leading-5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-50"
        style={{
          borderColor: palette.borderPrimary,
          backgroundColor: isDayMode ? 'rgba(255,255,255,0.98)' : 'rgba(8,18,13,0.98)',
          color: palette.textSecondary,
          boxShadow: palette.shadowDropdown,
        }}
      >
        {info}
        <span
          className="absolute left-1/2 -translate-x-1/2 top-full -mt-px h-2 w-2 rotate-45 border-r border-b"
          style={{
            borderColor: palette.borderPrimary,
            backgroundColor: isDayMode ? 'rgba(255,255,255,0.98)' : 'rgba(8,18,13,0.98)',
          }}
        />
      </span>
    </span>
  )
}

export default function FontManagementPage() {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme
  const initialScales = getStoredFontScales()
  const initialDraftScales = Object.keys(initialScales).length > 0 ? initialScales : getDefaultScales()

  const [fontChoice, setFontChoice] = useState(getStoredFontPreference)
  const [scales, setScales] = useState(initialDraftScales)
  const [savedState, setSavedState] = useState(() => ({
    fontChoice: getStoredFontPreference(),
    scales: initialDraftScales,
  }))
  const [saving, setSaving] = useState(false)
  const [templates, setTemplates] = useState([])
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [deletingTemplateId, setDeletingTemplateId] = useState(null)
  const [selectedRoleIds, setSelectedRoleIds] = useState([])
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    fetchGlobalFontSettings().then((data) => {
      if (!data) return
      const current = data.current || data
      const nextFontChoice = current?.fontFamily && fontOptions[current.fontFamily] ? current.fontFamily : getStoredFontPreference()
      const nextScales = current?.sizeScales && typeof current.sizeScales === 'object' && Object.keys(current.sizeScales).length > 0
        ? current.sizeScales
        : getDefaultScales()

      setFontChoice(nextFontChoice)
      setScales(nextScales)
      setSavedState({ fontChoice: nextFontChoice, scales: nextScales })
      setTemplates(Array.isArray(data.templates) ? data.templates : [])

      applyFontPreference(nextFontChoice)
      applyFontScales(nextScales)
    })
  }, [])

  const snack = (msg, type = 'success') => {
    window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message: msg, type } }))
  }

  const handleFontChange = (e) => {
    const value = e.target.value
    setFontChoice(value)
    applyFontPreference(value)
  }

  const handleScaleChange = (role, value) => {
    const parsedValue = parseFloat(value)
    const next = { ...scales }

    for (const varName of role.vars) {
      next[varName] = parsedValue
    }

    setScales(next)
    applyFontScales(next)
  }

  const adjustScale = (role, delta) => {
    const current = typeof scales[role.vars[0]] === 'number' ? scales[role.vars[0]] : 1
    const next = Math.min(SIZE_MAX, Math.max(SIZE_MIN, +(current + delta).toFixed(2)))
    handleScaleChange(role, next)
  }

  const handleReset = () => {
    const defaults = getDefaultScales()
    setScales(defaults)
    applyFontScales(defaults)
  }

  const handleResetRole = (role) => {
    const next = { ...scales }
    for (const v of role.vars) next[v] = 1
    setScales(next)
    applyFontScales(next)
  }

  const toggleRoleSelection = (roleId) => {
    setSelectedRoleIds((current) => (
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId]
    ))
  }

  const selectAllRoles = () => {
    setSelectedRoleIds(sizeRoles.map((role) => role.id))
  }

  const clearSelectedRoles = () => {
    setSelectedRoleIds([])
  }

  const selectedRoles = sizeRoles.filter((role) => selectedRoleIds.includes(role.id))
  const groupedCurrentScale = selectedRoles.length
    ? selectedRoles.reduce((total, role) => total + (typeof scales[role.vars[0]] === 'number' ? scales[role.vars[0]] : 1), 0) / selectedRoles.length
    : 1

  const handleGroupedScaleChange = (value) => {
    if (!selectedRoles.length) return

    const parsedValue = parseFloat(value)
    const currentAverage = groupedCurrentScale || 1
    const ratio = parsedValue / currentAverage
    const next = { ...scales }

    selectedRoles.forEach((role) => {
      role.vars.forEach((varName) => {
        const currentValue = typeof next[varName] === 'number' ? next[varName] : 1
        next[varName] = Math.min(SIZE_MAX, Math.max(SIZE_MIN, +(currentValue * ratio).toFixed(2)))
      })
    })

    setScales(next)
    applyFontScales(next)
  }

  const adjustGroupedScale = (delta) => {
    const next = Math.min(SIZE_MAX, Math.max(SIZE_MIN, +(groupedCurrentScale + delta).toFixed(2)))
    handleGroupedScaleChange(next)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      applyFontPreference(fontChoice)
      applyFontScales(scales)
      await saveFontSettingsToApi(fontChoice, scales)
      setSavedState({ fontChoice, scales })
      snack('Font settings saved and published')
    } catch {
      snack('Failed to save font settings to server', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveTemplate = async () => {
    const cleanName = templateName.trim()
    if (!cleanName) {
      snack('Template name is required', 'error')
      return
    }

    setSavingTemplate(true)
    try {
      const created = await saveFontTemplateToApi(cleanName, fontChoice, scales)
      setTemplates((prev) => [...prev.filter((item) => item.id !== created.id), created].sort((a, b) => String(a.name).localeCompare(String(b.name))))
      setTemplateModalOpen(false)
      setTemplateName('')
      snack('Font template saved')
    } catch {
      snack('Failed to save font template', 'error')
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleApplyTemplate = (template) => {
    const nextFontChoice = template.fontFamily && fontOptions[template.fontFamily] ? template.fontFamily : 'default'
    const nextScales = template.sizeScales && typeof template.sizeScales === 'object' ? template.sizeScales : getDefaultScales()
    setFontChoice(nextFontChoice)
    setScales(nextScales)
    applyFontPreference(nextFontChoice)
    applyFontScales(nextScales)
    snack(`Applied template: ${template.name}`)
  }

  const handleDeleteTemplate = async (templateId) => {
    setDeletingTemplateId(templateId)
    try {
      await deleteFontTemplateFromApi(templateId)
      setTemplates((prev) => prev.filter((item) => item.id !== templateId))
      snack('Template deleted')
    } catch {
      snack('Failed to delete template', 'error')
    } finally {
      setDeletingTemplateId(null)
    }
  }

  const handleDiscard = () => {
    setFontChoice(savedState.fontChoice)
    setScales(savedState.scales)
    applyFontPreference(savedState.fontChoice)
    applyFontScales(savedState.scales)
    snack('Unsaved font changes discarded')
  }

  const hasUnsavedChanges =
    fontChoice !== savedState.fontChoice || JSON.stringify(scales) !== JSON.stringify(savedState.scales)

  const draftFontConfig = fontOptions[fontChoice] || fontOptions.default
  const previewText = 'Aa Bb Cc - The quick brown fox jumps over the lazy dog.'

  return (
    <AdminPageShell
      eyebrow="Typography control"
      title="Tune your typography,"
      titleAccent="live across the platform."
      description="Choose a typeface and fine-tune each text role's size independently. Changes publish site-wide when you click Save."
      actions={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all"
            style={{
              borderColor: palette.borderPrimary,
              backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.06)',
              color: palette.textSecondary,
            }}
          >
            <RotateCcw size={14} />
            Reset all
          </button>
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!hasUnsavedChanges || saving}
            className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: palette.borderPrimary,
              backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.06)',
              color: palette.textSecondary,
            }}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => setTemplateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all"
            style={{
              borderColor: palette.borderPrimary,
              backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.06)',
              color: palette.textSecondary,
            }}
          >
            <Save size={14} />
            Save as template
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saving}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: palette.btnPrimaryBg,
              color: palette.btnPrimaryText,
            }}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      }
    >
      <div
        className="mb-6 rounded-[26px] border px-5 py-4 text-sm backdrop-blur-xl"
        style={{
          borderColor: hasUnsavedChanges ? palette.accentBorder : palette.borderPrimary,
          backgroundColor: hasUnsavedChanges
            ? (isDayMode ? 'rgba(46,197,138,0.08)' : 'rgba(16,185,129,0.08)')
            : (isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.03)'),
          color: hasUnsavedChanges ? palette.textPrimary : palette.textMuted,
        }}
      >
        {hasUnsavedChanges
          ? 'You have unsaved typography changes. Click Save changes to publish them across the website.'
          : 'These typography settings are live on the website.'}
      </div>

      {/* Font Family Selector */}
      <div
        className="mb-6 rounded-[32px] border p-6 backdrop-blur-2xl md:p-7"
        style={{
          border: `1px solid ${palette.borderPrimary}`,
          background: isDayMode ? 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(247,247,245,0.9))' : 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <TextSelect size={16} style={{ color: palette.accentPrimary }} />
          <span className="text-[10px] uppercase tracking-[0.28em]" style={{ color: palette.accentDark }}>Font Family</span>
        </div>
        <p className="text-sm mb-4" style={{ color: palette.textMuted }}>
          Switch between typeface presets. Use the previews below, then click Save changes to publish them.
        </p>
        <select
          value={fontChoice}
          onChange={handleFontChange}
          className="w-full max-w-xs rounded-2xl border px-4 py-3 text-sm outline-none transition"
          style={{
            borderColor: palette.borderInput,
            backgroundColor: palette.bgInput,
            color: palette.textPrimary,
          }}
        >
          {Object.entries(fontOptions).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </div>

      <div
        className="mb-6 rounded-[32px] border p-6 backdrop-blur-2xl md:p-7"
        style={{
          border: `1px solid ${palette.borderPrimary}`,
          background: isDayMode ? 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(247,247,245,0.9))' : 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentDark }}>Saved Templates</div>
            <p className="mt-2 text-sm" style={{ color: palette.textMuted }}>
              Save your favorite font combinations, then reapply them anytime after resets or future edits.
            </p>
          </div>
        </div>

        {templates.length === 0 ? (
          <div className="rounded-2xl border px-4 py-4 text-sm" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgInput, color: palette.textMuted }}>
            No templates saved yet.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="rounded-[24px] border p-4"
                style={{ borderColor: palette.borderPrimary, backgroundColor: isDayMode ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.03)' }}
              >
                <div className="type-cardHeading" style={{ color: palette.textPrimary }}>{template.name}</div>
                <div className="mt-2 text-xs" style={{ color: palette.textMuted }}>
                  {fontOptions[template.fontFamily]?.label || template.fontFamily}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate(template)}
                    className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold"
                    style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(template.id)}
                    disabled={deletingTemplateId === template.id}
                    className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-50"
                    style={{ borderColor: palette.borderPrimary, color: '#ef4444', backgroundColor: isDayMode ? '#fff' : 'rgba(255,255,255,0.03)' }}
                  >
                    <Trash2 size={12} className="mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className="mb-6 rounded-[32px] border p-6 backdrop-blur-2xl md:p-7"
        style={{
          border: `1px solid ${palette.borderPrimary}`,
          background: isDayMode ? 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(247,247,245,0.9))' : 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentDark }}>Grouped Scaling</div>
            <p className="mt-2 text-sm" style={{ color: palette.textMuted }}>
              Tick the checkboxes on any roles below. Then scale them together while keeping their size ratio balanced.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectAllRoles}
              className="rounded-full border px-4 py-2 text-xs font-semibold"
              style={{ borderColor: palette.borderPrimary, color: palette.textSecondary, backgroundColor: isDayMode ? '#fff' : 'rgba(255,255,255,0.03)' }}
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearSelectedRoles}
              className="rounded-full border px-4 py-2 text-xs font-semibold"
              style={{ borderColor: palette.borderPrimary, color: palette.textSecondary, backgroundColor: isDayMode ? '#fff' : 'rgba(255,255,255,0.03)' }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {selectedRoles.length > 0 ? (
        <div
          className="mb-6 rounded-[32px] border p-6 backdrop-blur-2xl md:p-7"
          style={{
            border: `1px solid ${palette.accentBorder}`,
            background: isDayMode ? 'linear-gradient(145deg, rgba(46,197,138,0.08), rgba(255,255,255,0.96))' : 'linear-gradient(145deg, rgba(16,185,129,0.10), rgba(255,255,255,0.02))',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: palette.accentDark }}>
                Scale Selected Roles
              </div>
              <div className="mt-2 text-sm" style={{ color: palette.textSecondary }}>
                {selectedRoles.map((role) => role.label).join(' • ')}
              </div>
            </div>
            <span className="text-sm font-bold tabular-nums" style={{ color: palette.accentPrimary }}>
              {Math.round(groupedCurrentScale * 100)}%
            </span>
          </div>

          <input
            type="range"
            min={SIZE_MIN}
            max={SIZE_MAX}
            step={SIZE_STEP}
            value={groupedCurrentScale}
            onChange={(e) => handleGroupedScaleChange(e.target.value)}
            className="w-full"
            style={{ accentColor: palette.accentPrimary }}
          />

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => adjustGroupedScale(-0.1)}
                disabled={groupedCurrentScale <= SIZE_MIN}
                className="flex h-8 w-8 items-center justify-center rounded-lg border text-xs transition disabled:opacity-30"
                style={{ borderColor: palette.borderPrimary, color: palette.textSecondary }}
              >
                <Minus size={12} />
              </button>
              <button
                type="button"
                onClick={() => adjustGroupedScale(0.1)}
                disabled={groupedCurrentScale >= SIZE_MAX}
                className="flex h-8 w-8 items-center justify-center rounded-lg border text-xs transition disabled:opacity-30"
                style={{ borderColor: palette.borderPrimary, color: palette.textSecondary }}
              >
                <Plus size={12} />
              </button>
            </div>
            <div className="text-xs" style={{ color: palette.textMuted }}>
              Ratio stays aligned across all selected roles.
            </div>
          </div>
        </div>
      ) : null}

      {/* Size Controls Grid */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {sizeRoles.map((role) => {
          const varName = role.vars[0]
          const current = typeof scales[varName] === 'number' ? scales[varName] : 1
          const pct = Math.round(current * 100)
          const isSelected = selectedRoleIds.includes(role.id)

          return (
            <div
              key={role.id}
              className="rounded-[28px] border p-5 backdrop-blur-2xl transition-all"
              style={{
                border: `1px solid ${isSelected ? palette.accentBorder : palette.borderPrimary}`,
                background: isDayMode ? 'linear-gradient(145deg, rgba(255,255,255,0.94), rgba(247,247,245,0.86))' : 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRoleSelection(role.id)}
                      className="h-4 w-4 rounded border"
                      style={{ accentColor: palette.accentPrimary }}
                    />
                  </label>
                  <Type size={14} style={{ color: palette.accentPrimary }} />
                  <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: palette.accentDark }}>{role.label}</span>
                  <TooltipIcon id={role.id} palette={palette} isDayMode={isDayMode} />
                </div>
                <span className="text-sm font-bold tabular-nums" style={{ color: palette.accentPrimary }}>{pct}%</span>
              </div>

              <input
                type="range"
                min={SIZE_MIN}
                max={SIZE_MAX}
                step={SIZE_STEP}
                value={current}
                onChange={(e) => handleScaleChange(role, e.target.value)}
                className="w-full"
                style={{ accentColor: palette.accentPrimary }}
              />

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => adjustScale(role, -0.1)}
                    disabled={current <= SIZE_MIN}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border text-xs transition disabled:opacity-30"
                    style={{ borderColor: palette.borderPrimary, color: palette.textSecondary }}
                  >
                    <Minus size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustScale(role, 0.1)}
                    disabled={current >= SIZE_MAX}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border text-xs transition disabled:opacity-30"
                    style={{ borderColor: palette.borderPrimary, color: palette.textSecondary }}
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleResetRole(role)}
                  className="flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition"
                  style={{ borderColor: palette.borderSoft, color: palette.textMuted }}
                >
                     <RotateCcw size={10} />
                     Reset
                   </button>
              </div>

              <div
                className="mt-4 rounded-xl border px-3 py-2"
                style={{ borderColor: palette.borderSoft, backgroundColor: isDayMode ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.03)' }}
              >
                <span
                  className="block truncate"
                  style={{
                    fontFamily: role.id === 'bodyText' || role.id === 'cardBody' || role.id === 'small' || role.id === 'prose'
                      ? draftFontConfig.body
                      : draftFontConfig.heading,
                    color: palette.textPrimary,
                    fontSize: getScaledFontValue(varName, current) || undefined,
                  }}
                >
                  {previewText}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {templateModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => !savingTemplate && setTemplateModalOpen(false)} />
          <div
            className="relative z-[91] w-full max-w-xl rounded-[32px] border p-6 md:p-7"
            style={{
              borderColor: palette.borderPrimary,
              background: isDayMode ? 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(247,247,245,0.94))' : 'linear-gradient(145deg, rgba(12,18,16,0.98), rgba(9,14,12,0.95))',
              boxShadow: palette.shadowDropdown,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentDark }}>Save Template</div>
                <h3 className="type-cardHeading mt-3" style={{ color: palette.textPrimary }}>Name this typography preset</h3>
                <p className="mt-3 text-sm leading-7" style={{ color: palette.textSecondary }}>
                  Save the current font family and all current size settings as a reusable template.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !savingTemplate && setTemplateModalOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border"
                style={{ borderColor: palette.borderPrimary, color: palette.textSecondary, backgroundColor: palette.bgInput }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-6">
              <label className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: palette.accentDark }}>
                Template Name
              </label>
              <input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="e.g. Editorial Large, Compact Admin, Professional Clean"
                className="mt-3 w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput, color: palette.textPrimary }}
              />
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                className="rounded-full border px-5 py-2.5 text-sm font-semibold"
                style={{ borderColor: palette.borderPrimary, color: palette.textSecondary, backgroundColor: isDayMode ? '#fff' : 'rgba(255,255,255,0.03)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={savingTemplate}
                className="rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
              >
                {savingTemplate ? 'Saving...' : 'Save template'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPageShell>
  )
}
