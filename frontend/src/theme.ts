// ─────────────────────────────────────────────────────────────
// RunHub Design System — Premium Dark Theme + Vibrant Orange
// Inspirato a Nike Run / Strava Premium
// ─────────────────────────────────────────────────────────────

export const colors = {
  // Base
  background: '#000000',           // pure black
  surface: '#161616',              // cards
  surfaceSecondary: '#1F1F1F',     // secondary surface
  surfaceElevated: '#1C1C1C',      // elevated cards

  // Brand — Vibrant Orange
  primary: '#FF6B1F',              // RunHub orange
  primaryHover: '#FF8543',
  primaryMuted: 'rgba(255,107,31,0.14)', // orange with alpha for icon bg
  primaryDark: '#E55A0F',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',

  // Borders / dividers
  border: '#262626',
  borderLight: '#1F1F1F',

  // Functional
  success: '#22C55E',
  successMuted: 'rgba(34,197,94,0.15)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245,158,11,0.15)',
  info: '#3B82F6',
  infoMuted: 'rgba(59,130,246,0.15)',
  danger: '#EF4444',

  // Progress
  progressTrack: '#262626',

  // Overlays
  overlay: 'rgba(0,0,0,0.55)',
  overlayStrong: 'rgba(0,0,0,0.75)',
  black: '#000000',
  white: '#FFFFFF',
};

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

// Shadow presets — sottili sul dark, glow arancione per CTA
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 4,
  },
  orange: {
    shadowColor: '#FF6B1F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
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
  run:  { label: 'CORSA',      shortLabel: 'Corsa',     color: '#FF6B1F', colorMuted: 'rgba(255,107,31,0.15)', kcalPerKm: 65 },
  walk: { label: 'CAMMINATA',  shortLabel: 'Camminata', color: '#22C55E', colorMuted: 'rgba(34,197,94,0.15)',  kcalPerKm: 50 },
  bike: { label: 'BICI',       shortLabel: 'Bici',      color: '#3B82F6', colorMuted: 'rgba(59,130,246,0.15)', kcalPerKm: 30 },
};

// ─────────────────────────────────────────────────────────────
// STEP TYPES (workout segments)
// ─────────────────────────────────────────────────────────────
export const stepTypeColors: Record<string, string> = {
  warmup: '#F59E0B',
  run: '#FF6B1F',
  recovery: '#22C55E',
  sprint: '#EF4444',
  walk: '#22C55E',
  bike: '#3B82F6',
  stretching: '#A855F7',
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
