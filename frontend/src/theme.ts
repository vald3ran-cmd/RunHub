// ─────────────────────────────────────────────────────────────
// RunHub Design System — Light Blue professionale
// Primary #2563EB · Secondary #4F46E5 · Accent #7C3AED
// L'arancione brand (#E85D04) è riservato al logo (colors.brandLogo).
// ─────────────────────────────────────────────────────────────

export const colors = {
  // Base
  background: '#F6F8FC',           // app background
  surface: '#FFFFFF',              // cards
  surfaceSecondary: '#F1F5F9',     // secondary surface
  surfaceElevated: '#FFFFFF',      // elevated cards

  // Brand — Light Blue professionale
  primary: '#2563EB',
  primaryHover: '#3B82F6',
  primaryMuted: 'rgba(37,99,235,0.10)', // blue with alpha for icon bg
  primaryDark: '#1D4ED8',
  primaryTint: 'rgba(37,99,235,0.16)',   // badge / chip bg più marcato
  primaryBorder: 'rgba(37,99,235,0.30)', // bordo evidenziato
  secondary: '#4F46E5',
  secondaryMuted: 'rgba(79,70,229,0.10)',
  accent: '#7C3AED',
  accentMuted: 'rgba(124,58,237,0.10)',

  // Logo — l'arancione brand vive SOLO qui
  brandLogo: '#E85D04',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Borders / dividers
  border: '#E2E8F0',
  borderLight: '#EEF2F7',

  // Functional
  success: '#16A34A',
  successMuted: 'rgba(22,163,74,0.10)',
  warning: '#D97706',
  warningMuted: 'rgba(217,119,6,0.10)',
  info: '#0EA5E9',
  infoMuted: 'rgba(14,165,233,0.10)',
  danger: '#DC2626',
  dangerMuted: 'rgba(220,38,38,0.10)',

  // Progress
  progressTrack: '#E2E8F0',

  // Medaglie / tier
  gold: '#F59E0B',
  silver: '#A1A1AA',
  bronze: '#CD7F32',

  // Testo su superfici scure / foto / primary
  onDark: 'rgba(255,255,255,0.90)',
  onDarkMuted: 'rgba(255,255,255,0.60)',
  onDarkSubtle: 'rgba(255,255,255,0.15)',

  // Overlays
  overlay: 'rgba(15,23,42,0.45)',
  overlayStrong: 'rgba(15,23,42,0.70)',
  overlaySoft: 'rgba(15,23,42,0.30)',
  black: '#000000',
  white: '#FFFFFF',
};

// Scrim per testo sopra immagini (LinearGradient)
export const imageScrim = ['transparent', 'rgba(15,23,42,0.45)', 'rgba(15,23,42,0.85)'] as const;

export const fonts = {
  heading: 'Inter_900Black',
  headingBold: 'Inter_800ExtraBold',
  bold: 'Inter_700Bold',
  medium: 'Inter_500Medium',
  regular: 'Inter_400Regular',
  body: 'Inter_400Regular',
};

const FF = fonts;

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const radius = {
  sm: 8, md: 14, lg: 18, xl: 24, xxl: 32, pill: 999,
};

// Shadow presets — morbide sul light, glow blu per CTA
export const shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 4,
  },
  primary: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
};

// Typography presets
export const typography = {
  // Display (eyecatcher)
  displayLg: { fontSize: 36, fontFamily: FF.heading, letterSpacing: -1 },
  displayMd: { fontSize: 28, fontFamily: FF.heading, letterSpacing: -0.6 },
  // Heading
  h1: { fontSize: 24, fontFamily: FF.headingBold, letterSpacing: -0.4 },
  h2: { fontSize: 20, fontFamily: FF.headingBold, letterSpacing: -0.2 },
  h3: { fontSize: 17, fontFamily: FF.bold },
  // Body
  body: { fontSize: 15, fontFamily: FF.medium },
  bodyStrong: { fontSize: 15, fontFamily: FF.bold },
  small: { fontSize: 13, fontFamily: FF.medium },
  // Eyebrow / caps label
  eyebrow: { fontSize: 11, fontFamily: FF.headingBold, letterSpacing: 1.5 },
  micro: { fontSize: 10, fontFamily: FF.bold, letterSpacing: 1 },
};

// ─────────────────────────────────────────────────────────────
// ACTIVITY TYPES — Run, Walk, Bike
// ─────────────────────────────────────────────────────────────
export type ActivityType = 'run' | 'walk' | 'bike';

export const activityMeta: Record<ActivityType, {
  label: string;
  shortLabel: string;
  color: string;
  colorMuted: string;
  kcalPerKm: number;
}> = {
  run:  { label: 'CORSA',      shortLabel: 'Corsa',     color: '#2563EB', colorMuted: 'rgba(37,99,235,0.10)', kcalPerKm: 65 },
  walk: { label: 'CAMMINATA',  shortLabel: 'Camminata', color: '#16A34A', colorMuted: 'rgba(22,163,74,0.10)',  kcalPerKm: 50 },
  bike: { label: 'BICI',       shortLabel: 'Bici',      color: '#7C3AED', colorMuted: 'rgba(124,58,237,0.10)', kcalPerKm: 30 },
};

// ─────────────────────────────────────────────────────────────
// STEP TYPES (workout segments)
// ─────────────────────────────────────────────────────────────
export const stepTypeColors: Record<string, string> = {
  warmup: '#F59E0B',
  run: '#2563EB',
  recovery: '#22C55E',
  sprint: '#EF4444',
  walk: '#22C55E',
  bike: '#7C3AED',
  stretching: '#4F46E5',
  gymnastics: '#EC4899',
};

export const stepTypeLabels: Record<string, string> = {
  warmup: 'RISCALDAMENTO',
  run: 'CORSA',
  recovery: 'RECUPERO',
  sprint: 'SPRINT',
  walk: 'CAMMINATA',
  bike: 'BICI',
  stretching: 'STRETCHING',
  gymnastics: 'GINNASTICA',
};

// ─────────────────────────────────────────────────────────────
// i18n-aware label helpers — call these inside components that
// already use useT() so labels re-render on locale change.
// `t` is the function returned by useT() (or the global t() from i18n).
// ─────────────────────────────────────────────────────────────
export function getActivityLabel(
  type: ActivityType,
  t: (k: string, o?: any) => string,
  short: boolean = false,
): string {
  const key = `activity.${type}${short ? '_short' : ''}`;
  const v = t(key);
  if (typeof v === 'string' && v.startsWith('activity.')) {
    return short ? (activityMeta[type]?.shortLabel ?? type) : (activityMeta[type]?.label ?? type.toUpperCase());
  }
  return v;
}

export function getStepTypeLabel(
  type: string,
  t: (k: string, o?: any) => string,
): string {
  const key = `run.step_${type}`;
  const v = t(key);
  if (typeof v === 'string' && v.startsWith('run.step_')) {
    return stepTypeLabels[type] || type.toUpperCase();
  }
  // Existing run.step_* are usually capitalized lowercase ("Corsa"). For
  // chips/headers we want the SCREAMING CASE form, so uppercase it.
  return v.toUpperCase();
}
