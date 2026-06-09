# RunHub 2.0 — Lab Edition · Concept Document

> **Versione**: 1.6.0 "Lab Edition"
> **Stato**: Concept approvato, design in finalizzazione
> **Owner**: Federico Bellucci
> **Ultima revisione**: 8 giugno 2026

---

## 1. Tagline

> **"Importa. Analizza. Migliora."** ← decisione finale 9 giu

Alternative valutate:
- *"Il tuo laboratorio di running. Powered by AI."*
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

### Tab bar definitiva (5 voci, decisione 9 giu)
```
🔬 LAB    📋 SESSIONI    ⌚ IMPORTA    🎯 ALLENAMENTI    👤 PROFILO
```

| Tab | Contenuto |
|---|---|
| **LAB** | Run Score · AI Insight · Traiettoria · Carico · Recupero · Prossimo allenamento — **stop, niente clutter** |
| **SESSIONI** | Lista cronologica + filtri + selezione multipla → "Confronta" come funzione |
| **IMPORTA** | HealthKit · Health Connect · File `.fit/.gpx/.tcx` · Phone GPS (secondary action) |
| **ALLENAMENTI** | Toggle **PIANO ↔ OBIETTIVI** — piano AI + previsione gara + probabilità target |
| **PROFILO** | Account · Abbonamento · Settings · **Analytics** (PR · Weekly Volume · Heatmap · Storico) |

### Cosa scompare
- Tab **History** → diventa lista in SESSIONI
- Tab **Run** primary → diventa secondary action in IMPORTA
- **Confronta** come tab → diventa funzione interna a SESSIONI (selezione multipla)

### Razionale "Obiettivi dentro Allenamenti"
Obiettivi NON va in Profilo: è la risposta motivazionale al "perché?" del piano. Mettere PIANO e OBIETTIVI nello stesso posto crea un loop psicologico potente:

```
OBIETTIVO (10K sotto 50min entro settembre)
  → PROBABILITÀ (76% — sei in time)
  → PIANO settimana (sessioni concrete)
  → motivazione attiva ogni apertura tab
```

### Contenuto schermata Sessione (dettaglio)
- Mappa GPS (mini, tap → full)
- Chip fonte dati: ⌚ Apple Watch / 🅖 Garmin / 📱 Phone / 📄 File
- KPI grid 4+4 (incl. **Cadenza**)
- Grafici Pace / HR / Altitude + opzione overlay
- **Splits per km** (tabella semantica)
- Valutazione AI 8.2/10 + commento
- HR Zones distribution
- Analisi avanzata: GAP · Decoupling · Training Effect · Efficienza
- Confronto: vs ultima · vs media 30g · **vs PR**
- CTA footer: Share · Trova simili · Modifica

---

## 7. Modello free/paid — Lab Edition (4 tier confermati 9 giu)

**Sconto annuale: −20% su tutti i tier paganti**

