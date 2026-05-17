// ─────────────────────────────────────────────────────────────
// RunHub Design System — Light Theme "RUNNA-inspired"
// Premium · Minimal · Clean
// ─────────────────────────────────────────────────────────────

export const colors = {
  // Base
  background: '#F5F6F8',          // soft light grey
  surface: '#FFFFFF',             // white card
  surfaceSecondary: '#F0F1F4',    // tint grey
  surfaceElevated: '#FFFFFF',     // elevated card

  // Brand
  primary: '#FF6B6B',             // coral soft
  primaryHover: '#FF5252',
  primaryMuted: '#FFE8E8',        // primary background tint
  primaryDark: '#E85555',

  // Text
  textPrimary: '#0F1115',         // near-black
  textSecondary: '#5C6270',
  textMuted: '#9AA0AB',

  // Borders / dividers
  border: '#E5E7EB',
  borderLight: '#F0F1F4',

  // Functional
  success: '#10B981',
  successMuted: '#D1FAE5',
  warning: '#F59E0B',
  warningMuted: '#FEF3C7',
  info: '#3B82F6',
  infoMuted: '#DBEAFE',
  danger: '#EF4444',

  // Progress
  progressTrack: '#EDEFF3',

  // Dark accents (per testo su immagini hero)
  overlay: 'rgba(15,17,21,0.45)',
  overlayStrong: 'rgba(15,17,21,0.65)',
  black: '#0F1115',
  white: '#FFFFFF',
};

export const fonts = {
  heading: 'System',
  body: 'System',
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const radius = {
  sm: 8, md: 14, lg: 18, xl: 24, xxl: 32, pill: 999,
};

// Shadow presets — sottili, premium
export const shadows = {
  sm: {
    shadowColor: '#0F1115',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F1115',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  lg: {
    shadowColor: '#0F1115',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
};

// Typography presets
export const typography = {
  // Display (eyecatcher)
  displayLg: { fontSize: 36, fontWeight: '900' as const, letterSpacing: -1 },
  displayMd: { fontSize: 28, fontWeight: '900' as const, letterSpacing: -0.6 },
  // Heading
  h1: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.4 },
  h2: { fontSize: 20, fontWeight: '800' as const, letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: '700' as const },
  // Body
  body: { fontSize: 15, fontWeight: '500' as const },
  bodyStrong: { fontSize: 15, fontWeight: '700' as const },
  small: { fontSize: 13, fontWeight: '500' as const },
  // Eyebrow / caps label
  eyebrow: { fontSize: 11, fontWeight: '800' as const, letterSpacing: 1.5 },
  micro: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 1 },
};

// ─────────────────────────────────────────────────────────────
// ACTIVITY TYPES — Run, Walk, Bike (preparazione futura)
// ─────────────────────────────────────────────────────────────
export type ActivityType = 'run' | 'walk' | 'bike';

export const activityMeta: Record<ActivityType, {
  label: string;
  shortLabel: string;
  color: string;
  colorMuted: string;
  // moltiplicatore kcal indicativo per km (peso 70kg)
  kcalPerKm: number;
}> = {
  run:  { label: 'CORSA',      shortLabel: 'Corsa',     color: '#FF6B6B', colorMuted: '#FFE8E8', kcalPerKm: 65 },
  walk: { label: 'CAMMINATA',  shortLabel: 'Camminata', color: '#10B981', colorMuted: '#D1FAE5', kcalPerKm: 50 },
  bike: { label: 'BICI',       shortLabel: 'Bici',      color: '#3B82F6', colorMuted: '#DBEAFE', kcalPerKm: 30 },
};

// ─────────────────────────────────────────────────────────────
// STEP TYPES (workout segments)
// ─────────────────────────────────────────────────────────────
export const stepTypeColors: Record<string, string> = {
  warmup: '#F59E0B',
  run: '#FF6B6B',
  recovery: '#10B981',
  sprint: '#EF4444',
  walk: '#10B981',
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
