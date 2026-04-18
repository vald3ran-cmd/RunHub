# RunHub — Product Requirements (v3)

## Vision
App di running in italiano con piani personalizzati, GPS tracking, traguardi, 4 tier di abbonamento, AI coach, achievement, audio guidato e condivisione social.

## Stack
- **Frontend**: React Native Expo + expo-router (dark theme)
- **Backend**: FastAPI + MongoDB (motor)
- **Auth**: JWT email/password
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key
- **Payments**: Stripe (6 SKU: 3 tier × monthly/yearly)
- **GPS**: expo-location + react-native-maps (Apple Maps su iOS)
- **TTS**: expo-speech (audio coach vocale in italiano)
- **Share**: React Native Share API (social sharing)

## Tier Structure

| Tier | Prezzo | Features chiave |
|---|---|---|
| **Free** | €0 | GPS illimitato, 10 corse storico, pubblicità |
| **Starter** | €4.99/mese · €39.99/anno | Storico illimitato, piani base (5K, 10K), no ads |
| **Performance** | €8.99/mese · €79.99/anno | AI Coach, 7 piani avanzati, VO2max, proiezione gare |
| **Elite** | €14.99/mese · €129.99/anno | Coach dashboard (10 atleti), beta features |

## Feature Complete

### Core
- Auth JWT (register/login/logout) con onboarding wizard a 3 step per nuovi utenti
- 9 piani predefiniti (beginner → expert): 5K, 10K, mezza, maratona, trail, progressione
- 7 step types: warmup, run, recovery, sprint, walk, **stretching**, **gymnastics**
- GPS tracking nativo con mappa Apple Maps + polyline percorso
- AI Coach (Claude Sonnet 4.5) — tier Performance+
- Proiezione tempi gara (Riegel) + VO2max (Jack Daniels) — Performance+
- Coach Dashboard 10 atleti — Elite
- Stripe subscriptions + paywall + tier gating

### Engagement (Ondata A)
- **Onboarding wizard**: livello → obiettivo → giorni/sett → piano consigliato automatico
- **10 Achievement/Badge**: primo run, 5/10 corse, primi 5K/10K/Mezza, totali 50/100 km, early bird, settimana perfetta — sbloccati automaticamente a fine corsa
- **Condivisione corsa** via React Native Share (Instagram/WhatsApp/SMS/email) con km/tempo/passo/calorie
- **Video pubblicitario interstitial** post-corsa (Free tier) + banner upgrade in Home

### Audio (Ondata B)
- **Audio coach vocale italiano** durante workout con piano: annuncia ogni step ("Riscaldamento: camminata veloce", "Corsa: ritmo 5:30/km")
- **Toggle on/off** nell'header della pagina Corsa
- Parla in it-IT via TTS nativo (expo-speech)

### Production ready (Ondata C)
- Backend testato 21/21 (iteration 2 + nuovi endpoint badges/onboarding)
- Permessi iOS configurati in app.json (NSLocationWhenInUseUsageDescription)
- Permessi Android (ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION)
- Cross-platform resolver per mappe (RouteMap.native.tsx / RouteMap.web.tsx)
- Video ads con interfaccia 1:1 ad AdMob (swap one-liner al momento del build nativo)

## Admin
- `admin@runhub.com / admin123` — tier Elite a vita

## Per deploy produzione
- **EAS Build**: serve Apple Developer ($99/anno) e Google Play Console ($25 una tantum)
- **AdMob**: sostituire placeholder `InterstitialAd` con `AdMobInterstitial` da `react-native-google-mobile-ads`
- **Privacy Policy + Termini d'uso**: richiesti da Apple/Google stores
- **Notifiche push**: configurare con expo-notifications + APNs/FCM nel build nativo
- **Sign in with Apple**: obbligatorio se offri altri social login (richiede build nativo)

## API nuove
- `POST /api/onboarding` — salva level/goal/days e restituisce piano consigliato
- `GET /api/badges` — lista 10 badge con status earned
- Automatic badge awarding in `POST /api/workouts/complete` → ritorna `newly_awarded_badges[]`
