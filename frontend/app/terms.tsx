import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../src/theme';

// Versione documenti — aggiornare qui quando si modificano i contenuti
const TERMS_VERSION = '2026-04-21';
const EFFECTIVE_DATE = '21 aprile 2026';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Termini di Servizio</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.versionBadge}>Versione {TERMS_VERSION}</Text>
        <Text style={styles.effectiveDate}>Data di efficacia: {EFFECTIVE_DATE}</Text>

        <Text style={styles.intro}>
          I presenti Termini di Servizio (&quot;Termini&quot;) regolano l'accesso e l'utilizzo della piattaforma
          RunHub, comprese le applicazioni mobili, i prodotti, i siti web, la tecnologia, il software
          e i servizi correlati (collettivamente, i &quot;Servizi&quot;). I Termini includono espressamente la
          nostra Privacy Policy e ogni altra policy pubblicata nell'app.
        </Text>

        <Text style={styles.h2}>1. Accettazione</Text>
        <Text style={styles.p}>
          Questi Termini costituiscono un contratto vincolante tra te e RunHub (&quot;RunHub&quot;, &quot;noi&quot;,
          &quot;nostro&quot;). Accettandoli in fase di registrazione, dichiari di averli letti e compresi. Se
          non accetti i Termini, non utilizzare i Servizi.
        </Text>

        <Text style={styles.h2}>2. Account</Text>
        <Text style={styles.h3}>2.1 Età minima</Text>
        <Text style={styles.p}>
          I Servizi sono riservati a persone di almeno <Text style={styles.b}>14 anni</Text> (art. 2-quinquies
          D.Lgs. 196/2003 come modificato dal D.Lgs. 101/2018 — implementazione italiana del GDPR).
          Se sei genitore o tutore di un utente minore di 14 anni, sei pienamente responsabile degli
          atti e omissioni di tale utente.
        </Text>
        <Text style={styles.p}>
          RunHub si riserva il diritto di rifiutare l'accesso ai Servizi, a propria discrezione, a
          utenti al di sotto dell'età minima di legge.
        </Text>

        <Text style={styles.h3}>2.2 Registrazione</Text>
        <Text style={styles.p}>
          Per utilizzare i Servizi devi registrarti e creare un account. Registrandoti accetti di:
          {'\n'}• Fornire informazioni accurate, attuali e complete su di te;
          {'\n'}• Mantenere aggiornate le tue informazioni;
          {'\n'}• Creare un solo account per uso personale e non condividerlo con altri;
          {'\n'}• Garantire che tutte le attività associate al tuo account riflettano attività autentiche
          svolte da te;
          {'\n'}• Consentire a RunHub di sospendere o chiudere l'account in caso di violazione dei Termini.
        </Text>

        <Text style={styles.h3}>2.3 Sicurezza</Text>
        <Text style={styles.p}>
          Sei pienamente responsabile della riservatezza della tua password e della prevenzione di
          accessi non autorizzati. Accetti la piena responsabilità di tutte le attività svolte con il
          tuo account. Devi notificarci immediatamente qualsiasi accesso non autorizzato scrivendo a{' '}
          <Text style={styles.link}>support@secondchancemarket.store</Text>.
        </Text>

        <Text style={styles.h3}>2.4 Integrazioni di terze parti</Text>
        <Text style={styles.p}>
          Puoi registrarti o accedere tramite Google o Apple Sign-In. Autorizzi RunHub a usare tali
          credenziali per compilare le informazioni del tuo account. Puoi anche collegare Apple Health,
          Google Fit/Health Connect, dispositivi wearable, o altri servizi di terze parti.
        </Text>
        <Text style={styles.p}>
          Le informazioni raccolte da tali terze parti sono soggette ai loro termini e policy. RunHub
          non è responsabile dei termini o delle policy delle terze parti.
        </Text>

        <Text style={styles.h2}>3. Abbonamenti e pagamenti</Text>
        <Text style={styles.h3}>3.1 Piani disponibili</Text>
        <Text style={styles.p}>
          RunHub offre un piano gratuito e tre piani a pagamento:
          {'\n'}• <Text style={styles.b}>Starter</Text> — €4,99/mese o €39,99/anno
          {'\n'}• <Text style={styles.b}>Performance</Text> — €8,99/mese o €79,99/anno
          {'\n'}• <Text style={styles.b}>Elite</Text> — €14,99/mese o €129,99/anno
        </Text>
        <Text style={styles.p}>
          RunHub può modificare, aggiungere o interrompere qualsiasi funzionalità gratuita o a
          pagamento in qualsiasi momento, dandone ragionevole preavviso.
        </Text>

        <Text style={styles.h3}>3.2 Metodi di pagamento</Text>
        <Text style={styles.p}>
          I pagamenti sono gestiti esclusivamente tramite:
          {'\n'}• Apple In-App Purchase per gli utenti iOS
          {'\n'}• Google Play Billing per gli utenti Android
          {'\n'}• Stripe per la versione web
        </Text>
        <Text style={styles.p}>
          Tali fornitori gestiscono l'elaborazione del pagamento e noi non memorizziamo dati di carte
          di credito. Autorizzi RunHub (per il tramite dei fornitori) ad addebitare il Metodo di
          Pagamento per le tariffe dovute, comprese eventuali imposte applicabili.
        </Text>

        <Text style={styles.h3}>3.3 Rinnovo automatico</Text>
        <Text style={styles.p}>
          Gli abbonamenti si rinnovano automaticamente all'inizio di ogni ciclo di fatturazione (mensile
          o annuale) e continuano finché non vengono cancellati. L'abbonamento si rinnova salvo disdetta
          almeno 24 ore prima della fine del periodo corrente.
        </Text>

        <Text style={styles.h3}>3.4 Cancellazione</Text>
        <Text style={styles.p}>
          Puoi cancellare l'abbonamento in qualsiasi momento:
          {'\n'}• <Text style={styles.b}>iOS</Text>: Impostazioni &gt; il tuo nome &gt; Abbonamenti
          {'\n'}• <Text style={styles.b}>Android</Text>: Google Play Store &gt; Menu &gt; Abbonamenti
          {'\n'}• <Text style={styles.b}>Web</Text>: Profilo &gt; Account &amp; Privacy &gt; Gestisci abbonamento
        </Text>
        <Text style={styles.p}>
          La cancellazione entra in vigore al termine del ciclo di fatturazione corrente: continuerai
          ad avere accesso alle funzioni premium fino a quella data, dopodiché tornerai al piano gratuito.
        </Text>

        <Text style={styles.h3}>3.5 Diritto di ripensamento (14 giorni)</Text>
        <Text style={styles.p}>
          In quanto consumatore residente nell'Unione Europea, hai il diritto di recedere dall'abbonamento
          entro <Text style={styles.b}>14 giorni</Text> dalla sottoscrizione e ricevere il rimborso completo
          (Codice del Consumo, D.Lgs. 206/2005). Per esercitare il diritto di recesso, contattaci a{' '}
          <Text style={styles.link}>support@secondchancemarket.store</Text>.
        </Text>

        <Text style={styles.h3}>3.6 Rimborsi</Text>
        <Text style={styles.p}>
          Al di fuori del diritto di ripensamento UE, i rimborsi sono gestiti secondo le policy di Apple
          App Store, Google Play o Stripe (a seconda del metodo di acquisto). Per problemi o disservizi,
          contatta{' '}
          <Text style={styles.link}>support@secondchancemarket.store</Text>.
        </Text>

        <Text style={styles.h3}>3.7 Prove gratuite</Text>
        <Text style={styles.p}>
          RunHub può offrire periodi di prova gratuita. Se inizi un abbonamento con prova gratuita,
          l'addebito avverrà al termine della prova salvo disdetta almeno 24 ore prima.
        </Text>

        <Text style={styles.h2}>4. Contenuti</Text>
        <Text style={styles.h3}>4.1 Proprietà dei tuoi contenuti</Text>
        <Text style={styles.p}>
          Per &quot;Contenuti&quot; si intendono testi, immagini, video, percorsi GPS, foto, commenti e altri
          dati che carichi, pubblichi o condividi nell'app. Mantieni la proprietà intellettuale sui tuoi
          Contenuti e dichiari:
          {'\n'}• Di essere proprietario o di avere il diritto di utilizzare tali Contenuti;
          {'\n'}• Che la condivisione non viola diritti di terzi (privacy, copyright, marchi);
          {'\n'}• Di essere responsabile di eventuali royalty, diritti, o obblighi connessi.
        </Text>

        <Text style={styles.h3}>4.2 Licenza a RunHub</Text>
        <Text style={styles.p}>
          Concedi a RunHub una licenza mondiale, non esclusiva, trasferibile, sub-licenziabile, esente
          da royalty per usare, riprodurre, modificare, tradurre, pubblicare e distribuire i tuoi
          Contenuti, il tuo nome utente e l'immagine del profilo nell'ambito dei Servizi e di
          comunicazioni commerciali ad essi collegate.
        </Text>
        <Text style={styles.p}>
          Questa licenza termina quando cancelli i tuoi Contenuti (fatta eccezione per percorsi pubblici,
          segmenti e commenti aggregati, per i quali la licenza resta perpetua dopo anonimizzazione).
        </Text>

        <Text style={styles.h3}>4.3 Responsabilità sui Contenuti</Text>
        <Text style={styles.p}>
          Sei responsabile dei Contenuti che pubblichi. RunHub non approva né avalla alcun Contenuto e
          può, in conformità alle leggi applicabili, monitorare, limitare o rimuovere Contenuti che
          violano questi Termini o le nostre norme della community. Per segnalare contenuti inappropriati
          scrivi a <Text style={styles.link}>support@secondchancemarket.store</Text>.
        </Text>

        <Text style={styles.h2}>5. Uso responsabile del GPS e geolocalizzazione</Text>
        <Text style={styles.p}>
          RunHub è un'app che traccia la tua posizione GPS durante gli allenamenti. Accetti tutti i
          rischi di sicurezza e privacy associati all'uso delle funzionalità di geolocalizzazione,
          incluso il rischio di esporre informazioni sensibili (es. indirizzo di casa se inizi a
          correre da lì).
        </Text>
        <Text style={styles.p}>
          Ti invitiamo a:
          {'\n'}• Utilizzare i <Text style={styles.b}>controlli di privacy</Text> per mascherare gli
          inizi/fine percorso (funzione &quot;Home privacy zone&quot;);
          {'\n'}• Non condividere pubblicamente percorsi che partano da luoghi sensibili;
          {'\n'}• Disattivare il tracking in aree che ritieni private.
        </Text>
        <Text style={styles.p}>
          Maggiori informazioni nella <Text style={styles.link} onPress={() => router.push('/privacy')}>Privacy
          Policy</Text>. RunHub non è responsabile per rischi derivanti da un uso improprio delle funzioni
          di geolocalizzazione.
        </Text>

        <Text style={styles.h2}>6. Avviso sanitario</Text>
        <Text style={styles.p}>
          <Text style={styles.b}>IMPORTANTE</Text>: RunHub fornisce piani di allenamento, coaching AI e
          consigli sportivi di carattere <Text style={styles.b}>educativo e motivazionale</Text>. Questi
          contenuti <Text style={styles.b}>NON costituiscono consulenza medica</Text> e non sostituiscono
          il parere di un medico qualificato.
        </Text>
        <Text style={styles.p}>
          Prima di iniziare qualsiasi programma di allenamento, specialmente se:
          {'\n'}• Hai più di 40 anni o sei sedentario da tempo;
          {'\n'}• Soffri di patologie cardiache, respiratorie, articolari o muscoloscheletriche;
          {'\n'}• Sei in stato di gravidanza o in fase post-parto;
          {'\n'}• Stai assumendo farmaci che influenzano la frequenza cardiaca o la pressione;
        </Text>
        <Text style={styles.p}>
          <Text style={styles.b}>consulta un medico</Text>. In caso di malessere durante l'allenamento,
          interrompi immediatamente e cerca assistenza medica. RunHub non è responsabile per infortuni
          o problemi di salute derivanti dall'uso del servizio.
        </Text>

        <Text style={styles.h2}>7. AI Coach</Text>
        <Text style={styles.p}>
          RunHub utilizza intelligenza artificiale (modello Claude di Anthropic) per generare piani di
          allenamento personalizzati. Le tecnologie AI hanno rischi e limiti: i piani generati potrebbero
          contenere errori, imprecisioni o suggerimenti non adatti alle tue condizioni.
        </Text>
        <Text style={styles.p}>
          Utilizzi l'AI Coach a tuo rischio. Usa sempre buon senso e giudizio prima di seguire
          raccomandazioni AI, e consulta un medico o un allenatore qualificato in caso di dubbi.
        </Text>

        <Text style={styles.h2}>8. Funzione social e community</Text>
        <Text style={styles.p}>
          RunHub include funzioni sociali (amici, feed, commenti, like, classifiche). Sei tenuto a:
          {'\n'}• Rispettare gli altri utenti: no insulti, molestie, discriminazioni;
          {'\n'}• Non condividere contenuti illegali, osceni, violenti o di odio;
          {'\n'}• Non impersonare altre persone o imprese;
          {'\n'}• Non inviare spam o contenuti commerciali non autorizzati.
        </Text>
        <Text style={styles.p}>
          RunHub non è responsabile delle interazioni tra utenti e non verifica identità, qualifiche o
          background degli altri utenti. Usa il buon senso.
        </Text>

        <Text style={styles.h2}>9. Uso personale</Text>
        <Text style={styles.p}>
          I Servizi sono per uso personale. Non puoi: (a) far pagare ad altri per l'accesso ai Servizi;
          (b) usare i Servizi per scopi commerciali senza autorizzazione scritta; (c) accedere tramite
          bot, scraping o automazioni; (d) effettuare reverse engineering del software; (e) falsificare
          dati di allenamento, classifiche o profili.
        </Text>

        <Text style={styles.h2}>10. Proprietà intellettuale di RunHub</Text>
        <Text style={styles.p}>
          Il nome &quot;RunHub&quot;, il logo, il look&amp;feel dei Servizi, nonché tutti gli algoritmi, i
          contenuti generati dall'app (es. piani predefiniti), le performance metrics e i design, sono
          di proprietà esclusiva di RunHub e tutelati dalle leggi sulla proprietà intellettuale.
        </Text>
        <Text style={styles.p}>
          Ti concediamo una licenza limitata, personale, revocabile, non trasferibile e non esclusiva
          per accedere ai Servizi. Non puoi modificare, copiare, distribuire, vendere o creare opere
          derivate dai Servizi salvo autorizzazione scritta.
        </Text>

        <Text style={styles.h2}>11. Esclusione di garanzie</Text>
        <Text style={styles.p}>
          I SERVIZI SONO FORNITI &quot;COSÌ COME SONO&quot; E &quot;COME DISPONIBILI&quot;, SENZA ALCUNA
          GARANZIA, ESPLICITA O IMPLICITA. RUNHUB NON GARANTISCE CHE I SERVIZI SIANO PRIVI DI ERRORI,
          SEMPRE DISPONIBILI, O CHE SODDISFINO LE TUE ASPETTATIVE.
        </Text>
        <Text style={styles.p}>
          L'uso dei Servizi e le attività sportive connesse (inclusi allenamenti seguiti in base ai
          piani RunHub) sono a tuo rischio esclusivo. Sarai l'unico responsabile di eventuali infortuni,
          danni o perdite derivanti dal tuo utilizzo.
        </Text>

        <Text style={styles.h2}>12. Limitazione di responsabilità</Text>
        <Text style={styles.p}>
          Nei limiti consentiti dalla legge italiana, accetti che RunHub non sarà responsabile per
          danni diretti, indiretti, incidentali, speciali, punitivi o consequenziali derivanti
          dall'uso o impossibilità di uso dei Servizi.
        </Text>
        <Text style={styles.p}>
          La responsabilità massima aggregata di RunHub nei tuoi confronti sarà limitata al maggiore
          tra: (a) <Text style={styles.b}>€50</Text>, oppure (b) l'importo degli abbonamenti pagati da
          te nei 12 mesi precedenti l'evento che ha originato il reclamo.
        </Text>
        <Text style={styles.p}>
          Nulla di quanto previsto in questi Termini esclude o limita la responsabilità di RunHub in
          caso di dolo o colpa grave, ai sensi del Codice Civile italiano.
        </Text>

        <Text style={styles.h2}>13. Manleva</Text>
        <Text style={styles.p}>
          Accetti di tenere indenne RunHub, i suoi affiliati, amministratori e dipendenti da qualsiasi
          richiesta di terzi derivante da: (a) Contenuti che pubblichi; (b) tue attività sportive
          tracciate con l'app; (c) tue violazioni dei Termini o di leggi applicabili; (d) tue violazioni
          dei diritti di terzi.
        </Text>

        <Text style={styles.h2}>14. Risoluzione e chiusura account</Text>
        <Text style={styles.p}>
          RunHub può sospendere o chiudere il tuo account senza preavviso in caso di:
          {'\n'}• Violazioni di questi Termini o delle policy della community;
          {'\n'}• Richieste di autorità giudiziarie o di polizia;
          {'\n'}• Problemi tecnici o di sicurezza;
          {'\n'}• Inattività prolungata (oltre 24 mesi);
          {'\n'}• Mancato pagamento di eventuali corrispettivi dovuti.
        </Text>
        <Text style={styles.p}>
          Puoi cancellare autonomamente il tuo account in qualsiasi momento dalla sezione{' '}
          <Text style={styles.b}>Profilo &gt; Account &amp; Privacy &gt; Elimina account</Text>. La
          cancellazione rimuove in modo permanente i tuoi dati entro 30 giorni.
        </Text>

        <Text style={styles.h2}>15. Modifiche ai Termini</Text>
        <Text style={styles.p}>
          RunHub può aggiornare questi Termini in qualsiasi momento. In caso di modifiche sostanziali,
          riceverai notifica via email o nell'app almeno 30 giorni prima dell'entrata in vigore. Se
          continui a usare i Servizi dopo tale data, accetti le modifiche. In caso contrario puoi
          chiudere il tuo account.
        </Text>

        <Text style={styles.h2}>16. Legge applicabile e foro competente</Text>
        <Text style={styles.p}>
          Questi Termini sono regolati dalla <Text style={styles.b}>legge italiana</Text>. Per qualsiasi
          controversia, il foro competente è quello di <Text style={styles.b}>Ancona</Text>, salvo che
          tu non sia un consumatore, nel qual caso sarà competente il foro del tuo luogo di residenza o
          domicilio elettivo (art. 66-bis Cod. Cons.).
        </Text>
        <Text style={styles.p}>
          Nell'ambito dell'Unione Europea, hai inoltre diritto a ricorrere alla{' '}
          <Text style={styles.b}>piattaforma ODR (Online Dispute Resolution)</Text> della Commissione
          Europea: <Text style={styles.link}>ec.europa.eu/consumers/odr</Text>
        </Text>

        <Text style={styles.h2}>17. Contatti</Text>
        <Text style={styles.p}>
          Per qualsiasi domanda sui Termini di Servizio:
          {'\n'}• Supporto: <Text style={styles.link}>support@secondchancemarket.store</Text>
          {'\n'}• Informazioni: <Text style={styles.link}>info@secondchancemarket.store</Text>
        </Text>

        <Text style={styles.h2}>18. Disposizioni generali</Text>
        <Text style={styles.p}>
          Nessuna joint venture, partnership o rapporto di agenzia nasce tra te e RunHub per effetto
          dell'uso dei Servizi. Questi Termini costituiscono l'intero accordo tra le parti. Il mancato
          esercizio di un diritto non costituisce rinuncia. Se una clausola è dichiarata invalida, le
          restanti restano in vigore.
        </Text>
        <Text style={styles.p}>
          Non puoi cedere o trasferire il tuo account o i tuoi diritti a terzi senza consenso scritto
          di RunHub.
        </Text>

        <Text style={styles.finalNote}>
          Grazie per aver scelto RunHub. Buon allenamento! 🏃‍♂️
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
