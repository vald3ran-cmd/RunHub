import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../src/theme';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Termini di Servizio</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.updated}>Ultimo aggiornamento: 20 aprile 2026</Text>

        <Text style={styles.h2}>1. Accettazione dei termini</Text>
        <Text style={styles.p}>
          Utilizzando l'app RunHub ("il Servizio"), accetti integralmente i presenti Termini di Servizio. 
          Se non accetti, non utilizzare il Servizio.
        </Text>

        <Text style={styles.h2}>2. Descrizione del Servizio</Text>
        <Text style={styles.p}>
          RunHub è un'applicazione di running con tracciamento GPS, piani di allenamento personalizzati,
          AI Coach, funzionalità social e integrazione con wearables. Il Servizio è disponibile in versione
          gratuita e a pagamento (Starter, Performance, Elite).
        </Text>

        <Text style={styles.h2}>3. Account utente</Text>
        <Text style={styles.p}>
          Per utilizzare il Servizio devi creare un account fornendo email e password, oppure tramite
          Google / Apple Sign In. Sei responsabile della sicurezza del tuo account. Non puoi cedere il tuo
          account a terzi. Devi avere almeno 13 anni (o l'età minima prevista dalla legge del tuo paese).
        </Text>

        <Text style={styles.h2}>4. Abbonamenti a pagamento</Text>
        <Text style={styles.p}>
          Gli abbonamenti Starter, Performance ed Elite sono rinnovati automaticamente alla scadenza
          (mensile o annuale) salvo disdetta. I pagamenti sono gestiti tramite:
          {'\n'}• Apple In-App Purchase (iOS)
          {'\n'}• Google Play Billing (Android)
          {'\n'}• Stripe (web)
        </Text>
        <Text style={styles.p}>
          Per disdire:
          {'\n'}• iOS: Impostazioni → [il tuo nome] → Abbonamenti
          {'\n'}• Android: Play Store → Menu → Pagamenti e abbonamenti → Abbonamenti
          {'\n'}• Web: dal Profilo nell'app, sezione "Gestisci pagamento e fatture"
        </Text>
        <Text style={styles.p}>
          <Text style={{ fontWeight: '700' }}>Rimborsi</Text>: le richieste di rimborso sono gestite
          secondo le policy di Apple (App Store), Google (Play Store) o Stripe (web). Contattaci a
          support@runhub.app per assistenza.
        </Text>

        <Text style={styles.h2}>5. Uso consentito</Text>
        <Text style={styles.p}>
          Ti impegni a non: (a) violare leggi applicabili; (b) falsificare dati di allenamento o
          classifiche; (c) usare bot o scraping non autorizzati; (d) reverse engineering dell'app;
          (e) caricare contenuti offensivi o protetti da copyright altrui nel feed sociale.
        </Text>

        <Text style={styles.h2}>6. Precauzioni sanitarie</Text>
        <Text style={styles.p}>
          <Text style={{ fontWeight: '700' }}>Importante</Text>: RunHub fornisce indicazioni sportive
          generiche, NON consulenza medica. Consulta sempre un medico prima di iniziare un programma di
          allenamento, specialmente se hai condizioni cardiache, respiratorie o muscoloscheletriche.
          Gli sviluppatori non sono responsabili per infortuni o problemi di salute derivanti dall'uso.
        </Text>

        <Text style={styles.h2}>7. Proprietà intellettuale</Text>
        <Text style={styles.p}>
          Tutti i contenuti, loghi, algoritmi e design dell'app sono di proprietà di RunHub. Gli
          allenamenti generati dall'AI Coach sono personalizzati e di uso privato. Non puoi rivenderli
          o redistribuirli commercialmente.
        </Text>

        <Text style={styles.h2}>8. Modifiche al Servizio</Text>
        <Text style={styles.p}>
          Ci riserviamo il diritto di modificare, sospendere o interrompere il Servizio in qualsiasi
          momento. Sarai notificato di cambiamenti significativi via email o notifica in-app.
        </Text>

        <Text style={styles.h2}>9. Limitazione di responsabilità</Text>
        <Text style={styles.p}>
          Il Servizio è fornito "così com'è". Non garantiamo che sia sempre disponibile, privo di bug,
          o che soddisfi le tue aspettative. La nostra responsabilità massima è limitata all'importo
          dell'abbonamento pagato nei 12 mesi precedenti l'evento.
        </Text>

        <Text style={styles.h2}>10. Legge applicabile</Text>
        <Text style={styles.p}>
          I presenti Termini sono regolati dalla legge italiana. Foro competente: Milano.
        </Text>

        <Text style={styles.h2}>11. Contatti</Text>
        <Text style={styles.p}>
          Per qualsiasi domanda: support@runhub.app
        </Text>

        <View style={{ height: 40 }} />
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
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  updated: { color: colors.textSecondary, fontSize: 13, marginBottom: 20, fontStyle: 'italic' },
  h2: { color: colors.primary, fontSize: 18, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  p: { color: colors.text, fontSize: 15, lineHeight: 22, marginBottom: 12 },
});
