# 📱 RunHub — Guida EAS Build completa (iOS TestFlight + Google Play)

Questa guida ti porta da zero a **app installata sul tuo iPhone/Android tramite TestFlight / Google Play Internal Testing**.

> 🖥️ **Tutti i comandi vanno eseguiti sul TUO MAC/PC LOCALE**, non nel container Emergent.
> Prima di iniziare, fai **"Save to GitHub"** da Emergent per avere il codice aggiornato sul tuo repo, poi `git clone` / `git pull` sul tuo Mac.

---

## 🎯 Prerequisiti (già OK per te ✅)

- [x] Account Expo ([expo.dev](https://expo.dev))
- [x] Apple Developer Program ($99/anno)
- [x] Google Play Console ($25 una tantum)
- [x] Mac con Node.js 20+ e Yarn

---

## 🧩 Step 1 — Installa EAS CLI e login

```bash
# Installa globalmente
npm install -g eas-cli

# Login con il tuo account Expo
eas login
# ti chiederà username e password dell'account expo.dev
```

Verifica il login:
```bash
eas whoami
# → dovrebbe stampare il tuo username Expo
```

---

## 🧩 Step 2 — Inizializza il progetto EAS

Dal tuo Mac, dopo aver clonato il repo:

```bash
cd /path/to/RunHub/frontend
yarn install          # installa le dipendenze
eas init              # crea il progetto su Expo e aggiunge projectId in app.json
```

`eas init`:
- Ti chiede di confermare lo `slug` ("runhub") → accetta
- Crea il progetto su expo.dev
- Aggiunge automaticamente `extra.eas.projectId` in `app.json`

**Committa la modifica**:
```bash
git add app.json
git commit -m "chore: add EAS projectId"
git push
```

---

## 🧩 Step 3 — Verifica che `eas.json` e `app.json` siano pronti

### `frontend/eas.json` (già configurato)
```json
{
  "build": {
    "development": { "developmentClient": true, ... },
    "preview":     { "env": { "EXPO_PUBLIC_BACKEND_URL": "https://runhub-backend.onrender.com" }, ... },
    "production":  { "env": { "EXPO_PUBLIC_BACKEND_URL": "https://runhub-backend.onrender.com" }, ... }
  }
}
```

Verifica che `submit.production` abbia i tuoi dati reali **prima** di fare `eas submit`:

```bash
# Apri il file
code eas.json   # o il tuo editor
```

Sostituisci i placeholder:
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "la-tua-apple-id@email.com",
      "ascAppId": "1234567890",         // lo trovi in App Store Connect dopo aver creato l'app
      "appleTeamId": "ABC1234DEF"       // Developer Account → Membership → Team ID
    },
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json",  // vedi Step 6
      "track": "internal"
    }
  }
}
```

---

## 🧩 Step 4 — Genera credenziali automatiche (iOS + Android)

EAS gestisce automaticamente certificati Apple e keystore Android. Lancialo così:

```bash
# iOS
eas credentials --platform ios
# → seleziona "Set up a new distribution certificate"
# → EAS si collega al tuo Apple Developer Account (ti chiede username/password + 2FA)
# → crea automaticamente: Distribution Certificate + Provisioning Profile + Push Key

# Android
eas credentials --platform android
# → seleziona "Let EAS generate a new keystore"
# → fatto! keystore salvato nei tuoi secrets Expo
```

> 💡 Alternativa: salta questo step e lascia che `eas build` lo chieda al primo build.

---

## 🧩 Step 5 — Primo build di TEST (internal distribution)

Prima del build ufficiale, facciamo un build "preview" per testare:

### Android APK (più veloce, 10 min)
```bash
eas build --platform android --profile preview
```

Al termine, EAS ti dà un **link diretto** per scaricare l'APK. Trasferiscilo sul tuo device Android e installalo.

### iOS IPA per TestFlight interno (15-25 min)
```bash
eas build --platform ios --profile preview
```

Al termine hai un `.ipa`. Per installarlo sul tuo iPhone:
- **TestFlight**: serve prima `eas submit` (vedi Step 7)
- **Ad-hoc**: devi aver registrato l'UDID del device nel tuo Apple Developer account

### Build per ENTRAMBE le piattaforme insieme
```bash
eas build --platform all --profile preview
```

---

## 🧩 Step 6 — Setup Google Service Account (per submit Android automatico)

Per poter usare `eas submit --platform android`, serve una Service Account JSON:

1. Vai su [Google Play Console](https://play.google.com/console)
2. **Setup → API access** → "Link a Google Cloud project" → crea nuovo progetto (o collega esistente)
3. **Create new service account**: ti manda sulla Google Cloud Console
4. Nella GCP Console, crea service account con ruolo **"Service Account User"**
5. Genera **JSON key** → scaricalo
6. Salvalo come `/path/to/RunHub/frontend/google-service-account.json`
7. **Aggiungi `google-service-account.json` al tuo `.gitignore`** (MAI committare!):
   ```bash
   echo "frontend/google-service-account.json" >> .gitignore
   ```
8. In Play Console → **Users and permissions** → aggiungi la service account email (`xxx@xxx.iam.gserviceaccount.com`) con permessi: **Admin (all apps)** oppure **Release manager**.

---

## 🧩 Step 7 — Setup App Store Connect (per submit iOS)

1. Vai su [App Store Connect](https://appstoreconnect.apple.com/)
2. **My Apps → "+"** → **New App**
3. Inserisci:
   - **Platform**: iOS
   - **Name**: RunHub
   - **Primary Language**: Italiano
   - **Bundle ID**: `com.runhub.app` (deve matchare `app.json`)
   - **SKU**: `runhub-001` (qualsiasi stringa unica)
4. Prendi l'**Apple ID numerico** dell'app (URL: `.../apps/XXXXXXXXXX/...`) e mettilo in `eas.json` come `ascAppId`

### App Privacy (obbligatorio per submit)
App Store Connect ti chiederà di dichiarare cosa raccoglie l'app:
- **Location** → "Traccia percorso di corsa"
- **Contact info** (email) → "Login"
- **Identifiers** (user ID per subscription) → "Payment processing"
- **Health & Fitness** (se usi Apple Health)

### Age Rating → 4+ (probabilmente OK per fitness app)

---

## 🧩 Step 8 — Build di PRODUZIONE e submit

Ora che TestFlight / Play Console sono pronti, build finale:

```bash
# Build produzione (incrementa automaticamente versionCode/buildNumber grazie a "autoIncrement: true")
eas build --platform all --profile production
```

Attendi 15-30 min per entrambi.

### Submit automatico
```bash
# iOS → TestFlight
eas submit --platform ios --profile production --latest

