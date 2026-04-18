# RunHub — Product Requirements (v2)

## Vision
Running app in italiano con piani personalizzati, GPS tracking live, traguardi e 4 tier di abbonamento (Free/Starter/Performance/Elite).

## Stack
- **Frontend**: React Native Expo + expo-router (dark theme, sportive design)
- **Backend**: FastAPI + MongoDB (motor)
- **Auth**: JWT email/password (Bearer + httpOnly cookie)
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key (Performance+)
- **Payments**: Stripe (test key) — 6 SKU (3 tier × monthly/yearly)
- **GPS**: expo-location + SVG polyline

## Tier Structure

| Tier | Nome | €/mese | €/anno | Target |
|---|---|---|---|---|
| Free | Corri | 0 | 0 | Runner occasionali |
| Starter | Allenati | 4.99 | 39.99 | Principianti |
| Performance | Competi | 8.99 | 79.99 | Runner seri |
| Elite | Coach | 14.99 | 129.99 | Coach pro |

## Features by Tier

### Free
- GPS tracking illimitato, mappa polyline
- 10 corse nello storico
- Cronologia base

### Starter (+ Free)
- Storico illimitato
- 2 piani base (5K principiante, 10K intermedio)
- Sync cloud backup

### Performance (+ Starter)
- 7+ piani avanzati (5K sub30, 10K competitivo, Mezza, Maratona, Trail, Progressione, Mezza Performance)
- **AI Coach**: piani personalizzati (Claude Sonnet 4.5)
- **Proiezione tempi gara** (formula Riegel)
- **Stima VO2max** (formula Jack Daniels)
- Statistiche settimanali

### Elite (+ Performance)
- **Coach Dashboard**: gestione fino a 10 atleti
- Invito/rimozione atleti
- Supporto prioritario (placeholder)

## Step Types
warmup, run, recovery, sprint, walk, **stretching**, **gymnastics** (ginnastica da camera)

## Admin
- `admin@runhub.com / admin123` — tier `elite` a vita (3650 giorni)

## Test Results
- Iteration 1: 18/22 backend + 100% frontend
- Iteration 2: **21/21 backend + 100% frontend** ✅

## Next Possible Enhancements
- Export GPX/FIT/CSV (Performance tier)
- Grafici mensili interattivi (pace/km/tempo)
- Sync wearables (Apple HealthKit, Google Fit, Garmin) — richiede build nativo
- Heatmap percorsi con Mapbox/Google Maps (richiede API key + subscription)
- Zone cardio reali (richiede wearable per HR data)
- Sign in with Apple (richiede build nativo iOS)
- Audio coach vocale durante workout (TTS OpenAI)
- Social / classifica amici
- Sfide e achievement con badge
