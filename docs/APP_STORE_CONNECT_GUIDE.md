# 📱 Guida Completa App Store Connect — Submission RunHub v1.0

Guida passo-passo per compilare tutte le sezioni di App Store Connect necessarie per la review Apple della prima versione di RunHub.

**Tempo stimato totale:** 2-4 ore (incluso preparazione asset)
**Data:** aprile 2026
**Bundle ID:** `com.runhub.app`
**ASC App ID:** `6762896494`

---

## 🗺️ Panoramica del flusso

```
PREP       →  Asset prep (screenshot, icon, testi)    ~1h
FASE 1     →  App Information (info base)              ~15 min
FASE 2     →  Pricing & Availability                   ~5 min
FASE 3     →  Versione 1.0 - metadata completi        ~30 min
FASE 4     →  App Privacy (dichiarazione dati)        ~20 min
FASE 5     →  Age Rating (questionario)                ~10 min
FASE 6     →  Submission Apple Review                  ~10 min
POST       →  Attesa review Apple                      24-72h
```

---

## 🧰 FASE PREP — Preparazione asset (prima di aprire App Store Connect)

### P.1 Screenshot iPhone

Apple richiede **minimo 3 screenshot** per una dimensione obbligatoria. Consigliato: 6-8 screenshot per massima conversione.

#### Dimensioni obbligatorie (2026):
- **iPhone 6.7"** (iPhone 15 Pro Max, 14 Pro Max, etc.): **1290 x 2796 px** portrait
- **iPhone 6.5"** (iPhone 11 Pro Max, 8 Plus): **1284 x 2778 px** portrait (backward compat)
- *Optional*: iPad 12.9" (2048 x 2732 px) se supporterai iPad

#### Come generare screenshot

**Opzione A — iPhone fisico (consigliato):**
1. Installa TestFlight build su tuo iPhone 15 Pro/Max
2. Esegui azioni nell'app e fai screenshot (Volume Up + Power)
3. AirDrop → Mac → converti in 1290x2796 se serve

