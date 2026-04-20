# 💰 RunHub — Guida Setup RevenueCat (IAP iOS + Android)

Questa guida ti porta a configurare RevenueCat per gestire abbonamenti in-app su **iOS App Store** e **Google Play Store**, mantenendo Stripe come fallback per web.

> 🎯 **Obiettivo**: quando l'utente compra un abbonamento dall'app iOS/Android, RevenueCat gestisce il pagamento IAP (Apple/Google), notifica il nostro backend via webhook, e il backend aggiorna il tier dell'utente.

---

## 📋 Overview architettura

```
┌─────────────────────────────────────────────────────────────────┐
│   Utente iOS/Android acquista abbonamento nell'app RunHub       │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │  RevenueCat   │ ← gestisce IAP Apple/Google + validation receipt
         │     SDK       │
         └───────┬───────┘
                 │ webhook
                 ▼
    ┌────────────────────────┐
    │  FastAPI Backend       │ ← /api/webhook/revenuecat
    │  (Render.com)          │ ← aggiorna user.tier in MongoDB
    └────────────────────────┘

    Utente Web (browser) → rimane su Stripe Checkout (già funzionante)
```

---

## 🧩 Step 1 — Crea account RevenueCat

1. Vai su [app.revenuecat.com](https://app.revenuecat.com/signup)
2. Crea un account (gratis)
3. Crea un nuovo **Project** chiamato `RunHub`

---

## 🧩 Step 2 — Crea Prodotti su App Store Connect (iOS)

Vai su [App Store Connect](https://appstoreconnect.apple.com/) → la tua app RunHub (o creala se non l'hai ancora fatto seguendo [EAS_BUILD_GUIDE.md](./EAS_BUILD_GUIDE.md) Step 7).

### Crea 6 Subscription Products

**In-App Purchases → Subscriptions → New Subscription Group** → nome "RunHub Premium"

Poi crea 6 abbonamenti (1 Subscription Group, 6 levels con prezzi diversi):

| Product ID | Nome | Durata | Prezzo |
|-----------|------|--------|--------|
| `starter_monthly` | Starter Mensile | 1 mese | €4.99 |
| `starter_yearly` | Starter Annuale | 1 anno | €39.99 |
| `performance_monthly` | Performance Mensile | 1 mese | €8.99 |
| `performance_yearly` | Performance Annuale | 1 anno | €79.99 |
| `elite_monthly` | Elite Mensile | 1 mese | €14.99 |
| `elite_yearly` | Elite Annuale | 1 anno | €129.99 |

> ⚠️ **Important**: i Product IDs devono corrispondere ESATTAMENTE (case-sensitive).

Per ciascun abbonamento compila:
- **Localization** (almeno Italiano): Display Name + Description
- **Review Information**: screenshot placeholder + review note
- **Tax & Agreements**: accetta i Paid Apps Agreement se non l'hai già fatto

---

## 🧩 Step 3 — Crea Prodotti su Google Play Console (Android)

Vai su [Google Play Console](https://play.google.com/console) → la tua app.

**Monetization → Products → Subscriptions → Create subscription**

Crea gli stessi 6 Product IDs con gli stessi prezzi:
- `starter_monthly` — €4.99/month
- `starter_yearly` — €39.99/year  
- `performance_monthly` — €8.99/month
- `performance_yearly` — €79.99/year
- `elite_monthly` — €14.99/month
- `elite_yearly` — €129.99/year

Per ciascuno:
- **Base plan** → durata + prezzo
- **Offer** (opzionale): es. 7 giorni gratis come free trial
- **Activate** ogni abbonamento dopo la creazione

---

## 🧩 Step 4 — Collega iOS + Android a RevenueCat

### iOS
1. Dashboard RevenueCat → Project Settings → **Apps & providers → + App**
2. Seleziona **iOS**
3. Compila:
   - **Bundle ID**: `com.runhub.app`
   - **App Store Connect Shared Secret**: vai su App Store Connect → la tua app → App Information → App-Specific Shared Secret → Generate → copia e incolla in RevenueCat
   - **App Store Connect App ID**: il numero ID dell'app (lo trovi nell'URL di App Store Connect)
4. Salva → RevenueCat ti darà l'**iOS Public API Key** (`appl_xxxxx`)

### Android
1. Dashboard RevenueCat → + App → **Android**
2. Compila:
   - **Package name**: `com.runhub.app`
   - **Service Account Credentials JSON**: fornito da Google Cloud (vedi [EAS_BUILD_GUIDE.md](./EAS_BUILD_GUIDE.md) Step 6). Devi generare una JSON key per un service account con ruolo **Service Account User** e permessi **Play Console → Admin (all apps)** oppure **Release manager**.
3. Salva → RevenueCat ti darà l'**Android Public API Key** (`goog_xxxxx`)

---

## 🧩 Step 5 — Importa i Prodotti in RevenueCat

1. Dashboard RevenueCat → **Product catalog → Products**
2. Clicca **Import products**
3. RevenueCat importa automaticamente i prodotti da App Store Connect e Google Play
4. Verifica che tutti e 12 (6 iOS + 6 Android) siano presenti

> ⏱️ **Nota**: possono servire 1-2 ore perché i prodotti appena creati su App Store/Play Console si propaghino.

---

## 🧩 Step 6 — Crea Entitlements

Gli entitlements sono "permessi" che sblocchi acquistando i prodotti.

Dashboard RevenueCat → **Product catalog → Entitlements → + New entitlement**

Crea 3 entitlements (IDs devono essere ESATTAMENTE questi):

| Entitlement ID | Descrizione |
|---------------|-------------|
| `starter_tier` | Piano Starter (Allenati) |
| `performance_tier` | Piano Performance (Competi) |
| `elite_tier` | Piano Elite (Coach) |

Per ciascun entitlement → **Attach products** e seleziona:
- `starter_tier` → `starter_monthly` + `starter_yearly` (iOS + Android = 4 totali)
- `performance_tier` → `performance_monthly` + `performance_yearly`
- `elite_tier` → `elite_monthly` + `elite_yearly`

---

## 🧩 Step 7 — Crea Offering

Le offerings sono gruppi di prodotti che mostrerai all'utente sulla paywall.

Dashboard RevenueCat → **Product catalog → Offerings → + New offering**

- **Identifier**: `default` (RevenueCat usa questa offering di default)
- **Description**: Default offering per RunHub Premium

Poi aggiungi **Packages** all'offering:

| Package Identifier | Product iOS | Product Android |
|-------------------|-------------|-----------------|
| `$rc_monthly` | `starter_monthly` (o performance/elite a seconda del tier) | idem |
| `$rc_annual` | `starter_yearly` | idem |

Meglio: crea 6 packages (uno per ogni tier + durata):
- `starter_monthly` → iOS `starter_monthly` + Android `starter_monthly`
- `starter_annual` → iOS `starter_yearly` + Android `starter_yearly`
- `performance_monthly`, `performance_annual`, `elite_monthly`, `elite_annual`

**Imposta `default` come Current offering** (checkbox).

---

## 🧩 Step 8 — Configura Webhook RevenueCat

1. Dashboard RevenueCat → **Integrations → Webhooks → + Add new webhook**
2. **URL**:
   ```
   https://runhub-backend.onrender.com/api/webhook/revenuecat
   ```
3. **Authorization header** (sicurezza — fortemente consigliato):
   - Genera una stringa random sicura (es: `openssl rand -hex 32` → `abc123def456...`)
   - Nel campo Authorization header di RevenueCat inserisci: `Bearer abc123def456...`
   - **Copia la stringa segreta** (senza `Bearer `) — ti serve per il prossimo step
4. Salva

---

## 🧩 Step 9 — Aggiungi Environment Variables su Render

Vai su [Render Dashboard](https://dashboard.render.com/) → `runhub-backend` → **Environment → Add Environment Variable**:

| Chiave | Valore |
|--------|--------|
| `REVENUECAT_WEBHOOK_AUTH` | la stringa segreta dello step 8 (SENZA `Bearer `) |
| `REVENUECAT_SECRET_KEY` | Public API Key secret di RevenueCat (Project Settings → API Keys → Secret) — opzionale, per polling REST API |

Clicca **Save Changes** → Render farà redeploy automatico (~2 min).

---

## 🧩 Step 10 — Aggiungi API Keys al frontend Expo

Nel tuo `.env` locale e in `eas.json`:

### Opzione A: via `eas.json` (consigliato per build)

```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_BACKEND_URL": "https://runhub-backend.onrender.com",
        "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY": "appl_xxxxxxxxxxxxxxxx",
        "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY": "goog_xxxxxxxxxxxxxxxx"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_BACKEND_URL": "https://runhub-backend.onrender.com",
        "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY": "appl_xxxxxxxxxxxxxxxx",
        "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY": "goog_xxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### Opzione B: via EAS Secrets (più sicuro)

```bash
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value appl_xxxxxxxxxxxxxxxx
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY --value goog_xxxxxxxxxxxxxxxx
```

---

## 🧩 Step 11 — Test in Sandbox

### iOS Sandbox
1. App Store Connect → Users and Access → **Sandbox Testers → +** 
2. Crea un tester con email fittizia (non deve essere reale)
3. Sul tuo iPhone: **Impostazioni → App Store → Sandbox Account → Sign In** con il tester
4. Apri l'app RunHub (build EAS preview) → acquista un abbonamento
5. Apple mostrerà dialog sandbox → completa l'acquisto (non viene addebitato)

### Android Sandbox
1. Play Console → **Setup → License Testing** → aggiungi la tua email Gmail come tester
2. Crea una **Closed test track** e aggiungi la stessa email
3. Opt-in al link test ricevuto
4. Apri l'app RunHub → acquista → Play Store mostrerà "Payment method: Test card. Always approves."

---

## 🧩 Step 12 — Verifica webhook funzionanti

Dopo un acquisto sandbox:

1. Dashboard RevenueCat → **Customer History** → vedi la transazione
2. Dashboard RevenueCat → **Integrations → Webhooks → la tua destinazione** → vedi "Deliveries" con 200 OK
3. Su Render Dashboard → `runhub-backend` → **Logs** → cerca `[RevenueCat] Event: INITIAL_PURCHASE` con il nostro `app_user_id`
4. Nell'app: esci/rientra e verifica che l'utente sia premium

---

## 📝 Mapping Entitlements ↔ Tiers

Il nostro backend mappa gli entitlements RevenueCat ai tier interni così:

```python
"elite_tier"       → tier = "elite"
"performance_tier" → tier = "performance"  
"starter_tier"     → tier = "starter"
(nessun entitlement attivo) → tier = "free"
```

Se un utente ha più entitlement attivi, vince il più alto (elite > performance > starter > free).

---

## 🛡️ Sicurezza

- ✅ Webhook autenticato via `REVENUECAT_WEBHOOK_AUTH` header (Bearer token)
- ✅ Backend risponde sempre 200 per evitare retry ciclici (anche su errori interni)
- ✅ Audit log in MongoDB `payment_transactions` per ogni evento ricevuto
- ⚠️ **Non** esporre `REVENUECAT_SECRET_KEY` nel frontend — usarlo solo backend-side

---

## 🆘 Troubleshooting

### "No offerings available" nella paywall
- Verifica che i prodotti siano **Activated** su App Store Connect / Play Console
- Aspetta 1-2 ore dopo creazione prodotti
- Nel codice, chiama `Purchases.getOfferings()` e ispeziona `offerings.current` — se è `null`, offerings non configurate
- Verifica che l'offering `default` sia **Current** su RevenueCat dashboard

### "Purchase failed: user_cancelled"
Normale — l'utente ha annullato il dialog Apple/Google.

### Webhook non viene chiamato
- Verifica URL (`https://runhub-backend.onrender.com/api/webhook/revenuecat`)
- Verifica Authorization header matcha `Bearer ${REVENUECAT_WEBHOOK_AUTH}`
- Controlla logs Render per 401/403/400

### User tier non si aggiorna dopo acquisto
- Verifica che `app_user_id` passato a `Purchases.logIn(userId)` coincida con `user.id` nel DB
- Controlla logs: `[RevenueCat] User non trovato: ...` → problema di mapping

---

## ⏭️ Avanzamento futuro

Dopo che RevenueCat è operativo, considera:
- **Paywall personalizzata via RevenueCat UI** (`react-native-purchases-ui` già installato)
- **Promo Offers** (sconto X% primo mese, free trial 7 giorni)
- **Win-back campaigns** (offerta a utenti che hanno cancellato)
- **Analytics RevenueCat** (retention, LTV, churn)

---

Buona monetizzazione! 💰🚀
