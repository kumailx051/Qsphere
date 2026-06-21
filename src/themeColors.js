/**
 * QSphere Theme Color Palettes
 * ─────────────────────────────
 * darkTheme: extracted from existing codebase (Tailwind classes + inline styles)
 * dayTheme:  provided via pixel-sampled reference image
 *
 * Each key is a semantic token. Use these in CSS variables, Tailwind config,
 * styled-components theme, or plain JS — the file is framework-agnostic.
 */

// ─── Dark Theme (existing codebase) ─────────────────────────────────────────

export const darkTheme = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  bgPrimary:        '#060a06',    // page / app root
  bgSecondary:      '#08120d',    // alternate page background (AccountMgmt, GroupDetail, etc.)
  bgTertiary:       '#0a120c',    // modals, select dropdowns, pickers
  bgNavbar:         'rgba(0,0,0,0.70)', // navbar pill background (with backdrop-blur-2xl)
  bgSurface:        'rgba(255,255,255,0.05)', // glass panel surfaces, card backgrounds
  bgSurfaceHover:   'rgba(255,255,255,0.08)', // surface hover state
  bgInput:          'rgba(0,0,0,0.20)', // input / form field background
  bgInputFocus:     'rgba(255,255,255,0.06)', // input focus state
  bgDropdown:       '#07120e',    // notification / dropdown panels

  // ── Text ─────────────────────────────────────────────────────────────────
  textPrimary:      '#ffffff',    // headings, primary text
  textSecondary:    'rgba(255,255,255,0.75)', // body text, descriptions
  textMuted:        'rgba(255,255,255,0.52)', // inactive labels, secondary info
  textFaint:        'rgba(255,255,255,0.30)', // placeholders, disabled text

  // ── Accent — Emerald (brand primary) ─────────────────────────────────────
  accentPrimary:    '#10b981',    // Tailwind emerald-500, brand green
  accentLight:      '#6ee7b7',    // Tailwind emerald-300, bright highlight
  accentDark:       '#059669',    // Tailwind emerald-600, deeper accent
  accentSoft:       'rgba(16,185,129,0.10)', // soft tint backgrounds
  accentBorder:     'rgba(16,185,129,0.18)', // accent borders on cards/pills
  accentGlow:       'rgba(16,185,129,0.10)', // ambient glow blurs

  // ── Accent — Cyan (secondary highlight) ──────────────────────────────────
  accentSecondary:  '#06b6d4',    // Tailwind cyan-500
  accentSecondaryGlow: 'rgba(6,182,212,0.10)', // ambient glow blurs

  // ── Buttons — Primary (emerald) ──────────────────────────────────────────
  btnPrimaryBg:     'rgba(16,185,129,0.12)',
  btnPrimaryBorder: 'rgba(16,185,129,0.18)',
  btnPrimaryText:   '#6ee7b7',    // emerald-300
  btnPrimaryHoverBg:    'rgba(16,185,129,0.16)',
  btnPrimaryHoverBorder: 'rgba(16,185,129,0.30)',
  btnPrimaryHoverText:  '#a7f3d0', // emerald-200

  // ── Buttons — Secondary (ghost / outline) ────────────────────────────────
  btnSecondaryBg:       'rgba(255,255,255,0.03)',
  btnSecondaryBorder:   'rgba(255,255,255,0.08)',
  btnSecondaryText:     'rgba(255,255,255,0.72)',
  btnSecondaryHoverBg:      'rgba(255,255,255,0.06)',
  btnSecondaryHoverBorder:  'rgba(255,255,255,0.14)',
  btnSecondaryHoverText:    '#ffffff',

  // ── Borders ──────────────────────────────────────────────────────────────
  borderPrimary:    'rgba(255,255,255,0.08)', // card / panel borders
  borderSoft:       'rgba(255,255,255,0.06)', // subtle dividers, inner borders
  borderInput:      'rgba(255,255,255,0.10)', // form field borders
  borderInputFocus: 'rgba(16,185,129,0.40)', // focused input border

  // ── Feedback / Status ────────────────────────────────────────────────────
  success:          '#10b981',
  error:            '#ef4444',
  warning:          '#f59e0b',
  info:             '#06b6d4',

  // ── Shadows ──────────────────────────────────────────────────────────────
  shadowCard:       '0 40px 120px rgba(0,0,0,0.45)',
  shadowDropdown:   '0 24px 80px -24px rgba(0,0,0,0.95)',
  shadowGlow:       '0 0 36px rgba(16,185,129,0.28)', // navbar glow, button glow
}


