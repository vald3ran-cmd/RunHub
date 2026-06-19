# Google Play Store — Pacchetto RunHub 1.6.2

## 📥 Asset da scaricare

### 1. Icona 512x512
**URL**: https://run-training-hub-1.preview.emergentagent.com/api/play-store-assets/icon-512.png
**File**: `icon-512.png`
**Specs**: 512x512 PNG, 32-bit, sfondo non trasparente
**Carica in**: Play Console → Crescita → Presenza nello store → Scheda principale dello Store → "Icona dell'app"

### 2. Feature Graphic 1024x500
**URL**: https://run-training-hub-1.preview.emergentagent.com/api/play-store-assets/feature-graphic-1024x500.png
**File**: `feature-graphic-1024x500.png`
**Specs**: 1024x500 PNG/JPG, RGB (no alpha)
**Carica in**: Play Console → Crescita → Presenza nello store → Scheda principale dello Store → "Grafica in evidenza"

### 3. Screenshot Telefono (FAI TU)
**Quantità**: minimo 2, massimo 8
**Specs**:
- 16:9 verticale (es. 1080x1920) OPPURE
- formato libero ma sides tra 320-3840 px
- PNG o JPG, max 8MB ciascuno

**Come fare gli screenshot**:
- 📱 **Da Android device**: installa l'APK dalla build EAS Android (vedi sotto) e fai screenshot durante l'uso
- 🖥️ **Da iPhone TestFlight 1.6.2**: prendi gli stessi screenshot dell'iPhone — Google accetta anche immagini con notch iOS
- 🧪 **Da Android Studio Emulator**: lancia emulator, installa APK, screenshot

**Screen consigliati da catturare**:
1. **Lab Dashboard** (Run Score + CTL/ATL/TSB)
2. **Workout detail** con mappa GPS + stats
3. **`/run-active`** in corsa (con bottoni Pausa/Termina nuovo stile)
4. **AI Coach** (`/ai-generate`) form
5. **Importa** sessione (HealthKit + File)
6. **Diario** sessioni con chip filtri
7. **Share Card v2** con widget meteo

---

## 📝 Testi store

### Short Description (max 80 chars)
```
Corri smart. AI Coach, sync smartwatch, analytics scientifici.
```
*(60 chars — perfetto)*

### Full Description (max 4000 chars)

```
RunHub: l'app di running con AI Coach e analytics scientifici per veri runner.

🎯 PERCHÉ RUNHUB È DIVERSO

Non è "l'ennesimo cronometro GPS". RunHub è il tuo Lab personale: importi le sessioni dal tuo smartwatch (Apple Watch, Garmin, Coros, Polar, Suunto), connetti il cardio Bluetooth, e l'AI Coach Claude analizza i tuoi dati REALI per costruirti un piano d'allenamento su misura.

🧪 LAB DASHBOARD
Una vista sintetica della tua forma:
• Run Score (0-100) con trend di 14 giorni
• Volume settimanale e Δ vs settimana precedente
• Training Load scientifico: CTL (fitness 42gg) · ATL (fatica 7gg) · TSB (balance)
• HR Zones: % tempo nelle 5 zone cardiache (Z1 recovery → Z5 max)
• Predictions: tempo stimato per 5K, 10K, mezza maratona, maratona

🤖 AI COACH (Claude Sonnet 4.5)
L'AI legge le tue ultime 4 settimane di sessioni e genera un piano personalizzato:
• Obiettivo (5K, 10K, mezza, maratona, fitness)
• Giorni a settimana disponibili
• Eventuali limitazioni mediche
• Note libere ("voglio focus collina", "preferisco mattino")
Il piano si adatta al tuo livello reale, NON a un template generico.

📥 IMPORT UNIVERSALE
Sincronizza i dati dal tuo smartwatch in 3 modi:
• 🍎 Apple HealthKit — sync automatico dai workout di Apple Watch o app che salvano lì (Garmin, Coros, Polar via Apple Salute)
• 🤖 Android Health Connect — sync da Samsung Watch, Garmin, Fitbit, Wear OS
• 📁 Upload file .GPX / .FIT / .TCX — qualsiasi smartwatch del mondo

🫀 CARDIO BLUETOOTH LIVE
Connetti fascia cardio durante le sessioni GPS:
• Polar H10, H9
• Wahoo TICKR
• Garmin HRM-Pro, HRM-Dual
• Coros HRM, Suunto Smart Sensor
• CooSpo, Magene, e tanti altri compatibili Heart Rate Service BLE

🏃 CORSA GPS NATIVA
Quando esci senza smartwatch, RunHub fa tutto col telefono:
• GPS preciso con kalman filter
• Splits km automatici
• Pace medio + live
• Calorie stimate
• Mappa percorso con Mapbox
• Pause/Lap/Termina con UI Scientific Light

📸 SHARE CARD V2
Condividi le tue corse con un layout premium:
• Distanza gigante in font Mono
• Widget meteo (temperatura, vento, umidità)
• Mappa percorso GPS
• Statistiche complete (durata, pace, kcal, FC media)
• Branding RunHub pulito

🌍 LINGUE
Italiano, Inglese, Spagnolo, Francese, Tedesco.

🔒 PRIVACY FIRST
I tuoi dati restano tuoi. No tracking pubblicitario, no vendita dati a terzi, tutto criptato HTTPS.

💪 BUONA CORSA!

Domande o feedback? support@runhub.app
Privacy: https://runhub.app/privacy
Termini: https://runhub.app/terms
```

