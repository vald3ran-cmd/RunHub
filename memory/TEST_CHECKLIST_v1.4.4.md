# 🧪 RunHub — Test Checklist v1.4.4 (build 68)

> **Quando installare**: dopo che la build TestFlight `1.4.4 (68)` arriva sul tuo iPhone.

---

## 🏃 1. Schermata Corsa Attiva

### Avvia una corsa GPS reale (2-3 km consigliati, all'aperto)

- [ ] Al **km 1, 2, 3** senti l'**annuncio vocale italiano** del tipo:
      _"Hai corso 1 chilometro. Passo X minuti e Y secondi al chilometro. Tempo totale..."_
- [ ] Le **calorie** aumentano in tempo reale (4ª stat: KCAL)
- [ ] Il **dislivello** appare quando supera 1-2 metri (stat secondaria)
- [ ] Il **widget meteo** è visibile in alto a sinistra sulla mappa
- [ ] Se l'allenamento ha `target_pace`, vedi il chip:
      🟢 **IN TARGET** / 🔵 **TROPPO VELOCE** / 🔴 **TROPPO LENTO**
- [ ] Fermati 6+ secondi → si attiva **AUTO-PAUSA**, l'app dice "Auto-pausa attivata"
- [ ] Riprendi a camminare → auto-resume, dice "Ripresa"
- [ ] Premi **LAP** (button circolare sinistro) → annuncio "Lap 1. X km in Y min Z sec"
- [ ] La striscia di chip mostra gli split km con icone trend ↑/↓
- [ ] A fine corsa, riepilogo include split + dislivello + calorie
- [ ] Storico (`/history`) → tap su corsa → dettaglio mostra splits, elevation_gain

### Bike specifico
- [ ] Inizia un workout bike → annuncia velocità km/h invece del passo
- [ ] Dislivello cumulativo visibile

---

## 🎁 2. Sistema Referral

### Modale post-onboarding
- [ ] Dopo onboarding completato, dopo ~2.5s appare modale **"Invita un amico"**
- [ ] Chiudi con "Più tardi" → non riappare al riavvio app
- [ ] (Se vuoi farla riapparire: cancella e reinstalla app, oppure rimuovi flag AsyncStorage da debug)

### Schermata Referral
- [ ] **Profilo → COMMUNITY** → vedi card arancione **"Invita un amico"**
- [ ] Tap card → si apre schermata `/referral`
- [ ] Vedi il tuo codice grande (es. `RHK3XM78`)
- [ ] **Tap sul codice** → si copia in clipboard, appare ✅ "Copiato!"
- [ ] **Tap "CONDIVIDI INVITO"** → si apre share sheet iOS nativo con messaggio:
      _"🏃 Ciao! Sto usando RunHub..."_
- [ ] Sezione "Come funziona" mostra 3 step
- [ ] Sezione "I tuoi amici" mostra "Non hai ancora invitato amici..."
- [ ] Pull-to-refresh ricarica i dati

### Test end-to-end del premio
1. [ ] Logout dal primo account
2. [ ] Registrati con un **secondo account** (email diversa)
3. [ ] Nel campo **"Codice invito"** inserisci il codice del primo account
4. [ ] Vedi il chip arancione: **"Entri con l'invito di [tuo_nome]"**
5. [ ] Completa registrazione + onboarding
6. [ ] Fai una **corsa GPS reale ≥ 0.5 km** (in esterno!)
7. [ ] Logout e accedi col PRIMO account
8. [ ] Vai in `/referral` → controlla:
   - [ ] `qualified: 1`
   - [ ] `rewards_count: 1`
   - [ ] Banner arancione "**Bonus attivo fino al** [data +30 giorni]"
   - [ ] Lista amici mostra il secondo account con stato verde "**Premiato ✓**"
9. [ ] Vai in Profilo → tier mostrato è ora **Performance** (era Free)
10. [ ] Verifica accesso a feature Performance (es. cronologia illimitata)

### Anti-abuso
- [ ] Prova ad inserire il TUO STESSO codice in fase di register di un nuovo account dalla stessa email → register va bene ma il codice non si applica
- [ ] Prova a inserire un codice INVALIDO (es. `RHXXXXXX`) → nessun chip arancione mostrato

---

## 🌍 3. Localizzazione

- [ ] Profilo → menu **"Lingua · 🇮🇹 Italiano"**
- [ ] Tap → si apre modale con 3 lingue
- [ ] Seleziona **🇬🇧 English** → tutte le scritte referral diventano inglesi:
   - Card: "Invite a friend"
   - Schermata: "Invite & Earn"
   - Tasti: "Share invite", "Tap to copy"
- [ ] Seleziona **🇪🇸 Español** → diventano spagnole:
   - "Invita y Gana", "Compartir invitación", "Toca para copiar"
- [ ] **Riavvia app** → la lingua scelta è persistente
- [ ] Cambia lingua del telefono (Settings → Lingua) → al primo avvio rileva automaticamente se mai impostata manualmente

> ⚠️ Nota: solo le **nuove schermate** (referral, modale, card profilo, register code field, lingua selector) sono tradotte in questa wave. Le altre schermate (home, plans, history, ecc.) sono ancora in italiano. Saranno tradotte nelle prossime sessioni.

---

## 🔗 4. Deep Link (opzionale, avanzato)

Test con Safari sul telefono:

- [ ] Apri Safari → digita `runhub://r/RHK3XM78` (sostituisci con un codice vero)
- [ ] iOS chiede "Aprire in RunHub?" → conferma
- [ ] App si apre:
   - Se sei **loggato** e non hai mai usato un codice → applica automaticamente
   - Se sei **sloggato** → vai in Register, il campo è precompilato

Test con link universale (richiede setup AASA, se configurato):
- [ ] Apri `https://apprunhub.com/r/RHK3XM78` → idem

---

## 🐛 Eventuali bug da segnalare

Se trovi qualcosa che non funziona, prendi nota di:
- **Schermata** in cui è successo
- **Cosa stavi facendo** (passi precisi)
- **Cosa ti aspettavi** vs **cosa è successo**
- **Screenshot** se possibile
- **iOS version** + **modello iPhone**

E me lo riferisci nella prossima chat — risolverò nel build successivo `1.4.5`.

---

## 📝 Cambiamenti tecnici di questa versione

### Frontend
- 7 nuove feature corsa attiva (split km TTS, calorie live, dislivello, meteo Open-Meteo, pace target, auto-pausa, lap manuale)
- Sistema referral completo (schermata, modale, card, deep link)
- Infrastruttura i18n con IT/EN/ES per le nuove feature
- Aggiunte dipendenze: `i18n-js`, `expo-localization`, `expo-clipboard`

### Backend
- Schema `CompleteWorkoutRequest` esteso (alt, splits, elevation_gain_m)
- 3 nuovi endpoint referral (`/me`, `/redeem`, `/lookup`)
- Trigger reward auto su prima corsa GPS qualificante
- `user_tier()` rileva `bonus_premium_until` come Performance

### Test backend automatici
- Active Run: 47/47 assertions PASS
- Referral: 74/74 assertions PASS
