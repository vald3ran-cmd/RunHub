/**
 * Traduzione client-side per i contenuti che arrivano dal backend
 * in italiano hardcoded (piani, workout, step descriptions).
 *
 * Strategia: lookup nella mappa per locale corrente, fallback a italiano.
 * Le chiavi della mappa sono lowercase dell'italiano (case-insensitive).
 */

type Locale = 'it' | 'en' | 'es';

const MAP: Record<string, Record<Locale, string>> = {
  // ── PLAN TITLES ──────────────────────────────────────────
  'principiante — corri 5k': { it: 'Principiante — Corri 5K', en: 'Beginner — Run 5K', es: 'Principiante — Corre 5K' },
  'intermedio — 10k performance': { it: 'Intermedio — 10K Performance', en: 'Intermediate — 10K Performance', es: 'Intermedio — 10K Performance' },
  'esperto — mezza maratona': { it: 'Esperto — Mezza Maratona', en: 'Expert — Half Marathon', es: 'Experto — Media Maratón' },
  '5k sotto 30 minuti': { it: '5K sotto 30 minuti', en: '5K under 30 minutes', es: '5K bajo 30 minutos' },
  '10k competitivo': { it: '10K Competitivo', en: 'Competitive 10K', es: '10K Competitivo' },
  'mezza maratona performance': { it: 'Mezza Maratona Performance', en: 'Half Marathon Performance', es: 'Media Maratón Performance' },
  'maratona — 16 settimane': { it: 'Maratona — 16 settimane', en: 'Marathon — 16 weeks', es: 'Maratón — 16 semanas' },

  // ── PLAN DESCRIPTIONS ────────────────────────────────────
  'parti da zero e raggiungi i tuoi primi 5km in 4 settimane.': {
    it: 'Parti da zero e raggiungi i tuoi primi 5km in 4 settimane.',
    en: 'Start from scratch and run your first 5K in 4 weeks.',
    es: 'Empieza desde cero y alcanza tus primeros 5K en 4 semanas.',
  },
  'migliora tempi e resistenza per un 10k sotto i 55 minuti. include sessioni di ripetute e lunghi.': {
    it: 'Migliora tempi e resistenza per un 10K sotto i 55 minuti. Include sessioni di ripetute e lunghi.',
    en: 'Improve speed and endurance for a sub-55min 10K. Includes intervals and long runs.',
    es: 'Mejora tiempos y resistencia para un 10K bajo 55 minutos. Incluye series e intervalos largos.',
  },
  "programma avanzato per completare una mezza maratona in meno di 1h45. ripetute lunghe e corsa progressiva.": {
    it: "Programma avanzato per completare una mezza maratona in meno di 1h45. Ripetute lunghe e corsa progressiva.",
    en: "Advanced program to complete a half marathon under 1h45. Long intervals and progressive runs.",
    es: "Programa avanzado para completar una media maratón en menos de 1h45. Series largas y carrera progresiva.",
  },
  'piano 4 settimane per sfondare il muro dei 30 minuti sui 5k con tempo run e ripetute brevi.': {
    it: 'Piano 4 settimane per sfondare il muro dei 30 minuti sui 5K con tempo run e ripetute brevi.',
    en: '4-week plan to break the 30-minute barrier on 5K with tempo runs and short intervals.',
    es: 'Plan de 4 semanas para romper la barrera de los 30 minutos en 5K con tempo runs y series cortas.',
  },

  // ── COMMON WORKOUT TITLES ────────────────────────────────
  'tempo run 30\'': { it: "Tempo Run 30'", en: "30' Tempo Run", es: "Tempo Run 30'" },
  'ripetute 6x400m': { it: 'Ripetute 6x400m', en: '6x400m Intervals', es: 'Series 6x400m' },
  'lungo facile': { it: 'Lungo facile', en: 'Easy long run', es: 'Largo suave' },
  'progressivo 12k': { it: 'Progressivo 12K', en: 'Progressive 12K', es: 'Progresivo 12K' },
  'ripetute 5x1000m': { it: 'Ripetute 5x1000m', en: '5x1000m Intervals', es: 'Series 5x1000m' },

  // ── STEP DESCRIPTIONS (most common) ──────────────────────
  'corsa continua': { it: 'Corsa continua', en: 'Continuous run', es: 'Carrera continua' },
  'corsa continua facile': { it: 'Corsa continua facile', en: 'Easy continuous run', es: 'Carrera continua suave' },
  'corsa lunga lenta': { it: 'Corsa lunga lenta', en: 'Long slow run', es: 'Carrera larga lenta' },
  'tempo run a ritmo medio': { it: 'Tempo run a ritmo medio', en: 'Tempo run at medium pace', es: 'Tempo run a ritmo medio' },
  'recupero': { it: 'Recupero', en: 'Recovery', es: 'Recuperación' },
  'recupero attivo': { it: 'Recupero attivo', en: 'Active recovery', es: 'Recuperación activa' },
  'recupero trottato': { it: 'Recupero trottato', en: 'Jog recovery', es: 'Recuperación trotada' },
  'trotto recupero': { it: 'Trotto recupero', en: 'Recovery jog', es: 'Trote de recuperación' },
  'camminata': { it: 'Camminata', en: 'Walk', es: 'Caminata' },
  'jogging lento': { it: 'Jogging lento', en: 'Slow jogging', es: 'Trote lento' },
  'riscaldamento': { it: 'Riscaldamento', en: 'Warm-up', es: 'Calentamiento' },
  'riscaldamento progressivo': { it: 'Riscaldamento progressivo', en: 'Progressive warm-up', es: 'Calentamiento progresivo' },
  "camminata + mobilita'": { it: "Camminata + mobilità", en: "Walk + mobility", es: "Caminata + movilidad" },
  "riscaldamento + mobilita'": { it: "Riscaldamento + mobilità", en: "Warm-up + mobility", es: "Calentamiento + movilidad" },
  'ritmo medio': { it: 'Ritmo medio', en: 'Medium pace', es: 'Ritmo medio' },
  'ritmo gara': { it: 'Ritmo gara', en: 'Race pace', es: 'Ritmo de competencia' },
  'ritmo veloce': { it: 'Ritmo veloce', en: 'Fast pace', es: 'Ritmo rápido' },
  '400m veloce': { it: '400m veloce', en: '400m fast', es: '400m rápido' },
  '1000m forte': { it: '1000m forte', en: '1000m hard', es: '1000m fuerte' },
  'stretching completo': { it: 'Stretching completo', en: 'Full stretching', es: 'Estiramientos completos' },
  'stretching dinamico': { it: 'Stretching dinamico', en: 'Dynamic stretching', es: 'Estiramientos dinámicos' },
  'stretching defaticante': { it: 'Stretching defaticante', en: 'Cool-down stretching', es: 'Estiramientos de enfriamiento' },
  'stretching statico gambe': { it: 'Stretching statico gambe', en: 'Static leg stretching', es: 'Estiramientos estáticos piernas' },
  'stretching gambe e schiena': { it: 'Stretching gambe e schiena', en: 'Legs and back stretching', es: 'Estiramientos piernas y espalda' },
  'stretching + rullo': { it: 'Stretching + rullo', en: 'Stretching + foam roller', es: 'Estiramientos + rodillo' },
  'stretching + foam roller': { it: 'Stretching + foam roller', en: 'Stretching + foam roller', es: 'Estiramientos + foam roller' },
  'core: plank 3x30s, crunch 2x15': { it: 'Core: plank 3x30s, crunch 2x15', en: 'Core: plank 3x30s, crunch 2x15', es: 'Core: plank 3x30s, crunch 2x15' },
  'ginnastica da camera: squat 2x10, affondi 2x10': { it: 'Ginnastica da camera: squat 2x10, affondi 2x10', en: 'Home gym: squats 2x10, lunges 2x10', es: 'Gimnasia en casa: sentadillas 2x10, zancadas 2x10' },

  // ── WEEK TITLES ─────────────────────────────────────────
  'settimana 3 — consolidamento': { it: 'Settimana 3 — Consolidamento', en: 'Week 3 — Consolidation', es: 'Semana 3 — Consolidación' },
  'settimana 4 — 5k completo': { it: 'Settimana 4 — 5K Completo', en: 'Week 4 — Full 5K', es: 'Semana 4 — 5K Completo' },

  // ── COMMON ALL-CAPS LABELS (for stepTypeLabels fallback) ─
  'corsa': { it: 'Corsa', en: 'Run', es: 'Carrera' },
  'corsa 5k': { it: 'Corsa 5K', en: '5K run', es: 'Carrera 5K' },
  'corsa libera': { it: 'Corsa libera', en: 'Free run', es: 'Carrera libre' },
  'bici': { it: 'Bici', en: 'Bike', es: 'Bici' },
  'sprint': { it: 'Sprint', en: 'Sprint', es: 'Sprint' },
};

/**
 * Traduce una stringa italiana del backend nella locale richiesta.
 * Se la traduzione non è trovata, ritorna la stringa originale.
 */
export function tBackend(text: string, locale: string): string {
  if (!text) return text;
  if (locale === 'it') return text;
  const key = text.toLowerCase().trim();
  const entry = MAP[key];
  if (!entry) return text;
  const loc = (locale === 'en' || locale === 'es') ? locale : 'it';
  return entry[loc as Locale] || text;
}
