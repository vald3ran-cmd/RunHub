/**
 * RunHub Lab Edition — Design tokens
 * Single source of truth for colors, spacing, radius.
 * Estratto dal Style Guide ufficiale del 9 giu 2026.
 */

// ─── COLORI BRAND ────────────────────────────────────
export const brand = {
  primary: '#E85D04',       // Brand primary (call to action, logo)
  secondary: '#F97316',     // Hover, gradient end
  light: '#FFB183',         // Accent secondario
  subtle: '#FFF3E8',        // Brand background subtle (cards highlight)
  dark: '#C2410C',          // Pressed state
} as const;

// ─── COLORI SEMANTICI ─────────────────────────────────
export const semantic = {
  success: '#059669',       // Verde — recovery, PR, completato
  warning: '#D97706',       // Arancio attenzione — ramping, occhio
  danger: '#DC2626',        // Rosso — overload, errore
  info: '#2563EB',          // Blu — informativo, easy zone
} as const;

// ─── NEUTRI / SUPERFICI ───────────────────────────────
export const neutral = {
  background: '#F8FAFC',    // App background
  card: '#FFFFFF',          // Card primaria
  surfaceSoft: '#F1F5F9',   // Hover, separator
  border: '#E2E8F0',        // Border sottile
  divider: '#CBD5E1',       // Divider più visibile
} as const;

// ─── TESTO ─────────────────────────────────────────────
export const text = {
  primary: '#0F172A',       // Testo principale (slate-900)
  secondary: '#475569',     // Testo secondario
  muted: '#94A3B8',         // Caption, label muted
  disabled: '#CBD5E1',
  inverse: '#FFFFFF',       // Testo su fondo brand/scuro
} as const;

// ─── HR ZONES ─────────────────────────────────────────
export const hrZones = {
  z1: '#22C55E',  // Recupero (verde)
  z2: '#3B82F6',  // Aerobico (blu)
  z3: '#F59E0B',  // Soglia (ambra)
  z4: '#F97316',  // VO2max (arancione)
  z5: '#EF4444',  // Anaerobico (rosso)
} as const;

// ─── CHART LINES ──────────────────────────────────────
export const chart = {
  linePrimary: '#E85D04',
  lineSecondary: '#059669',
  lineTertiary: '#2563EB',
  grid: '#E2E8F0',
  axisLabel: '#647488',
  legend: '#475569',
  strokeWidth: 3,
  pointSize: 4,
  axisFontSize: 11,
  legendFontSize: 12,
} as const;

// ─── GRADIENT (per card hero) ──────────────────────────
export const gradient = {
  primary: ['#FF8A33', '#E85D04'] as const,
  soft: ['#FFF3E8', '#FFE7D6'] as const,
} as const;

// ─── SPACING (8px base) ───────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 48,
  monster: 64,
  // semantic
  marginApp: 20,
  paddingCard: 16,
  gapSection: 24,
  gapElement: 12,
} as const;

// ─── BORDER RADIUS ────────────────────────────────────
export const radius = {
  card: 20,
  button: 14,
  pill: 999,
  modal: 24,
  chip: 999,
  sm: 8,
  md: 12,
} as const;

// ─── SHADOW / ELEVATION ───────────────────────────────
export const shadow = {
  sm: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

// ─── TIPOGRAFIA ───────────────────────────────────────
// Inter Variable (UI/body) + JetBrains Mono Variable (numeri/data)
export const fontFamily = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  sansBlack: 'Inter_900Black',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
  monoSemiBold: 'JetBrainsMono_600SemiBold',
} as const;

export const typography = {
  // Hero metric — es. "82" Run Score
  heroMetric: {
    fontFamily: fontFamily.monoBold,
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -1.5,
  },
  // Section title — es. "ALLENAMENTI"
  sectionTitle: {
    fontFamily: fontFamily.sansBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  // KPI value — es. "74" Carico
  kpiValue: {
    fontFamily: fontFamily.monoSemiBold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  // KPI label — UPPERCASE small
  kpiLabel: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  // Body default
  body: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  // Body bold
  bodyBold: {
    fontFamily: fontFamily.sansBold,
    fontSize: 15,
    lineHeight: 22,
  },
  // Caption / micro
  caption: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 12,
    lineHeight: 16,
  },
  // Mono inline data — es. "5:29/km"
  monoInline: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  // Headline grande (es. valore singolo card)
  display: {
    fontFamily: fontFamily.monoBold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1,
  },
} as const;

// ─── TUTTO ASSIEME (per import diretto da componenti) ──
export const tokens = {
  brand,
  semantic,
  neutral,
  text,
  hrZones,
  chart,
  gradient,
  spacing,
  radius,
  shadow,
  fontFamily,
  typography,
} as const;

export default tokens;