---

## 🎨 Categorizzazione store

- **Categoria principale**: `Salute e fitness`
- **Tag tematici**: `Running`, `Allenamento`, `GPS Fitness`, `Tracking`, `AI`
- **Pubblico di riferimento**: 13+ (target audience adolescenti+)

---

## 🔒 Privacy & sicurezza dati (questionario Play obbligatorio)

Compila in Play Console → "Crea dati per la sezione Sicurezza dei dati":

| Tipo dato | Raccolto | Condiviso | Scopo |
|---|---|---|---|
| Email | ✅ | ❌ | Account, auth |
| Nome | ✅ | ❌ | Account |
| Posizione precisa (GPS) | ✅ | ❌ | Tracking percorsi |
| Attività fisica | ✅ | ❌ | Core feature |
| Dati salute (FC, peso) | ✅ | ❌ | Analytics |
| Diagnostica app | ✅ | ❌ | Bug fix (Crashlytics) |

⚠️ **NON dichiarare** dati pubblicitari o profilazione marketing (RunHub non ne ha).

---

## 📋 Content rating (questionario IARC)

Risposte tipiche per app fitness:
- Violenza: ❌ No
- Sesso: ❌ No
- Linguaggio: ❌ No
- Sostanze: ❌ No
- Gambling: ❌ No
- Acquisti in-app: ✅ Sì (abbonamenti RevenueCat)
- Posizione utente: ✅ Sì (necessaria per GPS)

Rating finale atteso: **PEGI 3** / **ESRB Everyone**

---

## 🚀 Build APK/AAB per Android

Quando hai tutti gli asset caricati e il listing è pronto, lancia da terminale Mac:

```bash
cd /Users/federicobellucci/Desktop/RunHub
git checkout lab
git pull origin lab

cd frontend

# Build production Android (AAB per Play Store)
npx eas build --platform android --profile production --clear-cache

# Tempo atteso: 20-30 min
```

Quando finisce, ti dà un link `.aab` (Android App Bundle).

### Submit a Internal Testing (raccomandato all'inizio)

```bash
npx eas submit --platform android --latest --track internal
```

Oppure scarica manualmente l'AAB e caricalo:
1. Play Console → **Test e rilascio** → **Test interno** → **Crea nuova release**
2. Trascina l'AAB
3. Note di rilascio (italiano):
   ```
   Versione 1.6.2 — Prima release Android di RunHub
   • AI Coach con piano personalizzato
   • Import GPX/FIT/TCX, HealthKit + Health Connect
   • Cardio Bluetooth live (Polar, Wahoo, Garmin, ecc.)
   • Lab dashboard con CTL/ATL/TSB
   • Design Scientific Light
   ```
4. **Rivedi rilascio** → **Avvia rilascio in test interno**

⏱️ Tempo Google review: **~1-3 ore** per Internal Testing (molto più veloce di Apple).

---

## ✅ Checklist finale prima di "Avvia rilascio"

- [ ] Icona 512x512 caricata
- [ ] Feature graphic 1024x500 caricata
- [ ] Almeno 2 screenshot telefono caricati
- [ ] Short description scritta
- [ ] Full description scritta
- [ ] Categoria "Salute e fitness" selezionata
- [ ] Privacy policy URL impostata (riusa quella iOS)
- [ ] Sicurezza dei dati compilata
- [ ] Content rating questionnaire compilato
- [ ] Email di contatto sviluppatore impostata
- [ ] AAB della 1.6.2 caricato in Internal Testing
- [ ] Note di rilascio compilate
- [ ] Tester (almeno 1) aggiunto al gruppo Internal Testing

Promemoria: il PRIMO rilascio (anche solo Internal) può richiedere fino a 48h per la prima review Google del listing.
