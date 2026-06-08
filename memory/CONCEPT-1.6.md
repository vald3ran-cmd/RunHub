# RunHub 2.0 — Lab Edition · Concept Document

> **Versione**: 1.6.0 "Lab Edition"
> **Stato**: Concept approvato, design in finalizzazione
> **Owner**: Federico Bellucci
> **Ultima revisione**: 8 giugno 2026

---

## 1. Tagline

> **"Il tuo laboratorio di running. Powered by AI."**

Alternative:
- *"Importa. Analizza. Migliora."*
- *"I tuoi dati. Il tuo coach. Il tuo prossimo PR."*
- *"Lascia il telefono a casa. Corri col tuo watch. Noi ci pensiamo al resto."*

---

## 2. Il pivot in una frase

> Da app per correre col telefono → ad app per **analizzare** ogni corsa che fai con il tuo smartwatch, con un **AI Coach** che legge i tuoi dati e scrive il tuo prossimo piano.

---

## 3. Il problema

I runner serious **non corrono più col telefono**. Hanno Garmin, Apple Watch, Polar, Coros. Il telefono resta a casa. Ma quando rientrano vogliono:

- 📊 **Capire** cosa hanno fatto (zone HR, GAP, decoupling, splits)
- 📈 **Vedere** il loro stato di forma (training load, recovery, trend)
- 🎯 **Sapere** cosa fare la prossima volta (piano adattivo, non statico)
- 🏆 **Confrontare** sé stessi nel tempo (PR, regression, progress)

Gli strumenti che fanno questo oggi sono **TrainingPeaks** (19€/mese, inglese), **Runalyze** (tedesco), **Intervals.icu** (free ma da nerd). Sono fatti per nerd.

**Gap di mercato**: un'app moderna, italiana, AI-driven, che fa il lavoro di TrainingPeaks con l'UX di Whoop e il prezzo di Strava Premium.

---

## 4. I 3 pilastri della 1.6

### 4.1 🔌 Import universale, zero attrito
- Connetti **Apple HealthKit** o **Health Connect Android** in un tap.
- Ultimi **90 giorni** importati sincroni in 10 secondi, resto in background.
- **File upload** `.fit / .gpx / .tcx` (anche via Share Sheet iOS).
- Strava OAuth → roadmap post-1.6 quando si vorrà investire 80€/anno in abbonamento Strava Standard tier.

### 4.2 🔬 Lab — Il laboratorio dei tuoi dati
La schermata che fa la differenza. Dashboard analytics con:

1. **AI Insight settimanale** (in cima, generato da Claude)
2. **Training Load** (CTL / ATL / TSB) — solo Performance+
3. **Weekly Volume** (bar chart 7 giorni)
4. **Personal Records** (5K, 10K, Half, Marathon, custom)
5. **HR Zones distribution** (segmented bar last 30d)
6. **Recent Sessions** importate, ciascuna cliccabile → vista dettaglio

Ogni sessione importata si apre in **detail Lab view** con:
- HR chart sec-by-sec
- Pace per km / per minuto
- Grade Adjusted Pace (GAP)
- Aerobic decoupling
- Splits intelligenti
- Confronto con sessioni simili passate

### 4.3 🤖 AI Coach che legge i dati reali
Non più questionario "Quanti km corri a settimana?". L'AI legge **automaticamente** le ultime 4-8 settimane del Lab e genera un piano basato sul **vero stato di forma**:

- CTL attuale + target
- HR a riposo trend
- Frequenza training, recovery quality
- Eventi futuri (gare, target)

Il piano si **adatta settimana per settimana**. Salti una sessione → ricalibra. Vai forte → alza il volume.

---

## 5. Identità visiva — "Scientific Light"

### 5.1 Filosofia
| Dimensione | Old RunHub | New RunHub Lab |
|---|---|---|
| Vibe | Hype, gym, energia | **Lab, precision, autorevolezza** |
| Colore base | Nero + arancione gradient | **Bianco off + arancione accento** |
| Tipografia | Sans bold UPPERCASE | **Inter + JetBrains Mono** per numeri |
| Protagonista | Bottoni grossi "INIZIA" | **Grafici, numeri, trend lines** |
| Linguaggio | "FATTI VEDERE!" | "+18% vs last week · ramping up" |
| Reference | Nike Run Club | **Linear · Stripe · Apple Health · NYT Athletics** |

### 5.2 Palette "Scientific Light"

