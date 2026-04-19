# RunHub 🏃‍♂️

App di running con piani di allenamento personalizzati, GPS tracking real-time, AI Coach e community.

## 🏗️ Stack

- **Frontend**: React Native + Expo SDK 53 (Expo Router, react-native-maps)
- **Backend**: FastAPI (Python) + MongoDB (Motor async)
- **AI Coach**: Claude Sonnet 4.5 via Emergent LLM Key
- **Pagamenti**: Stripe (4 tier: Free, Starter, Performance, Elite)
- **Annunci**: Google AdMob (`react-native-google-mobile-ads`)

## 🚀 Setup locale

### Prerequisiti
- Node.js 20+, Yarn, Python 3.11+, MongoDB, Account [Expo](https://expo.dev)

### Frontend
```bash
cd frontend && yarn install && yarn start
```

### Backend
```bash
cd backend && pip install -r requirements.txt
# Config .env: MONGO_URL, JWT_SECRET, STRIPE_API_KEY, EMERGENT_LLM_KEY
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

## 📦 Build per lo Store

```bash
npm install -g eas-cli
eas login
cd frontend

# Build produzione
eas build --platform ios --profile production
eas build --platform android --profile production

# Sottomissione allo Store (dopo aver aggiornato eas.json con i tuoi dati)
eas submit --platform ios --latest
eas submit --platform android --latest
```

## 👤 Credenziali test

- **Admin**: `admin@runhub.com` / `admin123` (tier Elite)
- **Free user**: registra un nuovo account

## 📝 Note importanti

- **Expo Go** non supporta AdMob (modulo nativo). Usa `eas build --profile development`.
- **AdMob reali** appaiono solo in build native. In `__DEV__` si usano i Test IDs di Google.
- Backend va deployato separatamente (Railway, Render, Fly.io) e l'URL aggiornato in `frontend/.env`.

## 📄 Licenza

Private. © 2026 RunHub Team.