| Feature | Free | Starter €4,99 | Performance €9,99 | Elite €19,99 |
|---|:---:|:---:|:---:|:---:|
| Import HealthKit / Health Connect | ✅ | ✅ | ✅ | ✅ |
| Dispositivi connessi | **3** | illimitati | illimitati | illimitati |
| File upload `.fit/.gpx/.tcx` | 5/mese | 30/mese | illimitati | illimitati |
| Sincronizzazione automatica | ❌ | ✅ | ✅ | ✅ |
| Storia importata illimitata | ✅ | ✅ | ✅ | ✅ |
| GPS phone tracking | ✅ | ✅ | ✅ | ✅ |
| Dettaglio sessione base (mappa, splits) | ✅ | ✅ | ✅ | ✅ |
| Run Score giornaliero | ✅ | ✅ | ✅ | ✅ |
| **Heatmap** | ✅ | ✅ | ✅ | ✅ |
| AI Insight settimanale | ❌ | ❌ | ✅ | ✅ |
| Training Load (CTL/ATL/TSB) | ❌ | ❌ | ✅ | ✅ |
| HR Zones distribution | ❌ | ✅ | ✅ | ✅ |
| GAP / Decoupling / Training Effect | ❌ | ❌ | ✅ | ✅ |
| Aerobic decoupling avanzato + EF trend + VO2max trend | ❌ | ❌ | ❌ | ✅ |
| Piani predefiniti | ✅ tutti | ✅ | ✅ | ✅ |
| **AI Coach personal plans** | ❌ | ✅ | ✅ | ✅ |
| Adattamento piano settimanale | ❌ | ❌ | ✅ | ✅ |
| Obiettivi gara | 1 | 3 | illimitati | illimitati |
| **Race predictor base** (4 distanze) | ✅ | ✅ | ✅ | ✅ |
| Race predictor + AI suggestions | ❌ | ✅ | ✅ | ✅ avanzato |
| vs Ultima sessione | ✅ | ✅ | ✅ | ✅ |
| vs Media 30 giorni | ❌ | ✅ | ✅ | ✅ |
| vs Miglior performance / PR | ❌ | ❌ | ✅ | ✅ |
| Compare 2 sessioni side-by-side | ❌ | ❌ | ✅ | ✅ |
| Personal Records | ✅ | ✅ | ✅ | ✅ |
| Volume settimanale | ✅ | ✅ | ✅ | ✅ |
| Storico progressi 4+ settimane | ❌ | ✅ | ✅ | ✅ |
| Export dati `.csv` / `.json` | ❌ | ❌ | ❌ | ✅ |
| AI weekly review post-settimana | ❌ | ❌ | ❌ | ✅ |
| Coaching DM con AI (chat) | ❌ | ❌ | ❌ | ✅ |
| Confronto con altri runner (anonimo) | ❌ | ❌ | ❌ | ✅ |
| Banner ads | ✅ | ❌ | ❌ | ❌ |
| Interstitial post-run | 1/5 corse | ❌ | ❌ | ❌ |

**Insight strategico**: Free drasticamente più generoso (Heatmap, PR, Race predictor base, storia illimitata). Il pagamento si sposta verso analisi avanzate, AI Coach personal, training load. Starter sblocca l'AI Coach (decisione cardine).

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
| **Tab bar finale** | LAB · SESSIONI · IMPORTA · ALLENAMENTI · PROFILO | ✅ Approvata 9 giu |
| **Confronta** | Funzione interna SESSIONI (no tab) | ✅ Approvata 9 giu |
| **Obiettivi** | Dentro ALLENAMENTI come toggle con PIANO | ✅ Approvata 9 giu |
| **Hero Lab** | Run Score 82 A- · sotto CARICO/RECUPERO/FATICA (no più FORMA) | ✅ Approvata 9 giu |
| **Palette** | Arancio/Verde/Arancio/Rosso/Blu — **no viola** | ✅ Approvata 9 giu |
| **Lab content** | Minimal: Score+AI+Trend+Carico+Recupero+Next workout | ✅ Approvata 9 giu |
| **Sessione detail** | +Splits +Mappa +Cadenza +Source chip +CTA footer | ✅ Approvata 9 giu |
| **Profilo Analytics** | PR · Weekly Volume · Heatmap · Storico progressi | ✅ Approvata 9 giu |

## 14. Aperte / da decidere

| # | Domanda | Owner |
|---|---|---|
| Naming "Sessioni" | tenuto o cambio in Diario/Storico? | Federico |
| Onboarding showcase | 5 slide o 3? | Federico |
| Logo refresh | Sì/no/leggero? | Federico |
| Dark mode default | Auto / Light / Dark? | Federico |
| Tagline finale | Tra le 3 candidate? | Federico |
| AI Insight cadenza | Settimanale, daily, post-run? | Federico |
| Icona tab "Importa" | Smartwatch+freccia? Plug? Sync? | Federico |
| Toggle Piano/Obiettivi | Layout: segmented control / tab / 2 cards? | Federico |

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
