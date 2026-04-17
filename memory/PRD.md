# RunHub — Product Requirements

## Vision
Running app in italiano con piani personalizzati (gratis + premium AI), GPS tracking live, traguardi giornalieri/settimanali/mensili.

## Stack
- **Frontend**: React Native Expo + expo-router (dark theme, sportive design)
- **Backend**: FastAPI + MongoDB (motor)
- **Auth**: JWT email/password (Bearer token + httpOnly cookie)
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key (piani premium)
- **Payments**: Stripe (sk_test_emergent) — abbonamento mensile €9.99 / annuale €79.99
- **GPS**: expo-location + SVG polyline route preview

## Core Features (MVP ✓)
1. **Auth**: register/login/logout, seeded admin premium
2. **Home**: progress rings (daily/weekly/monthly km) + quick stats
3. **Piani predefiniti** (gratis): Principiante 5K, Intermedio 10K, Esperto Mezza Maratona
4. **Step types**: warmup, run, recovery, sprint, walk, stretching, gymnastics (ginnastica da camera)
5. **AI Coach (premium)**: genera piano su misura da livello/obiettivo/giorni/settimane/minuti
6. **Run Libero**: GPS tracking con distanza, tempo, passo, calorie + polyline
7. **Allenamento guidato**: step-by-step con timer per ogni step del workout del piano
8. **Storico**: lista sessioni + dettaglio con percorso
9. **Profilo**: modifica traguardi personalizzati, upgrade premium, logout
10. **Stripe subscription**: mensile/annuale con polling status e upgrade idempotente

## Admin
- admin@runhub.com / admin123 (premium attivo)

## Next Enhancements
- Sign in with Apple + Google OAuth (richiede build nativo iOS/Android)
- Apple Pay / Google Pay come metodo di pagamento aggiuntivo
- Audio coaching durante la corsa
- Social / classifica amici
- Integrazione wearable (Apple Watch / Garmin)