```
─── BASE ────────────────────────────────
Background primary     #FAFAFA   off-white, mai bianco puro
Background card        #FFFFFF
Background subtle      #F3F4F6   separator, hover
Border subtle          #E5E7EB
Border emphasis        #D1D5DB

─── TYPOGRAPHY ──────────────────────────
Text primary           #0F172A   slate-900, non nero puro
Text secondary         #475569
Text muted             #94A3B8
Text disabled          #CBD5E1

─── BRAND ───────────────────────────────
Brand primary          #E85D04   arancione "magma" desaturato
Brand hover            #C94A02
Brand subtle bg        #FFF4E6

─── SEMANTIC ────────────────────────────
Success / Recovery     #059669
Warning / Ramping      #D97706
Danger / Overload      #DC2626
Info / Easy zone       #2563EB

─── DATA VIZ ────────────────────────────
Chart line 1           #E85D04   brand
Chart line 2           #2563EB
Chart line 3           #059669
Chart grid             #F1F5F9
Chart axis             #94A3B8
HR Zone 1 (recovery)   #93C5FD
HR Zone 2 (endurance)  #6EE7B7
HR Zone 3 (tempo)      #FCD34D
HR Zone 4 (threshold)  #FB923C
HR Zone 5 (vo2max)     #F87171
```

### 5.3 Tipografia

```
Display / UI       Inter Variable
Numbers / data     JetBrains Mono Variable      ← KEY DIFFERENTIATOR
Long form          Inter

Hero metric        56pt mono · weight 500   es. "42:08"
Section title      28pt Inter · weight 700
KPI value          32pt mono · weight 600   es. "38" CTL
KPI label          11pt Inter · weight 600 · letter-spacing 1.5 · UPPERCASE
Body               15pt Inter · weight 400
Caption / micro    12pt Inter · weight 500
Mono inline data   13pt JetBrains Mono · weight 500
```

### 5.4 Dark mode opzionale (editoriale, non hype)

```
Background       #0A0A0B    quasi-nero profondo
Card             #161618
Text primary     #F5F5F7
Brand            #FF7A30    arancione caldo per emergere su scuro
```

Stile **Bloomberg Terminal / Linear dark**, NON stile Strava.

Setting in **Profile → Aspetto → ◯ Auto · ◯ Light · ◯ Dark**.

---

## 6. Nuova architettura informativa

### Tab bar floating glass (5 voci)
```
🏠 Home    🔬 Lab    ⌚ Import    📅 Plan    👤 Profile
```

| Tab | Contenuto |
|---|---|
| **Home** | Greeting + AI Insight ultimo + prossimo allenamento + CTA "Importa qualcosa" |
| **Lab** | 🌟 Cuore della 1.6 — dashboard analytics, sessioni importate, KPI |
| **Import** | Centro connessioni (HealthKit, Health Connect, file upload) + secondary "Corri col telefono" |
| **Plan** | Piani AI + libreria predefinita |
| **Profile** | Account, abbonamento, settings, traguardi |

### Cosa scompare
- Tab **History** → diventa lista cronologica dentro Lab
- Tab **Run** come primary → diventa secondary action dentro Import

---

## 7. Modello free/paid ridisegnato

| Feature | Free | Starter (4.99€) | Performance (9.99€) | Elite (19.99€) |
|---|:---:|:---:|:---:|:---:|
| Import HealthKit/Health Connect | ✅ illimitato | ✅ | ✅ | ✅ |
| Storia importata illimitata | ✅ | ✅ | ✅ | ✅ |
| GPS phone tracking | ✅ | ✅ | ✅ | ✅ |
| **Piani predefiniti** | ✅ tutti (NEW!) | ✅ | ✅ | ✅ |
| AI Insight settimanale | ❌ | ❌ | ✅ | ✅ |
| **AI Coach personal plans** | ❌ | ✅ (NEW!) | ✅ | ✅ |
| Lab base (zones, splits, GAP) | ❌ | ✅ | ✅ | ✅ |
| Training Load (CTL/ATL/TSB) | ❌ | ❌ | ✅ | ✅ |
| Aerobic decoupling, EF, VO2max trend | ❌ | ❌ | ❌ | ✅ |
| Race predictor avanzato | ❌ | ❌ | ❌ | ✅ |
| Compare runs side-by-side | ❌ | ❌ | ❌ | ✅ |
| Ads | banner + interstitial | ❌ | ❌ | ❌ |

**Insight strategico**: Free diventa drasticamente più generoso. Il pagamento si sposta verso **analisi avanzate + coaching personalizzato**.

---

## 8. Differenziazione competitiva

| App | Phone track | Multi-import | AI Coach | Analytics | Prezzo |
|---|---|---|---|---|---|
| Strava Premium | ✅ | Solo propri | ❌ | Base | 7€/mese |
| Nike Run Club | ✅ | ❌ | ❌ Statico | ❌ | Free |
| TrainingPeaks | ❌ | Strava only | ❌ | Pro | 19€/mese |
| Runalyze | ❌ | Garmin/Strava | ❌ | Pro nerd | Free + Pro 5€ |
| Intervals.icu | ❌ | Strava/Garmin | ❌ | Pro nerd | Free |
| **🆕 RunHub Lab** | ✅ secondary | **HK+HC+file** | **✅ Claude** | **✅ moderno** | **Free + 4.99€** |