**Opzione B — Simulatore iOS (più veloce, senza iPhone):**
1. Apri Xcode → Window → Simulator
2. Crea simulatore iPhone 15 Pro Max (6.7")
3. Esegui app sul simulatore (TestFlight build installabile no, serve build dev o runtime)
4. Cmd+S nel simulatore → salva screenshot automatico con giuste dimensioni
5. Ripeti per simulatore iPhone 11 Pro Max (6.5")

**Opzione C — Mockup generati (più veloce):**
- Usa [Screenshots.pro](https://screenshots.pro) o [Previewed](https://previewed.app) per creare mockup professionali
- Carichi screenshot sorgente, il tool genera versioni con cornice iPhone e testi marketing

#### Suggerimenti su QUALI schermate mostrare (ordine consigliato)
1. **Hero / Home** — "Traccia le tue corse con AI"
2. **GPS Tracking attivo** — mappa con percorso + metriche (distanza, pace)
3. **AI Coach** — piano settimanale personalizzato
4. **Feed Social** — utenti che condividono corse
5. **Badges / Achievements** — gamification
6. **Heatmap** — mappa globale delle corse
7. **Stats** — grafici progressi
8. *(optional)* Paywall — piani premium (se non ha disclaimer strani)

#### Testi sovrimpressi (opzionali, consigliati)
Aggiungi testi brevi tipo:
- "Traccia le tue corse in tempo reale"
- "AI Coach personalizzato"
- "Unisciti alla community dei runner"

Tool per aggiungere testi: [Screenshots.pro](https://screenshots.pro), [AppMockUp](https://app-mockup.com), Figma, Photoshop.

---

### P.2 App Icon 1024x1024

**Requisiti rigidi Apple:**
- Dimensione: **esattamente 1024 x 1024 px**
- Formato: **PNG, senza trasparenza, senza bordi rotondi** (Apple li aggiunge automaticamente)
- No testo piccolo (illeggibile su dimensioni ridotte)
- No elementi che simulano elementi iOS (tipo hamburger menu, notifiche)

**Già presente:** `/app/frontend/assets/images/icon.png` (da verificare che sia 1024x1024).

**Verifica dimensione:**
```bash
cd ~/Desktop/RunHub/frontend
file assets/images/icon.png
# Se NON è 1024x1024, ridimensiona con Preview.app (Mac) o Photoshop
```

---

### P.3 Testi di marketing (draft in anticipo)

Prepara questi testi in un file di testo prima di iniziare. Sono più facili da curare con calma che dentro i form App Store.

#### 📝 Nome (30 caratteri max)
**Proposta:** `RunHub`

#### 📝 Subtitle (30 caratteri max, SEO-friendly)
**Proposta:** `AI Coach Running & Corsa`

Altre opzioni:
- `Piani Corsa Personalizzati`
- `Tracker GPS con AI Coach`
- `Allenamento Running Smart`

#### 📝 Descrizione app (4000 caratteri max, markdown limitato)
**Bozza:**

```
🏃 RunHub è il tuo compagno di corsa personale alimentato da intelligenza artificiale.

Dal tuo primo km al tuo primo 10K, RunHub ti guida con piani personalizzati creati su misura dal nostro AI Coach. Basato sulla tua età, obiettivi e livello, ti accompagna in ogni passo con la tecnologia più avanzata.

━━━━━━━━━━━━━━━━━━━━

✨ COSA PUOI FARE:

📍 GPS TRACKING IN TEMPO REALE
Traccia ogni corsa con precisione: percorso su mappa, distanza, velocità, ritmo, calorie, dislivello.

🤖 AI COACH PERSONALIZZATO
Crea piani d'allenamento su misura per il tuo livello:
• Da zero a 5K in 4 settimane
• Migliora il tuo 10K
• Prepara una mezza maratona
• Allenamento libero personalizzato

🎯 STEP DIVERSIFICATI
Ogni piano include:
• Riscaldamento progressivo
• Corsa a ritmi diversi (easy, tempo, sprint)
• Recupero attivo (camminata, jogging leggero)
• Stretching guidato
• Ginnastica da camera

📊 ANALISI PROGRESSI
Grafici dettagliati di distanza, velocità, frequenza, cumulativi settimanali e mensili.

🗺️ HEATMAP GLOBALE
Scopri i percorsi più popolari della tua zona. Trova nuove strade dove correre.

🏆 BADGE E ACHIEVEMENT
Sblocca 20+ traguardi: primo km, primo 5K, 10 corse consecutive, streak settimanali.

👥 FEED SOCIAL
Segui altri runner, condividi i tuoi percorsi, commenta e ispira la community.

🎧 COACH AUDIO
Indicazioni vocali personalizzate durante la corsa (TTS ita/eng).

⌚ INTEGRAZIONE HEALTH
Sincronizzazione automatica con Apple Health: passi, distanza, calorie, frequenza cardiaca.

━━━━━━━━━━━━━━━━━━━━

💎 PIANI PREMIUM
• **Free** — 10 corse in storico, pubblicità leggere
• **Starter €4.99/mese** — Storico illimitato, zero pubblicità
• **Performance €9.99/mese** — + AI Coach avanzato, piani illimitati, heatmap
• **Elite €14.99/mese** — Tutto + analisi avanzate, supporto prioritario

━━━━━━━━━━━━━━━━━━━━

🔐 PRIVACY FIRST
• Conforme GDPR
• I tuoi dati di localizzazione restano sul tuo dispositivo
• Esportazione dati completa in qualsiasi momento
• Diritto all'oblio: elimina account e tutti i dati in un click

━━━━━━━━━━━━━━━━━━━━

🏃‍♀️ Pronto a iniziare?
Scarica RunHub oggi e trasforma ogni corsa in un passo verso il tuo obiettivo.

Hai domande? Scrivici a support@apprunhub.com
Scopri di più: https://apprunhub.com
```

#### 📝 Keywords (100 caratteri max, separate da virgola SENZA spazi)
**Proposta:**
```
corsa,running,jogging,allenamento,gps,tracker,fitness,coach,ai,piano,maratona,10k,5k,correre,atletica
```

Ricerche suggerite (studiatele su App Store IT):
- corsa (alto volume)
- running (alto volume)
- allenamento fitness (medio)
- coach corsa (medio, meno competitivo)
- fitness gps (medio)

#### 📝 Testo promozionale (170 caratteri max, visibile senza scroll)
**Proposta:**
```
🆕 RunHub v1.0 è qui! Il tuo AI Coach personale per correre meglio. Tracciamento GPS preciso, piani su misura, community di runner. Inizia gratis.
```

#### 📝 What's New in This Version (per v1.0)
**Proposta:**
```
Benvenuto su RunHub! Questa è la nostra prima versione.

✨ Inizia a tracciare le tue corse con precisione GPS
🤖 Ottieni piani personalizzati dall'AI Coach
🏆 Sblocca badge e segui i tuoi progressi
👥 Unisciti alla community di runner italiani

Grazie per aver scelto RunHub. Buona corsa! 🏃‍♂️
```

#### 📝 Copyright
```
© 2026 Federico Bellucci. Tutti i diritti riservati.
```

#### 📝 URL importanti
- **Support URL:** `https://apprunhub.com/support`
- **Marketing URL:** `https://apprunhub.com` (opzionale)
- **Privacy Policy URL:** `https://apprunhub.com/privacy`

---

## 📂 FASE 1 — App Information (informazioni base app)

Accedi a [App Store Connect → RunHub → Informazioni sull'app](https://appstoreconnect.apple.com/apps/6762896494).

### 1.1 Informazioni localizzabili

#### Sezione: "Italian" (è la default)
| Campo | Valore |
|---|---|
| **Name** | `RunHub` |
| **Subtitle** | `AI Coach Running & Corsa` |
| **Privacy Policy URL** | `https://apprunhub.com/privacy` |
| **Category** | Primary: `Salute e benessere` (Health & Fitness) → Secondary: `Sport` |

### 1.2 Informazioni generali

| Campo | Valore |
|---|---|
| **Bundle ID** | `com.runhub.app` (già auto-compilato) |
| **SKU** | `RUNHUB001` (già compilato da te) |
| **Apple ID** | `6762896494` (già assegnato) |
| **Primary Language** | Italian (Italy) |
| **License Agreement** | Apple's Standard License Agreement (default OK) |
| **Content Rights** | ✅ Spunta "Contains, shows, or accesses third-party content" **SOLO SE** usi mappe di terze parti (nel nostro caso Mapbox, quindi SÌ) |

### 1.3 Age Rating
Ti rimanderemo alla Fase 5 per questo (è un questionario dedicato).

**Save** e procedi.

---

## 💰 FASE 2 — Pricing and Availability (Prezzo e disponibilità)

Menu laterale → **Pricing and Availability** (Prezzo e disponibilità).

### 2.1 Price Schedule
| Campo | Valore |
|---|---|
| **Price** | **Free** (Gratuito) — perché la tua app è free-to-download con IAP |

### 2.2 Availability
**Scelte possibili:**

- 🟢 **Ricommended**: Spunta **"Made available in all countries or regions"** (tutti i paesi) — nessun motivo per limitare, Apple gestisce le restrizioni geografiche legali automaticamente

- 🟡 **Alternative**: Solo Italia in v1.0, poi espandi in v1.1 (se vuoi partire con mercato noto prima)

**Consiglio:** vai con "tutti i paesi" per massimizzare reach. L'app è in italiano ma utenti italofoni all'estero la troveranno.

### 2.3 App Distribution Methods
- ✅ **App Store** (standard, distribuzione pubblica)
- ❌ Altri tipi di distribuzione (B2B, Education) — NON selezionare

**Save** e procedi.

---

## 📝 FASE 3 — Versione 1.0 - Preparazione metadata

Menu laterale → **1.0 Prepare for Submission** (1.0 In preparazione per l'invio).

Questa è la sezione più grande. Tutti i campi sono per la versione 1.0.

### 3.1 Preview e screenshot

#### iPhone 6.7" Display (OBBLIGATORIO)
1. Clicca **"+ Add Media"** o trascina i file
2. Carica i **3-10 screenshot** 1290x2796 preparati
3. Riordina con drag se necessario (il primo è il più importante → "hero shot")

#### iPhone 6.5" Display (OBBLIGATORIO per compatibilità)
Ripeti con i file 1284x2778.

#### iPad 12.9" e 11" Display (SKIP se non supporti iPad nativamente)
Nel tuo app.json hai `"supportsTablet": true`, quindi tecnicamente l'app gira su iPad, ma **se non hai screenshot iPad** puoi:
- Opzione A: preparare screenshot iPad anche (1-2 ore extra)
- Opzione B: Lasciare `supportsTablet: false` in app.json (nuova build) → App funziona solo iPhone ma elimini requisito

**Consiglio v1.0:** mantieni iPhone-only. Cambia a false `supportsTablet` nella prossima build:
```bash
# Nel tuo Mac, nel file app.json modifica:
"ios": {
  "supportsTablet": false,  <-- da true a false
  ...
}
```

### 3.2 Promotional Text (Testo promozionale)
Incolla il testo preparato nella prep (~170 caratteri).

### 3.3 Description (Descrizione)
Incolla il testo lungo preparato (~2500 caratteri usati su 4000 max).

### 3.4 Keywords (Parole chiave)
Incolla: `corsa,running,jogging,allenamento,gps,tracker,fitness,coach,ai,piano,maratona,10k,5k,correre,atletica`

### 3.5 Support URL
`https://apprunhub.com/support`

### 3.6 Marketing URL (opzionale)
`https://apprunhub.com`

### 3.7 Version (Versione)
`1.0`

### 3.8 Copyright
`© 2026 Federico Bellucci. Tutti i diritti riservati.`

### 3.9 Trade Representative Contact Information (solo per alcuni paesi EU)
**Richiesto da EU Digital Services Act:**
- **First Name**: Federico
- **Last Name**: Bellucci
- **Address**: [il tuo indirizzo]
- **City**: [tua città]
- **State/Province**: [tua provincia]
- **Post Code**: [CAP]
- **Country**: Italy
- **Phone Number**: [tuo numero]
- **Email**: `info@apprunhub.com`

✅ Spunta **"Display trade representative contact info on the App Store"**

### 3.10 Build (CRITICAL)
Clicca **"+ Select a Build"** → scegli la build già uploadata (quella di TestFlight, v1.0 build N).

⚠️ **Attenzione:** Se hai fatto rebuild dopo l'aggiunta di complete-profile + RevenueCat real keys, **DEVI selezionare la build PIÙ NUOVA**, non quella del primo upload.

### 3.11 General App Information

**App Icon**: dovrebbe essere auto-popolato dal bundle. Se appare vuoto, carica manualmente `icon.png` 1024x1024.

### 3.12 App Review Information (istruzioni per i reviewer Apple)

Qui Apple ti chiede info per permettere ai reviewer di testare l'app.

#### Sign-in required?
- ✅ **Yes, sign-in is required**

#### Demo Account
Fornisci un account funzionante per il reviewer:
- **Username**: `test1@runhub.com`
- **Password**: `test123`

*(Oppure `admin@runhub.com` / `admin123` se preferisci dargli accesso premium per testare tutte le feature)*

#### Contact Information
- **First Name**: Federico
- **Last Name**: Bellucci
- **Phone Number**: [tuo numero]
- **Email**: [tua email dev]

#### Notes (CRITICAL — dai info chiave al reviewer!)

**Testo consigliato:**

```
Gentile Reviewer,

grazie per il tempo dedicato alla review di RunHub.

INFORMAZIONI UTILI PER IL TEST:

1. ACCOUNT DI TEST FORNITO:
   - Email: test1@runhub.com
   - Password: test123
   (Account standard con funzionalità free tier)

   Per testare feature premium:
   - Email: admin@runhub.com
   - Password: admin123

2. FUNZIONALITÀ PRINCIPALI:
   - GPS Tracking: richiede autorizzazione Localizzazione "Sempre"
   - AI Coach: genera piani personalizzati (backend OpenAI/Claude)
   - Social Feed: richiede login
   - Paywall: attualmente senza prodotti IAP configurati
     (saranno aggiunti in v1.1, configurazione store-side)

3. CONFORMITÀ GDPR:
   - Flusso registrazione include validazione età minima 14 anni
     (normativa italiana D.Lgs. 101/2018)
   - Consenso esplicito a Termini + Privacy obbligatorio
   - Utenti OAuth (Google/Apple) vengono reindirizzati a schermata
     di completamento profilo per acquisire DOB + consensi
   - Esportazione dati disponibile in Account > Esporta i miei dati
   - Eliminazione account e dati in Account > Elimina Account

4. URL LEGALI:
   - Termini di Servizio: https://apprunhub.com/terms
   - Privacy Policy: https://apprunhub.com/privacy
   - Supporto: https://apprunhub.com/support

5. DATI RACCOLTI (vedi Nutrition Label):
   - Email, nome, età (per età minima)
   - Localizzazione durante tracking corsa (on-device)
   - Metriche allenamento (distanza, tempo, calorie)
   - Nessun dato di localizzazione è condiviso con terze parti
     se non in forma aggregata e anonima (heatmap)

6. AMBIENTE TECNICO:
   - Backend: FastAPI + MongoDB, hosting su apprunhub.com
   - Frontend: Expo React Native
   - AI: Claude 3.5 Sonnet via Anthropic API

Sono disponibile via email per qualsiasi chiarimento in tempi rapidi.

Cordiali saluti,
Federico Bellucci
info@apprunhub.com
```

### 3.13 Version Release (Rilascio versione)

**3 opzioni:**

- 🟢 **Automatically release this version** — appena approvata, pubblicata immediatamente (consigliato v1.0)
- 🟡 **Manually release** — dopo approvazione, tu clicchi "Release" quando vuoi (utile per coordinare marketing)
- 🔴 **Scheduled release** — fissa data futura (max 30 giorni dopo approvazione)

**Consiglio v1.0:** **Manual release**. Così se Apple approva alle 3 di notte, non pubblica nel peggior momento. Tu pubblichi quando sei pronto.

---

## 🔐 FASE 4 — App Privacy (dichiarazione dati)

Menu laterale → **App Privacy**.

Questa è la sezione più delicata. Apple rifiuta app con dichiarazioni privacy sbagliate.

### 4.1 Privacy Policy URL
Già inserito: `https://apprunhub.com/privacy`.

### 4.2 Data Collection Practices (questionario dettagliato)

Per ogni tipologia di dato che raccogli, dichiara:
1. **Se lo raccogli**
2. **Se lo usi per tracking** (definizione Apple: usato per profilazione cross-app o cross-web)
3. **Se è collegato all'identità dell'utente**

#### ✅ Dati che RunHub raccoglie

**1. Contact Info → Email Address**
- ☑️ Collected: YES
- ☑️ Linked to user: YES
- ☐ Used for tracking: NO
- **Purposes**: App Functionality, Account Management

**2. Contact Info → Name**
- ☑️ Collected: YES (durante registrazione)
- ☑️ Linked to user: YES
- ☐ Used for tracking: NO
- **Purposes**: App Functionality

**3. Health & Fitness → Health**
- ☑️ Collected: YES (se abilita Apple Health)
- ☑️ Linked to user: YES
- ☐ Used for tracking: NO
- **Purposes**: App Functionality (tracking passi, calorie, frequenza cardiaca)

**4. Health & Fitness → Fitness**
- ☑️ Collected: YES (distanza, corse, allenamenti)
- ☑️ Linked to user: YES
- ☐ Used for tracking: NO
- **Purposes**: App Functionality, Analytics

**5. Location → Precise Location**
- ☑️ Collected: YES (durante tracking GPS)
- ☑️ Linked to user: YES (associato all'account)
- ☐ Used for tracking: NO
- **Purposes**: App Functionality (tracciamento percorso)

**6. Location → Coarse Location**
- ☑️ Collected: YES (per heatmap anonima)
- ☐ Linked to user: NO (anonimizzata per heatmap)
- ☐ Used for tracking: NO
- **Purposes**: Analytics (heatmap globale)

**7. Sensitive Info → Other sensitive info: Date of Birth**
- ☑️ Collected: YES (per validazione età 14+)
- ☑️ Linked to user: YES
- ☐ Used for tracking: NO
- **Purposes**: App Functionality (compliance età minima)

**8. User Content → Photos or Videos**
- ☐ Collected: NO (non ancora, v1.1 sì con foto profilo)

**9. Identifiers → User ID**
- ☑️ Collected: YES (user_id interno)
- ☑️ Linked to user: YES
- ☐ Used for tracking: NO
- **Purposes**: App Functionality

**10. Identifiers → Device ID**
- ☑️ Collected: YES (via RevenueCat per IAP attribution + AdMob)
- ☑️ Linked to user: YES (via RevenueCat)
- ⚠️ Used for tracking: YES (**se usi AdMob**)
- **Purposes**: Advertising (AdMob free tier), Purchases (RevenueCat)

**11. Usage Data → Product Interaction**
- ☑️ Collected: YES (analytics basic su feature usage)
- ☑️ Linked to user: YES
- ☐ Used for tracking: NO
- **Purposes**: Analytics

**12. Diagnostics → Crash Data**
- ☑️ Collected: YES (via Expo/Sentry se configurato)
- ☐ Linked to user: NO
- ☐ Used for tracking: NO
- **Purposes**: App Functionality

### 4.3 ⚠️ Attenzione alle domande "Used for Tracking"

Apple definisce "tracking" come:
> Usare dati dell'utente per pubblicità o altre funzioni che combinano dati di tue app/siti con dati di altre parti.

Nel tuo caso:
- **AdMob su free tier** → SÌ, è tracking (Google Ads combina dati)
- **RevenueCat** → tecnicamente NO (attribution interna, non ads network)

Se dichiari "Used for Tracking: YES" su Device ID, **App Tracking Transparency (ATT)** verrà triggerato e l'utente vedrà il popup "Consenti RunHub a tracciarti?". Assicurati che nel codice sia già implementato `requestTrackingPermissionsAsync` (lo è, già nell'app.json con NSUserTrackingUsageDescription).

---

## 🎚️ FASE 5 — Age Rating (classificazione età)

Menu laterale → **Age Rating** (è dentro "App Information" solitamente).

Clicca **"Set Age Rating"** → risponderai a un questionario.

### Risposte consigliate per RunHub:

| Domanda | Risposta |
|---|---|
| Violence - Cartoon or Fantasy | None |
| Violence - Realistic | None |
| Prolonged Graphic or Sadistic Realistic Violence | No |
| Profanity or Crude Humor | None |
| Mature/Suggestive Themes | None |
| Horror/Fear Themes | None |
| Medical/Treatment Information | None |
| Alcohol, Tobacco, or Drug Use | None |
| Simulated Gambling | No |
| Sexual Content or Nudity | None |
| Graphic Sexual Content or Nudity | No |
| Unrestricted Web Access | **No** (no web browsers integrati) |
| Gambling and Contests | No |

**Risultato atteso**: **4+ (suitable for all ages)** ✅

---

## 📤 FASE 6 — Submission per Review

### 6.1 Check finale prima di submit

Assicurati che **TUTTO** sia verde nella colonna di destra della dashboard 1.0:

- ✅ Screenshots caricati
- ✅ Promotional Text
- ✅ Description
- ✅ Keywords
- ✅ URLs (Support, Privacy)
- ✅ Copyright
- ✅ Build selezionata
- ✅ App Icon
- ✅ App Review Information compilato
- ✅ Version Release setting
- ✅ App Privacy dichiarata
- ✅ Age Rating impostato

### 6.2 Submit for Review

In alto a destra clicca **"Add for Review"** o **"Submit for Review"**.

Risponderai ad altre 2-3 domande standard:

#### Export Compliance
- *"Does your app use encryption?"*
- **No** (abbiamo già impostato `ITSAppUsesNonExemptEncryption: false` in app.json)

#### Content Rights
- *"Does your app contain, display, or access third-party content?"*
- **Yes** — Mapbox (mappe), OpenAI/Claude (AI Coach)
- Quando chiesto, conferma che hai i diritti d'uso (API keys commerciali = OK)

#### Advertising Identifier (IDFA)
- *"Does this app use the Advertising Identifier (IDFA)?"*
- **Yes** (usiamo AdMob)
- Seleziona usi: **Serve advertisements within the app**
- Aggiungi: **✅ I confirm this app complies with App Tracking Transparency requirements**

### 6.3 Conferma

Clicca **"Submit"** → ti appare popup di conferma.

**Status cambia da:**
- `Prepare for Submission` → `Waiting for Review`

---

## ⏳ FASE POST — Cosa aspettarti

### Timeline tipica
| Fase | Tempo |
|---|---|
| Waiting for Review | 24-72 ore |
| In Review | 1-48 ore (review attivo) |
| Pending Developer Release (se hai scelto "Manual") o Processing | 0-2 ore |
| **Ready for Sale** (pubblicato) | ✅ FATTO |

### Comunicazioni da Apple

Apple ti manda email a ogni cambio di stato:
- 📧 *"Your submission is being reviewed"*
- 📧 *"Your submission has been approved"* ← **OBIETTIVO!**
- 📧 *"Your submission has been rejected"* ← non spaventarti, è normale

### Se viene rifiutata (Metadata Rejection è il più comune)

Motivi più frequenti + fix:
1. **Screenshots non mostrano funzionalità principali** → aggiungi screenshot più rappresentativi
2. **Description troppo vaga** → arricchisci con dettagli concreti
3. **Demo account non funziona** → verifica che `test1@runhub.com` + password siano attivi
4. **Privacy Policy manca di sezione X** → aggiungi su apprunhub.com/privacy
5. **App Privacy Label inconsistente con codice reale** → fai corrispondere con quello che fai davvero
6. **Feature mancante dalle screenshot** → non promettere cose che non ci sono

**Non spaventarti**: un rifiuto è normale anche su app ben fatte. Apple è rigorosa. Risolvi i punti, risubmit, ottieni approvazione in 24h.

---

## 📋 Checklist finale stampabile

### PRIMA di iniziare:
- [ ] Build iOS uploaded to App Store Connect
- [ ] Build PROCESSED (non Processing) — email da Apple
- [ ] Screenshot 1290x2796 pronti (min 3)
- [ ] Screenshot 1284x2778 pronti (min 3)
- [ ] App Icon 1024x1024 PNG no-alpha verificato
- [ ] Description italiana finalizzata
- [ ] Keywords decise
- [ ] Demo account testato (`test1@runhub.com` funziona?)

### Fase App Info:
- [ ] Name, Subtitle compilati
- [ ] Privacy Policy URL settato
- [ ] Category primary + secondary
- [ ] Bundle ID corretto

### Fase Pricing:
- [ ] Free
- [ ] Countries: all o Italy-only

### Fase Version 1.0:
- [ ] Screenshots 6.7" caricati
- [ ] Screenshots 6.5" caricati
- [ ] Promotional text ≤170 car
- [ ] Description ≤4000 car
- [ ] Keywords ≤100 car
- [ ] Support URL
- [ ] Marketing URL
- [ ] Copyright
- [ ] Trade Representative info EU
- [ ] Build selezionata (la più recente)
- [ ] App Icon

### Fase Review Info:
- [ ] Sign-in required: Yes
- [ ] Demo account email + password
- [ ] Phone reviewer
- [ ] Contact email
- [ ] Notes dettagliate compilate

### Fase Privacy:
- [ ] Tutti i 12 dati dichiarati
- [ ] ATT setup verificato

### Fase Age Rating:
- [ ] Questionario completato → 4+

### Fase Submission:
- [ ] Export Compliance: No
- [ ] Content Rights: Yes + confermato
- [ ] IDFA: Yes + compliance ATT spuntato
- [ ] Submit cliccato
- [ ] Status: Waiting for Review ✅

---

## 🎉 Buon Lancio!

Dopo submission sei a 24-72 ore dal vedere **RunHub** live su App Store Italia e globale.

Per qualsiasi dubbio durante la compilazione, chiedimi. 💪

**Buona fortuna!** 🚀
