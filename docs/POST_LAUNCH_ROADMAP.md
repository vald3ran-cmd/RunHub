# 🚀 RunHub — Roadmap Post-Lancio

Documento di riferimento per features pianificate dopo il lancio v1.0 su App Store.

**Data lancio v1.0:** da confermare (aprile/maggio 2026)
**Ultimo aggiornamento:** 22 aprile 2026

---

## 📅 V1.1 — "Social & Accessibility" (target: 1-2 settimane dopo lancio)

Da iniziare ~1 settimana dopo il lancio ufficiale su App Store, dopo aver raccolto i primi feedback utenti.

### 🎯 Feature incluse

#### 1. 📸 Foto Profilo utente
- **Obiettivo:** permettere agli utenti di caricare foto profilo personalizzata
- **Stima:** 3-4 ore di lavoro
- **Tecnico:**
  - Backend: endpoint `POST /api/user/avatar` (upload base64 o file multipart con validazione formato/dimensione)
  - DB: campo `avatar_base64` o `avatar_url` (se CDN) sul documento users
  - Frontend: schermata edit-profile con `expo-image-picker` + `expo-image-manipulator` per crop e resize
  - Integrazione: mostrare avatar in profile, feed social (post + commenti), header home, badges screen
- **Edge case:** rimozione foto, formati supportati (jpg/png/heic), max size 5MB

#### 2. 🚶 Modalità Camminata standalone
- **Obiettivo:** espandere pubblico target (principianti, anziani, chi si riprende da infortuni)
- **Stima:** 5-7 ore di lavoro
- **Tecnico:**
  - Nuova schermata "Inizia Camminata" separata da "Inizia Corsa" in home
  - Modello session con `activity_type: "walk"` (vs "run")
  - 3-4 piani camminata per principianti (es. "Cammina 5K in 3 settimane")
  - Metriche adattate: calorie calcolate con MET walking (3.5 vs 8+ running), no "pace critico"
  - Badge/achievements dedicati camminata (es. "Camminatore della domenica", "10K a piedi")
  - Classificazione auto workout: velocità media < 6 km/h → walk, ≥ 6 km/h → run
- **UX:** l'app dovrebbe chiedere all'onboarding "Preferisci correre o camminare?" e mostrare pulsanti appropriati

#### 3. 🌍 Localizzazione Multilingua (EN + ES + IT)
- **Obiettivo:** allargare mercato a 80+ paesi dal day 1 v1.1
- **Stima:** 8-12 ore di lavoro
- **Tecnico:**
  - Setup `expo-localization` + `react-i18next`
  - File locale: `locales/it.json`, `locales/en.json`, `locales/es.json`
  - Refactor ~500-1000 stringhe hardcoded in ~20 schermate
  - Backend: prompt AI Coach adattivi per lingua utente (`user.locale` → prompt system in EN/IT/ES)
  - Legal website: versioni EN/ES di `/terms`, `/privacy`, `/support`
  - App Store Connect: metadata localizzati per IT, EN, ES (descrizione, keyword, screenshot caption)
- **Strategia:** device language auto-detect + override manuale in Settings

#### 4. 🗺️ Mappa interattiva nel report sessione (workout summary)
- **Obiettivo:** sostituire l'attuale linea SVG schematica con una vera mappa Mapbox tileata nel report post-corsa
- **Stima:** 2-3 ore di lavoro
- **Stato attuale:**
  - In `app/workout/[id].tsx` c'è il componente `Route` che plotta le coordinate GPS come `<Polyline>` SVG dentro un box grigio (linea rossa su sfondo scuro)
  - Funziona ma non mostra strade/quartieri/landmark — utente non riconosce dove ha corso
- **Da implementare:**
  - Sostituire `<Svg><Polyline .../></Svg>` con `<MapView>` (`react-native-maps` + Mapbox tiles) già usato in `run-active.tsx` per il live tracking
  - Bounds auto-fit su percorso (calcolo min/max lat/lng già fatto nel codice esistente, va solo passato a `fitToCoordinates`)
  - **Marker verde di partenza** (primo coord)
  - **Marker rosso rosso di arrivo** (ultimo coord)
  - **Polyline rossa del tracciato**
  - Pulsante per passare da vista "Street" a "Satellite" (opzionale, usa stesso Mapbox)
  - Tap sulla mappa → fullscreen modal con mappa grande + pan/zoom
- **Vantaggi utente:**
  - Riconosce il percorso ("ah, sono passato per Piazza Duomo!")
  - Condivide più volentieri il workout sui social (mappa bella → post più virali)
  - Confronta percorsi diversi ("stesso giro ma percorso più largo")
- **Nota:** i dati sono **già tutti salvati nel backend** (campo `route: [{lat, lng, timestamp}]` della session), quindi niente modifiche DB — è puro lavoro frontend

---

## 📅 V1.2 — "Stretching & Wellness" (target: 6-8 settimane dopo lancio)

Feature più grande che richiede più preparazione.

### 🎯 Libreria Stretching Completa
- **Obiettivo:** trasformare gli step "stretching" da timer generici a sessioni guidate con esercizi specifici
- **Stima:** 15-25 ore di lavoro
- **Tecnico:**
  - Nuova collection `stretching_exercises`: {id, name, description, muscle_groups, difficulty, duration_default, gif_url, instructions, tips}
  - ~40-60 esercizi standard con istruzioni passo-passo
  - UI: durante step "stretching" del piano, mostrare sequenza esercizi con timer individuale (es. 30s per lato)
  - AI Coach: generare sequenze adattive (es. "dopo lunga distanza → focus su bicipite femorale e polpacci")
- **Asset:**
  - 40-60 GIF animate o illustrazioni → fonti possibili: Lottie Files, Mixamo, librerie CC
  - Budget potenziale per illustrazioni commissionate o asset a pagamento (~€100-300)
- **Delivery:**
  - Fase 1: testo + icona statica per ogni esercizio (MVP)
  - Fase 2: GIF animate (upgrade successivo)

### 🎯 Ginnastica da camera
- Stesso pattern dello stretching ma con esercizi di rinforzo (push-up, plank, squat, lunges...)
- ~20-30 esercizi
- Stima: +5-10 ore aggiuntive

---

## 📅 Backlog v1.3+ (da valutare in base a feedback utenti)

- [ ] Refactor backend: `server.py` (>2400 righe) → router modulari (`/routes/auth.py`, `/routes/plans.py`, ecc.)
- [ ] Modal re-accettazione Termini/Privacy se documenti aggiornati
- [ ] Integrazione wearables avanzata (Apple Watch, Fitbit, Polar via HealthKit)
- [ ] Feed social: commenti thread + like su post
- [ ] Challenges settimanali tra amici
- [ ] Calcolatore VO2 max e soglia anaerobica
- [ ] Training load e RPE (perceived exertion)
- [ ] Offline mode completo (tracciamento corse senza internet)

---

## 📝 Note per il team

- **Priorità v1.1**: utenti chiedono principalmente foto profilo + camminata. Localizzazione è strategica per crescita.
- **Priorità v1.2**: lo stretching "generico" è un pain point attuale (utenti non sanno cosa fare durante quel tempo).
- Tutte le feature sopra devono rispettare compliance GDPR + Apple Guidelines 5.1.1 (data collection consent) già implementate in v1.0.