// ─── Day Theme (light — from pixel-sampled reference image) ─────────────────

export const dayTheme = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  bgPrimary:        '#FAF9F7',    // page / app root
  bgSecondary:      '#F9F8F5',    // alternate page background
  bgTertiary:       '#F7F7F7',    // modals, surface panels
  bgNavbar:         '#F7F7F7',    // navbar pill background
  bgSurface:        '#ffffff',    // glass panel surfaces, cards
  bgSurfaceHover:   '#F7F7F5',    // surface hover state
  bgInput:          '#F7F7F7',    // input / form field background
  bgInputFocus:     '#ffffff',    // input focus state
  bgDropdown:       '#ffffff',    // dropdown panels

  // ── Text ─────────────────────────────────────────────────────────────────
  textPrimary:      '#0A1620',    // headings, primary text
  textSecondary:    '#4E535C',    // body text, descriptions
  textMuted:        '#9CA0A8',    // inactive labels, secondary info
  textFaint:        '#C0C4CC',    // placeholders, disabled text

  // ── Accent — Green (brand primary) ───────────────────────────────────────
  accentPrimary:    '#2EC58A',    // brand green
  accentLight:      '#B1E7D1',    // soft accent tint
  accentDark:       '#0E9660',    // deeper accent (eyebrow labels, hover)
  accentSoft:       'rgba(46,197,138,0.10)', // soft tint backgrounds
  accentBorder:     'rgba(46,197,138,0.18)', // accent borders on cards/pills
  accentGlow:       'rgba(46,197,138,0.08)', // ambient glow blurs

  // ── Accent — Secondary (reserved for future use) ─────────────────────────
  accentSecondary:  '#06b6d4',
  accentSecondaryGlow: 'rgba(6,182,212,0.08)',

  // ── Buttons — Primary (green) ────────────────────────────────────────────
  btnPrimaryBg:     '#1E9E6B',    // button background
  btnPrimaryBorder: 'transparent',
  btnPrimaryText:   '#FFFFFF',    // button text
  btnPrimaryHoverBg:    '#178055', // button hover
  btnPrimaryHoverBorder: 'transparent',
  btnPrimaryHoverText:  '#FFFFFF',

  // ── Buttons — Secondary (ghost / outline) ────────────────────────────────
  btnSecondaryBg:       '#ffffff',
  btnSecondaryBorder:   '#E7E5E1',
  btnSecondaryText:     '#4E535C',
  btnSecondaryHoverBg:      '#F7F7F5',
  btnSecondaryHoverBorder:  '#D4D2CD',
  btnSecondaryHoverText:    '#0A1620',

  // ── Borders ──────────────────────────────────────────────────────────────
  borderPrimary:    '#E7E5E1',    // card / panel borders
  borderSoft:       '#EFEDE5',    // subtle dividers, inner borders
  borderInput:      '#E7E5E1',    // form field borders
  borderInputFocus: '#2EC58A',    // focused input border

  // ── Feedback / Status ────────────────────────────────────────────────────
  success:          '#2EC58A',
  error:            '#ef4444',
  warning:          '#f59e0b',
  info:             '#06b6d4',

  // ── Shadows ──────────────────────────────────────────────────────────────
  shadowCard:       '0 40px 120px rgba(0,0,0,0.06)',
  shadowDropdown:   '0 24px 80px -24px rgba(0,0,0,0.12)',
  shadowGlow:       '0 0 36px rgba(46,197,138,0.12)',
}