# Android → Play Console Internal Testing track
eas submit --platform android --profile production --latest
```

---

## 🧩 Step 9 — TestFlight (iOS)

Dopo `eas submit ios`:

1. Aspetta 5-15 min che Apple processi il build
2. Vai su [App Store Connect → TestFlight](https://appstoreconnect.apple.com/)
3. Il build appare in "iOS Builds" → clicca per dare info **"Export Compliance"** (di solito: "No, non usa crittografia personalizzata")
4. Aggiungi tester interni (fino a 100): **Internal Testing → "+"** → aggiungi email del tuo account Apple
5. Riceverai email per scaricare **TestFlight app** sul tuo iPhone → accetti invito → installi RunHub

---

## 🧩 Step 10 — Google Play Internal Testing (Android)

Dopo `eas submit android`:

1. Vai su [Play Console → Testing → Internal testing](https://play.google.com/console)
2. **Create new release** → la .aab appena submittata è già presente
3. **Review and release**
4. **Testers → Create email list** → aggiungi la tua email Gmail
5. Google ti dà un link **"Opt-in URL"** (es: `https://play.google.com/apps/internaltest/XXX`)
6. Apri il link sul tuo Android → clicca "Become a tester" → scarica RunHub dal Play Store

---

## 🚨 Errori comuni

### "Apple ID password expired / 2FA"
Usa una **App-Specific Password** (Apple ID → Security → App-Specific Passwords) e inseriscila quando EAS la chiede.

### "Missing EXPO_PUBLIC_BACKEND_URL"
Controlla `eas.json` → il profilo `preview` e `production` DEVE avere:
```json
"env": { "EXPO_PUBLIC_BACKEND_URL": "https://runhub-backend.onrender.com" }
```

### "Google Signing configuration required" (Android)
Lascia che EAS gestisca tutto: `eas credentials --platform android` → "Let EAS generate a new keystore".

### "Invalid provisioning profile" (iOS)
Rigenerala: `eas credentials --platform ios` → seleziona "Remove and create new".

### App crash al primo avvio
Quasi sempre è un errore di backend URL sbagliato. Verifica:
```bash
# Dopo il build, controlla il bundle JS
curl https://runhub-backend.onrender.com/api/health
# → deve restituire {"status":"ok"}
```

---

## ⏭️ Dopo il primo TestFlight: OTA Updates

Per pushare aggiornamenti JS senza rebuild:

```bash
# Setup iniziale (una tantum)
eas update:configure

# Poi ogni volta che cambi codice JS/TS
eas update --branch production --message "Fix: bug login"
```

Gli utenti TestFlight / Play Internal ricevono l'update al prossimo apri dell'app. 🎉

---

## 📋 Checklist finale per il primo submit

- [ ] `eas init` eseguito → `extra.eas.projectId` in `app.json`
- [ ] `eas credentials` per iOS e Android
- [ ] App creata in App Store Connect (bundle id `com.runhub.app`)
- [ ] App creata in Play Console (package `com.runhub.app`)
- [ ] `eas.json submit.production` compilato con Apple ID, Team ID, ascAppId, google-service-account.json
- [ ] `google-service-account.json` in `.gitignore`
- [ ] Backend Render live e `/api/health` risponde
- [ ] `eas build --platform all --profile preview` → installato e testato su almeno un device
- [ ] Privacy labels in App Store Connect compilate
- [ ] Age rating impostato su Play Console
- [ ] Asset richiesti: icone 1024x1024, screenshot (iPhone 6.7", Android phone)

---

## 🆘 Hai bisogno di aiuto?

Per **qualsiasi errore** durante l'esecuzione di questi comandi:
1. Copia l'output completo dell'errore
2. Mandamelo qui su Emergent
3. Risolveremo insieme

Buon build! 🚀
