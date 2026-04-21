import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../src/theme';

const PRIVACY_VERSION = '2026-04-21';
const EFFECTIVE_DATE = '21 aprile 2026';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.versionBadge}>Versione {PRIVACY_VERSION}</Text>
        <Text style={styles.effectiveDate}>Data di efficacia: {EFFECTIVE_DATE}</Text>

        <Text style={styles.intro}>
          La presente Privacy Policy descrive come RunHub (&quot;noi&quot;, &quot;RunHub&quot;) raccoglie,
          utilizza, condivide e protegge le tue informazioni personali, nonché come puoi esercitare i
          tuoi diritti. Conforme al <Text style={styles.b}>Regolamento UE 2016/679 (GDPR)</Text> e al{' '}
          <Text style={styles.b}>D.Lgs. 196/2003 come modificato dal D.Lgs. 101/2018</Text> (Codice
          Privacy italiano).
        </Text>

        <Text style={styles.h2}>1. Titolare del trattamento</Text>
        <Text style={styles.p}>
          Il titolare del trattamento dei dati è <Text style={styles.b}>RunHub</Text>. Per qualsiasi
          domanda privacy o esercizio dei tuoi diritti:
          {'\n'}• Email generale: <Text style={styles.link}>support@secondchancemarket.store</Text>
          {'\n'}• Data Protection Officer (DPO): <Text style={styles.link}>support@secondchancemarket.store</Text>
          {'\n'}• Informazioni commerciali: <Text style={styles.link}>info@secondchancemarket.store</Text>
        </Text>
        <Text style={styles.p}>
          Sotto questa Privacy Policy, RunHub agisce come <Text style={styles.b}>titolare del trattamento</Text>{' '}
          (&quot;data controller&quot;). Decidiamo noi come raccogliere e processare le informazioni personali.
        </Text>

        <Text style={styles.h2}>2. Informazioni che raccogliamo</Text>

        <Text style={styles.h3}>2.1 Dati che fornisci direttamente</Text>
        <Text style={styles.p}>
          <Text style={styles.b}>Dati di account</Text>: email, password (salvata come hash bcrypt, mai
          in chiaro), nome, data di nascita (per verificare età minima 14+), data di registrazione.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.b}>Dati di profilo</Text>: foto profilo, peso, altezza (facoltativi),
          tipologie di sport preferite, obiettivi, livello di esperienza.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.b}>Contenuti condivisi</Text>: commenti, like, post nel feed, foto caricate
          nelle attività.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.b}>Dati di supporto</Text>: informazioni incluse nei ticket di assistenza
          inviati a <Text style={styles.link}>support@secondchancemarket.store</Text>.
        </Text>

        <Text style={styles.h3}>2.2 Dati raccolti dall'uso dei Servizi</Text>
        <Text style={styles.p}>
          <Text style={styles.b}>Dati delle attività</Text>: registrazioni di allenamenti, distanza,
          durata, velocità, pace, cadenza, dislivello, tracce GPS. Inclusi dati di frequenza cardiaca
          se fornisci il consenso al collegamento di wearables o Apple Health/Google Fit.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.b}>Informazioni di geolocalizzazione</Text>: per il corretto funzionamento
          delle funzioni GPS, ti chiediamo il permesso di accedere alla posizione precisa del dispositivo.
          Puoi revocare questo permesso in qualsiasi momento dalle impostazioni del tuo dispositivo.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.b}>Dati di utilizzo</Text>: partecipazione a sfide, like e commenti
          effettuati, amicizie, accessi al profilo altrui, utilizzo di funzionalità.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.b}>Performance metrics</Text>: metriche calcolate da noi sui tuoi dati
          (es. VO2max stimato, predizione tempi gara, tendenza forma fisica).
        </Text>
        <Text style={styles.p}>
          <Text style={styles.b}>Informazioni sul dispositivo</Text>: modello device, sistema
          operativo, versione app, identificatore dispositivo anonimo, log di crash.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.b}>Token per notifiche push</Text>: tramite Expo Push Service, se
          acconsenti a ricevere notifiche.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.b}>Cookie e tecnologie di tracciamento</Text> (solo web): cookie tecnici
          essenziali per la sessione (JWT) e analytics anonimi aggregati.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.b}>Informazioni di pagamento</Text>: ultime 4 cifre della carta di
          credito (fornite dai processori). <Text style={styles.b}>NON</Text> memorizziamo il numero
          completo di carta. I pagamenti sono gestiti da:
          {'\n'}• <Text style={styles.b}>Apple</Text> (iOS In-App Purchase)
          {'\n'}• <Text style={styles.b}>Google</Text> (Play Billing)
          {'\n'}• <Text style={styles.b}>Stripe</Text> (web — certificato PCI-DSS livello 1)
          {'\n'}• <Text style={styles.b}>RevenueCat</Text> (aggregatore IAP Apple/Google)
        </Text>

        <Text style={styles.h3}>2.3 Dati da integrazioni di terze parti</Text>
        <Text style={styles.p}>
          <Text style={styles.b}>Wearables e app connesse</Text>: se colleghi Apple Health, Google Fit,
          Garmin o altri dispositivi, possiamo raccogliere: passi, distanza, battito cardiaco, calorie,
          VO2max, dati sonno (solo se fornisci consenso esplicito).
        </Text>
        <Text style={styles.p}>
          <Text style={styles.b}>I dati sanitari</Text> (es. frequenza cardiaca) non vengono mai:
          {'\n'}• Venduti a terzi;
          {'\n'}• Usati per pubblicità personalizzata;
          {'\n'}• Condivisi senza tuo consenso esplicito.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.b}>Accessi tramite Google / Apple Sign-In</Text>: raccogliamo solo
          nome, email e avatar. Nulla di più.
        </Text>

        <Text style={styles.h2}>3. Finalità e base giuridica del trattamento</Text>

        <Text style={styles.h3}>3.1 Fornire i Servizi (base: contratto - Art. 6.1.b GDPR)</Text>
        <Text style={styles.p}>
          • Creare e gestire il tuo account
          {'\n'}• Processare i tuoi abbonamenti
          {'\n'}• Registrare e analizzare le tue attività sportive
          {'\n'}• Generare piani di allenamento personalizzati (inclusa AI Coach)
          {'\n'}• Abilitare il tracciamento GPS
          {'\n'}• Personalizzare la tua esperienza (suggerimenti percorsi, sfide)
          {'\n'}• Facilitare le interazioni social (amici, feed, classifiche)
          {'\n'}• Visualizzare attività e heatmap
          {'\n'}• Contattarti per comunicazioni di servizio (cambi ai Termini, notifiche critiche)
        </Text>

        <Text style={styles.h3}>3.2 Assistenza e richieste (base: contratto / legittimo interesse)</Text>
        <Text style={styles.p}>
          Rispondere alle tue richieste di supporto, inclusa la verifica della tua identità per
          operazioni sensibili (es. cambio email, cancellazione account).
        </Text>

        <Text style={styles.h3}>3.3 Migliorare e analizzare i Servizi (base: legittimo interesse)</Text>
        <Text style={styles.p}>
          • Analytics aggregati anonimizzati sul comportamento dell'app
          {'\n'}• Ricerca e sviluppo di nuove funzionalità
          {'\n'}• Ottimizzazione e troubleshooting
          {'\n'}• Sviluppo di modelli di machine learning per AI Coach (usando dati aggregati e
          de-identificati dove possibile)
        </Text>

        <Text style={styles.h3}>3.4 Marketing e pubblicità (base: consenso - Art. 6.1.a GDPR)</Text>
        <Text style={styles.p}>
          Inviamo email promozionali solo se hai acconsentito. Puoi ritirare il consenso in qualsiasi
          momento dalle impostazioni del profilo o cliccando &quot;unsubscribe&quot; nelle email.
        </Text>
        <Text style={styles.p}>
          Sul piano gratuito mostriamo <Text style={styles.b}>annunci Google AdMob</Text>. Su iOS, ti
          viene chiesto il consenso al tracking (App Tracking Transparency). L'adversing ID può essere
          usato per personalizzare gli annunci (disattivabile dalle impostazioni iOS/Android).
        </Text>

        <Text style={styles.h3}>3.5 Protezione e sicurezza (base: legittimo interesse / obbligo legale)</Text>
        <Text style={styles.p}>
          Rilevare e prevenire frodi, abusi, spam, account falsi o attività illecite. Proteggere i
          nostri utenti, la nostra proprietà e i nostri diritti. Rispondere a richieste di autorità
          giudiziarie o di polizia legittime.
        </Text>

        <Text style={styles.h3}>3.6 Verifica età minori (base: obbligo legale)</Text>
        <Text style={styles.p}>
          Usiamo la tua data di nascita per verificare che tu abbia almeno 14 anni, in conformità alla
          normativa italiana. I dati dei minori godono di protezioni rafforzate.
        </Text>

        <Text style={styles.h3}>3.7 Obblighi legali e fiscali (base: obbligo legale)</Text>
        <Text style={styles.p}>
          Conservare le fatture degli abbonamenti per 10 anni, rispondere a indagini tributarie o
          controlli fiscali.
        </Text>

        <Text style={styles.h2}>4. Come condividiamo le tue informazioni</Text>

        <Text style={styles.h3}>4.1 Visibilità agli altri utenti</Text>
        <Text style={styles.p}>
          I tuoi contenuti possono essere visibili ad altri utenti RunHub e al pubblico, a seconda
          delle tue impostazioni di privacy. Per default, i profili degli utenti maggiorenni sono{' '}
          <Text style={styles.b}>pubblici</Text>. Per i minori di 18 anni le impostazioni di default sono{' '}
          <Text style={styles.b}>privacy rinforzata</Text>.
        </Text>
        <Text style={styles.p}>
          Puoi sempre modificare privacy controls dal tuo profilo. Sei responsabile della natura
          pubblica dei contenuti che pubblichi con impostazioni pubbliche.
        </Text>

        <Text style={styles.h3}>4.2 Fornitori di servizi (Data Processors)</Text>
        <Text style={styles.p}>
          Condividiamo dati con i seguenti fornitori, tutti vincolati da clausole di riservatezza e
          conformi al GDPR (DPA - Data Processing Agreement):
        </Text>
        <Text style={styles.p}>
          • <Text style={styles.b}>MongoDB Atlas</Text> (Irlanda/UE) — database principale
          {'\n'}• <Text style={styles.b}>Render.com</Text> (USA) — hosting backend (trasferimento via SCC)
          {'\n'}• <Text style={styles.b}>Stripe, Inc.</Text> (USA/Irlanda) — processore pagamenti web
          {'\n'}• <Text style={styles.b}>RevenueCat, Inc.</Text> (USA) — gestione IAP iOS/Android
          {'\n'}• <Text style={styles.b}>Anthropic PBC</Text> (USA) — AI Coach (i prompt sono
          anonimizzati, non contengono email/nomi)
          {'\n'}• <Text style={styles.b}>Resend</Text> (USA) — invio email transazionali
          {'\n'}• <Text style={styles.b}>Expo (Exponent Inc.)</Text> (USA) — notifiche push
          {'\n'}• <Text style={styles.b}>Google AdMob</Text> (Irlanda) — annunci su piano free
          {'\n'}• <Text style={styles.b}>Mapbox</Text> (USA) — mappe e heatmap
          {'\n'}• <Text style={styles.b}>Apple Health / Google Fit</Text> — sync wearables (solo con tuo consenso)
        </Text>

        <Text style={styles.h3}>4.3 Sponsor e partner (solo con consenso)</Text>
        <Text style={styles.p}>
          Se partecipi a una sfida sponsorizzata, possiamo condividere con lo sponsor: nome utente,
          avatar, distanza/tempo sulla sfida. Non condividiamo altri dati personali senza il tuo
          consenso esplicito.
        </Text>

        <Text style={styles.h3}>4.4 Trasferimenti di business</Text>
        <Text style={styles.p}>
          In caso di fusione, acquisizione, bancarotta o riorganizzazione, i tuoi dati possono essere
          trasferiti al successore, che continuerà a rispettare questa Privacy Policy. Sarai notificato
          in caso di cambio del titolare del trattamento.
        </Text>

        <Text style={styles.h3}>4.5 Obblighi legali e prevenzione danni</Text>
        <Text style={styles.p}>
          Possiamo conservare, disvelare o condividere tue informazioni con autorità, polizia giudiziaria,
          o altri soggetti pubblici/privati se:
          {'\n'}• Obbligati dalla legge (ordini di autorità, mandati, citazioni);
          {'\n'}• Necessario per prevenire morte, lesioni gravi o danni;
          {'\n'}• Per prevenire o rilevare violazioni dei Termini, frodi, abusi;
          {'\n'}• Per proteggere operazioni, proprietà o diritti di RunHub.
        </Text>

        <Text style={styles.h3}>4.6 Non vendiamo i tuoi dati</Text>
        <Text style={styles.p}>
          <Text style={styles.b}>RunHub non vende i tuoi dati personali a terzi</Text> per scopi
          commerciali o di marketing. Mai.
        </Text>

        <Text style={styles.h2}>5. Trasferimenti extra-UE</Text>
        <Text style={styles.p}>
          Alcuni fornitori (Stripe, Anthropic, RevenueCat, Render) hanno sede o server negli Stati
          Uniti. Tali trasferimenti avvengono sulla base di:
          {'\n'}• <Text style={styles.b}>Clausole Contrattuali Standard (SCC)</Text> approvate dalla
          Commissione Europea;
          {'\n'}• <Text style={styles.b}>EU-US Data Privacy Framework</Text> (dove applicabile);
          {'\n'}• <Text style={styles.b}>Decisioni di adeguatezza</Text> dove disponibili.
        </Text>
        <Text style={styles.p}>
          Puoi richiedere copia di queste garanzie scrivendo a{' '}
          <Text style={styles.link}>support@secondchancemarket.store</Text>.
        </Text>

        <Text style={styles.h2}>6. Conservazione dei dati</Text>
        <Text style={styles.p}>
          Conserviamo i tuoi dati solo per il tempo necessario a fornire i Servizi e rispettare gli
          obblighi di legge:
        </Text>
        <Text style={styles.p}>
          • <Text style={styles.b}>Dati account</Text>: finché l'account è attivo + 30 giorni dopo la
          cancellazione richiesta
          {'\n'}• <Text style={styles.b}>Allenamenti e attività</Text>: indefinito (cancellabili
          manualmente o con l'account)
          {'\n'}• <Text style={styles.b}>Fatture e pagamenti</Text>: 10 anni (obbligo fiscale italiano)
          {'\n'}• <Text style={styles.b}>Log tecnici e di sicurezza</Text>: 90 giorni
          {'\n'}• <Text style={styles.b}>Dati consent history</Text>: 3 anni dopo cancellazione account
          (per prova GDPR Art. 7)
          {'\n'}• <Text style={styles.b}>Dati aggregati anonimizzati</Text>: indefinito
        </Text>

        <Text style={styles.h2}>7. I tuoi diritti (GDPR)</Text>
        <Text style={styles.p}>
          Hai diritto di esercitare i seguenti diritti (Art. 15-22 GDPR):
        </Text>

        <Text style={styles.h3}>7.1 Diritto di accesso e portabilità (Art. 15 e 20)</Text>
        <Text style={styles.p}>
          Puoi scaricare un file JSON con <Text style={styles.b}>tutti i tuoi dati</Text> dalla sezione{' '}
          <Text style={styles.b}>Profilo → Account &amp; Privacy → Scarica i miei dati</Text>.
        </Text>

        <Text style={styles.h3}>7.2 Diritto di rettifica (Art. 16)</Text>
        <Text style={styles.p}>
          Modifica i dati errati dal tuo profilo in qualsiasi momento.
        </Text>

        <Text style={styles.h3}>7.3 Diritto alla cancellazione / oblio (Art. 17)</Text>
        <Text style={styles.p}>
          Puoi cancellare il tuo account dalla sezione{' '}
          <Text style={styles.b}>Profilo → Account &amp; Privacy → Elimina Account</Text>. La
          cancellazione rimuove tutti i dati entro 30 giorni, eccetto quelli che siamo obbligati a
          conservare per legge (fatture fiscali per 10 anni, anonimizzate).
        </Text>

        <Text style={styles.h3}>7.4 Diritto di limitazione del trattamento (Art. 18)</Text>
        <Text style={styles.p}>
          Puoi chiederci di limitare il trattamento in casi specifici (es. contestazione accuratezza
          dati). Scrivi a <Text style={styles.link}>support@secondchancemarket.store</Text>.
        </Text>

        <Text style={styles.h3}>7.5 Diritto di opposizione (Art. 21)</Text>
        <Text style={styles.p}>
          Puoi opporti al trattamento basato su legittimo interesse o marketing diretto, inclusa la
          disattivazione delle email promozionali (&quot;Unsubscribe&quot;) e degli annunci
          personalizzati.
        </Text>

        <Text style={styles.h3}>7.6 Diritto di revoca del consenso (Art. 7.3)</Text>
        <Text style={styles.p}>
          Puoi revocare in qualsiasi momento i consensi specifici prestati (es. Apple Health, notifiche,
          marketing). La revoca non pregiudica la liceità del trattamento precedente.
        </Text>

        <Text style={styles.h3}>7.7 Diritto di reclamo all'Autorità di controllo</Text>
        <Text style={styles.p}>
          Se ritieni che il trattamento violi la normativa, puoi presentare reclamo al{' '}
          <Text style={styles.b}>Garante per la protezione dei dati personali</Text>:
          {'\n'}• Sito: <Text style={styles.link}>garanteprivacy.it</Text>
          {'\n'}• Indirizzo: Piazza Venezia 11, 00187 Roma
          {'\n'}• Email: <Text style={styles.link}>protocollo@gpdp.it</Text>
        </Text>

        <Text style={styles.h3}>7.8 Decisioni automatizzate</Text>
        <Text style={styles.p}>
          L'AI Coach genera suggerimenti personalizzati, ma nessuna decisione con effetti legali o
          significativi viene presa <Text style={styles.b}>solo</Text> su base automatizzata.
        </Text>

        <Text style={styles.h2}>8. Privacy dei minori</Text>
        <Text style={styles.p}>
          RunHub richiede un'età minima di <Text style={styles.b}>14 anni</Text> (art. 2-quinquies
          Codice Privacy italiano). <Text style={styles.b}>Se hai meno di 14 anni, non utilizzare i
          Servizi</Text>.
        </Text>
        <Text style={styles.p}>
          Per gli utenti tra i 14 e i 18 anni applichiamo protezioni rafforzate:
          {'\n'}• Profilo privato per default;
          {'\n'}• Messaggistica diretta ristretta;
          {'\n'}• Niente annunci personalizzati;
          {'\n'}• Nessuna condivisione con partner commerciali.
        </Text>
        <Text style={styles.p}>
          Se scopriamo un account di utente sotto i 14 anni, lo eliminiamo immediatamente. Se sei
          genitore o tutore e ritieni che il tuo figlio abbia fornito dati senza consenso, contattaci a{' '}
          <Text style={styles.link}>support@secondchancemarket.store</Text>.
        </Text>

        <Text style={styles.h2}>9. Sicurezza dei dati</Text>
        <Text style={styles.p}>
          Adottiamo misure tecniche e organizzative adeguate (Art. 32 GDPR):
          {'\n'}• Connessioni cifrate TLS 1.2+;
          {'\n'}• Password hashate con <Text style={styles.b}>bcrypt</Text> (non reversibili);
          {'\n'}• Backup giornalieri cifrati;
          {'\n'}• Accesso admin limitato a personale autorizzato;
          {'\n'}• Audit log per eventi sensibili (login, cambi password, pagamenti);
          {'\n'}• Segregazione ambienti dev/staging/produzione;
          {'\n'}• Incident response plan in caso di data breach (notifica al Garante entro 72h, Art. 33).
        </Text>

        <Text style={styles.h2}>10. Cookie e tecnologie di tracciamento (web)</Text>
        <Text style={styles.p}>
          La versione web utilizza cookie tecnici essenziali (sessione JWT) obbligatori per il
          funzionamento. Usiamo cookie analytics anonimi aggregati (no profilazione individuale).
          Nessun cookie pubblicitario di terze parti è attivo senza tuo consenso.
        </Text>
        <Text style={styles.p}>
          Per maggiori dettagli e gestione preferenze, vedi la sezione &quot;Cookie settings&quot; nel footer del sito web.
        </Text>

        <Text style={styles.h2}>11. Modifiche alla Privacy Policy</Text>
        <Text style={styles.p}>
          Ci riserviamo il diritto di aggiornare questa Privacy Policy. Eventuali modifiche
          significative saranno comunicate via email o tramite notifica in-app almeno{' '}
          <Text style={styles.b}>30 giorni prima</Text> dell'entrata in vigore, con richiesta di
          ri-accettazione dove necessario.
        </Text>

        <Text style={styles.h2}>12. Contatti</Text>
        <Text style={styles.p}>
          Per qualsiasi questione privacy, richiesta di esercizio diritti o segnalazione data breach:
        </Text>
        <Text style={styles.p}>
          • Generale: <Text style={styles.link}>support@secondchancemarket.store</Text>
          {'\n'}• Data Protection Officer (DPO): <Text style={styles.link}>support@secondchancemarket.store</Text>
          {'\n'}• Informazioni commerciali: <Text style={styles.link}>info@secondchancemarket.store</Text>
        </Text>
        <Text style={styles.p}>
          Risponderemo alle tue richieste entro <Text style={styles.b}>30 giorni</Text> (Art. 12 GDPR),
          prorogabili di ulteriori 60 giorni in casi di particolare complessità.
        </Text>

        <Text style={styles.finalNote}>
          La tua privacy è importante per noi. Grazie per la fiducia. 🔒
        </Text>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },
  versionBadge: {
    alignSelf: 'flex-start',
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.xs,
  },
  effectiveDate: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.md, fontStyle: 'italic' },
  intro: { color: colors.textPrimary, fontSize: 15, lineHeight: 22, marginBottom: spacing.md },
  h2: { color: colors.primary, fontSize: 19, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.sm },
  h3: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.xs },
  p: { color: colors.textPrimary, fontSize: 14, lineHeight: 22, marginBottom: spacing.sm },
  b: { fontWeight: '700' },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  finalNote: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontStyle: 'italic',
  },
});