**Posizionamento unico**: l'unica app con AI Coach Claude + analytics pro + UX moderna + prezzo accessibile, e in italiano.

---

## 9. Funnel utente trasformato

### Old (1.5)
```
Download → Onboarding questionario → "Compra Premium per AI" →
Tab Run → Avvia tracking → Corri col telefono → Vedi stats base
```

### New (1.6)
```
Download → "Come tracci?" → Connect Apple Watch/HealthKit (10 sec) →
Lab si popola coi tuoi ultimi 90 giorni → AI Insight pronto →
"Vuoi un piano basato sui tuoi dati?" → Upsell naturale
```

---

## 10. Roadmap sprint (5-6 settimane MVP)

| Sprint | Settimane | Contenuto |
|---|---|---|
| **0** | 0.5 | PRD definitivo + schema MongoDB + mockup onboarding |
| **1** | 1-2 | Apple HealthKit full session import (streams + HR + cadence + GPS) |
| **2** | 1 | Health Connect Android equivalent |
| **3** | 1 | File upload `.fit/.gpx/.tcx` + parsing client-side |
| **4** | 1-2 | Lab tab + AI Insights + zones HR + GAP + splits |
| **5** | 1 | Onboarding pivot + Free tier ridisegnato + AI Coach esteso a Starter |
| **6** | post-1.6 | Strava OAuth (se utente vorrà investire 80€/anno) |
| **7** | post-1.6 | Garmin Connect / Polar / Coros nativi (NDA) |

---

## 11. Marketing — Screenshot store

1. **Hero**: "Il tuo telefono non corre più con te. Ma RunHub Lab sì."
2. **Import**: "Connetti il tuo wearable in 10 secondi." (logo grid: Apple Watch, Garmin, Polar, Coros, Suunto, Wahoo)
3. **Lab**: "Vedi quello che il tuo watch nasconde." (Training Load, Aerobic Decoupling, HR Zones, GAP)
4. **AI Insight**: "Un AI Coach che legge i tuoi dati." (card esempio reale)
5. **Plan**: "Il tuo piano cambia con te." (calendar settimanale)

### Claim sintesi
> **"L'unica app che legge il tuo Apple Watch, capisce i tuoi dati come un coach professionista, e ti dice esattamente cosa fare la prossima settimana. In italiano. A meno di 5€."**

---

## 12. Onboarding utenti esistenti

Slide story 5-frame full-screen al primo avvio dopo upgrade:

1. "RunHub è cambiato. In meglio."
2. "Ora importa da Apple Watch, Garmin, Polar e più."
3. "Il tuo Lab analizza tutto. L'AI guarda i tuoi dati veri."
4. "Piani predefiniti? Ora gratuiti per tutti."
5. "Pronto? [TAP per iniziare]"

---

## 13. Decisioni chiuse

| # | Decisione | Stato |
|---|---|---|
| Strategia | Pivot da phone-tracker a analytics lab | ✅ Approvata |
| Integrazioni | HealthKit + Health Connect + file upload | ✅ Approvata |
| Backfill | Ultimi 90 giorni | ✅ Approvata |
| Free tier | Piani predefiniti gratis + GPS + history | ✅ Approvata |
| AI Coach | Esteso a Starter | ✅ Approvata |
| Ads | Invariati (banner + interstitial) | ✅ Approvata |
| Lab AI Insights | In cima | ✅ Approvata |
| Brand name | "RunHub" resta | ✅ Approvata |
| Design direction | Scientific Light (con dark optional) | ✅ Approvata |

---

## 14. Aperte / da decidere

| # | Domanda | Owner |
|---|---|---|
| Tab bar redesign | Floating glass o classic? | Federico |
| Onboarding showcase | 5 slide o 3? | Federico |
| Logo refresh | Sì/no/leggero? | Federico |
| Dark mode default | Auto / Light / Dark? | Federico |
| Tagline finale | Tra le 3 candidate? | Federico |
| AI Insight cadenza | Settimanale, daily, post-run? | Federico |
| Phone tracking destination | Dentro Import o resta tab separata "Run"? | Federico |

---

## 15. Reference visivi da consultare

- [Linear](https://linear.app) — minimalismo techy
- Stripe Dashboard — grafici puliti, mono per numeri
- Apple Health (light) — calma, leggibilità
- [Cron](https://cron.com) / [Cal.com](https://cal.com) — micro-tipografia
- [Intervals.icu](https://intervals.icu) — funzionalmente vicino
- NYT Athletics articles — narrativa + grafici

---

*Ultima revisione: 8 giugno 2026 · Federico Bellucci · approvato pivot Lab Edition.*
