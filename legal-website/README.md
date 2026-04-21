# 🌐 RunHub Legal Website

Sito web pubblico per ospitare Termini, Privacy Policy e landing page di RunHub.

**Dominio di destinazione**: `https://apprunhub.com`

## 📁 Struttura

```
legal-website/
├── index.html      # Landing page (https://apprunhub.com)
├── terms.html      # Termini di Servizio (https://apprunhub.com/terms)
├── privacy.html    # Privacy Policy (https://apprunhub.com/privacy)
├── vercel.json     # Config routing + security headers
└── README.md
```

## 🚀 Deploy su Vercel (consigliato, 10 minuti)

### Step 1 — Account Vercel
1. Vai su [vercel.com](https://vercel.com) e registrati con GitHub (gratis)
2. Conferma email

### Step 2 — Deploy via CLI (rapido)

Dal tuo Mac:
```bash
npm install -g vercel
cd /path/to/RunHub/legal-website
vercel login            # apri browser, login
vercel                  # primo deploy (chiede 3-4 domande, rispondi enter)
vercel --prod           # deploy in produzione
```

Vercel ti darà un URL tipo `https://runhub-legal.vercel.app`. Testa che funzioni.

### Step 3 — Collega il dominio `apprunhub.com`

1. Su Vercel Dashboard → apri il progetto appena creato
2. **Settings → Domains**
3. Clicca **Add** → inserisci `apprunhub.com`
4. Vercel ti darà 2 record DNS da configurare:
   - Record A: `76.76.21.21` (per il dominio root)
   - Record CNAME: `cname.vercel-dns.com` (per il www)
5. Vai sul tuo **registrar del dominio** (dove hai comprato `apprunhub.com`) e aggiungi questi record DNS
6. Aspetta 5-60 minuti per la propagazione DNS
7. Su Vercel: clicca **Refresh** → dovrebbe diventare verde ✅

### Step 4 — Verifica

Apri queste URL nel browser:
- ✅ `https://apprunhub.com` → landing page
- ✅ `https://apprunhub.com/terms` → Termini di Servizio
- ✅ `https://apprunhub.com/privacy` → Privacy Policy

## 🚀 Alternative: Deploy con drag-and-drop (ancora più veloce)

1. Vai su [vercel.com/new](https://vercel.com/new)
2. Trascina la cartella `legal-website` nell'area di upload
3. Click **Deploy**
4. Pronto in 30 secondi

Poi collega il dominio come nello Step 3.

## 🔐 Verifica Resend del dominio (per email transazionali)

Per far partire le email da `noreply@apprunhub.com`, su Resend Dashboard:

1. **Domains → Add Domain** → `apprunhub.com`
2. Resend ti dà 3 record DNS da aggiungere (sul tuo registrar):
   - `TXT` per SPF
   - `TXT` per DKIM
   - `MX` per return path
3. Aggiungi i record sul tuo DNS manager
4. Aspetta 15-30 minuti
5. Su Resend clicca **Verify** → dovrebbe diventare verde
6. Ora `noreply@apprunhub.com` può inviare email

## 📝 Versioning

Aggiornare i contenuti:

1. Modifica `terms.html` o `privacy.html`
2. Aggiorna la versione nel badge (es: da `2026-04-21` a `2026-05-10`)
3. Aggiorna la data di efficacia
4. Commit + push → Vercel redeploya automaticamente
5. Aggiorna anche `/app/frontend/app/terms.tsx` e `privacy.tsx` con la stessa versione
6. Aggiorna `/app/frontend/app/(auth)/register.tsx` con le nuove costanti `TERMS_VERSION` e `PRIVACY_VERSION`

## 🆘 Troubleshooting

### DNS non si propaga
- Aspetta fino a 24-48h in casi rari
- Verifica con: `dig apprunhub.com` (Mac/Linux)

### Vercel dice "Invalid Configuration"
- Assicurati che `vercel.json` sia nella root della cartella `legal-website`

### Dominio non raggiungibile
- Verifica che i DNS siano esattamente come da Vercel (spesso è un typo)
- Prova su [dnschecker.org](https://dnschecker.org) per vedere la propagazione globale
