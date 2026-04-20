import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../src/theme';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.updated}>Ultimo aggiornamento: 20 aprile 2026</Text>

        <Text style={styles.p}>
          La presente Privacy Policy descrive come RunHub raccoglie, utilizza e protegge i tuoi dati
          personali conformemente al GDPR (UE 2016/679) e alle normative italiane. Titolare del
          trattamento: RunHub Team — support@runhub.app
        </Text>

        <Text style={styles.h2}>1. Dati raccolti</Text>
        <Text style={styles.p}>
          <Text style={{ fontWeight: '700' }}>Dati di account</Text>: email, password (hash bcrypt),
          nome, avatar, data registrazione.
        </Text>
        <Text style={styles.p}>
          <Text style={{ fontWeight: '700' }}>Dati di allenamento</Text>: percorsi GPS, distanza,
          durata, passi, calorie, battito cardiaco (se sincronizzato da wearables), foto dei workout.
        </Text>
        <Text style={styles.p}>
          <Text style={{ fontWeight: '700' }}>Dati di salute</Text> (solo se concedi permessi Apple
          Health / Health Connect): passi giornalieri, distanza, battito cardiaco, calorie. Questi
          dati sono salvati localmente sul device e sincronizzati con il nostro backend cifrato.
        </Text>
        <Text style={styles.p}>
          <Text style={{ fontWeight: '700' }}>Dati di pagamento</Text>: gestiti esclusivamente da
          Apple (IAP), Google (Play Billing) o Stripe. Non memorizziamo dati di carte di credito.
        </Text>
        <Text style={styles.p}>
          <Text style={{ fontWeight: '700' }}>Dati sociali</Text> (opzionali): amici, commenti, like,
          classifiche.
        </Text>
        <Text style={styles.p}>
          <Text style={{ fontWeight: '700' }}>Dati tecnici</Text>: device model, OS version, app
          version, push token (per notifiche), advertising ID (per AdMob su utenti free).
        </Text>

        <Text style={styles.h2}>2. Finalità del trattamento</Text>
        <Text style={styles.p}>
          Utilizziamo i tuoi dati per:
          {'\n'}• Fornire il servizio (autenticazione, tracciamento, piani allenamento)
          {'\n'}• Generare allenamenti personalizzati tramite AI (Claude Sonnet 4.5)
          {'\n'}• Inviare notifiche push (solo se acconsenti)
          {'\n'}• Gestire abbonamenti e fatturazione
          {'\n'}• Mostrare pubblicità sugli utenti free (AdMob)
          {'\n'}• Migliorare il servizio (analytics aggregati)
          {'\n'}• Rispondere a richieste di supporto
        </Text>

        <Text style={styles.h2}>3. Base giuridica</Text>
        <Text style={styles.p}>
          {'\n'}• <Text style={{ fontWeight: '700' }}>Contratto</Text>: per fornire il servizio
          {'\n'}• <Text style={{ fontWeight: '700' }}>Consenso</Text>: per notifiche push, Apple
          Health, wearables, pubblicità personalizzata
          {'\n'}• <Text style={{ fontWeight: '700' }}>Legittimo interesse</Text>: analytics aggregati,
          sicurezza, prevenzione frodi
          {'\n'}• <Text style={{ fontWeight: '700' }}>Obbligo legale</Text>: conservazione fatture
          (10 anni)
        </Text>

        <Text style={styles.h2}>4. Terze parti</Text>
        <Text style={styles.p}>
          Condividiamo dati con i seguenti fornitori (tutti GDPR-compliant):
          {'\n'}• <Text style={{ fontWeight: '700' }}>MongoDB Atlas</Text> (database, EU regions)
          {'\n'}• <Text style={{ fontWeight: '700' }}>Render.com</Text> (hosting backend)
          {'\n'}• <Text style={{ fontWeight: '700' }}>Stripe</Text> (pagamenti web)
          {'\n'}• <Text style={{ fontWeight: '700' }}>RevenueCat</Text> (gestione IAP Apple/Google)
          {'\n'}• <Text style={{ fontWeight: '700' }}>Anthropic</Text> (AI Coach — i prompt non
          contengono dati personali identificativi)
          {'\n'}• <Text style={{ fontWeight: '700' }}>Resend</Text> (email transazionali)
          {'\n'}• <Text style={{ fontWeight: '700' }}>Expo Push Service</Text> (notifiche)
          {'\n'}• <Text style={{ fontWeight: '700' }}>Google AdMob</Text> (pubblicità, solo utenti free)
          {'\n'}• <Text style={{ fontWeight: '700' }}>Mapbox</Text> (mappe e heatmap)
        </Text>
        <Text style={styles.p}>
          Non vendiamo mai i tuoi dati a terzi per scopi di marketing.
        </Text>

        <Text style={styles.h2}>5. Trasferimenti extra-UE</Text>
        <Text style={styles.p}>
          Alcuni fornitori (Stripe, Anthropic, RevenueCat) hanno server negli Stati Uniti. I
          trasferimenti avvengono tramite clausole contrattuali standard (SCC) e Data Privacy
          Framework dove applicabile.
        </Text>

        <Text style={styles.h2}>6. Conservazione</Text>
        <Text style={styles.p}>
          {'\n'}• <Text style={{ fontWeight: '700' }}>Dati account</Text>: finché il tuo account è
          attivo + 2 anni dopo cancellazione (per motivi legali).
          {'\n'}• <Text style={{ fontWeight: '700' }}>Allenamenti</Text>: indefinitamente, eliminabili
          manualmente o con cancellazione account.
          {'\n'}• <Text style={{ fontWeight: '700' }}>Fatture</Text>: 10 anni (obbligo fiscale).
          {'\n'}• <Text style={{ fontWeight: '700' }}>Log tecnici</Text>: 90 giorni.
        </Text>

        <Text style={styles.h2}>7. I tuoi diritti (GDPR)</Text>
        <Text style={styles.p}>
          Hai il diritto di:
          {'\n'}• <Text style={{ fontWeight: '700' }}>Accedere</Text> ai tuoi dati (esportazione
          completa via Profilo → Esporta Dati)
          {'\n'}• <Text style={{ fontWeight: '700' }}>Rettificare</Text> dati inesatti
          {'\n'}• <Text style={{ fontWeight: '700' }}>Cancellare</Text> il tuo account (Profilo →
          Elimina Account — irreversibile dopo 30 gg)
          {'\n'}• <Text style={{ fontWeight: '700' }}>Opporti</Text> a trattamenti basati su legittimo
          interesse
          {'\n'}• <Text style={{ fontWeight: '700' }}>Portabilità</Text>: ricevere dati in formato
          JSON/CSV
          {'\n'}• <Text style={{ fontWeight: '700' }}>Revoca consenso</Text>: disattivare notifiche,
          Health, wearables, pubblicità personalizzata dalle Impostazioni
          {'\n'}• <Text style={{ fontWeight: '700' }}>Reclamo</Text> al Garante Privacy italiano
          ([garanteprivacy.it](https://www.garanteprivacy.it))
        </Text>

        <Text style={styles.h2}>8. Sicurezza</Text>
        <Text style={styles.p}>
          {'\n'}• Connessioni cifrate TLS 1.2+ per tutte le comunicazioni
          {'\n'}• Password hashate con bcrypt (non reversibili)
          {'\n'}• Backup giornalieri cifrati del database
          {'\n'}• Accesso admin limitato a personale autorizzato
          {'\n'}• Audit log per eventi sensibili (login, cambio password, pagamenti)
        </Text>

        <Text style={styles.h2}>9. Minori</Text>
        <Text style={styles.p}>
          RunHub non è destinato a minori di 13 anni (16 in alcuni paesi UE). Se scopriamo un account
          di un minore, lo elimineremo immediatamente.
        </Text>

        <Text style={styles.h2}>10. Pubblicità (AdMob)</Text>
        <Text style={styles.p}>
          Solo per utenti free mostriamo annunci tramite Google AdMob. Su iOS ti chiediamo il consenso
          al tracking (App Tracking Transparency). Puoi disattivare gli annunci acquistando un
          abbonamento. Google AdMob può usare il tuo Advertising ID per personalizzare annunci
          (disattivabile dalle impostazioni iOS/Android).
        </Text>

        <Text style={styles.h2}>11. Cookie (web)</Text>
        <Text style={styles.p}>
          La versione web utilizza cookie tecnici essenziali (sessione JWT) e cookie analytics
          anonimi. Nessun cookie di profilazione.
        </Text>

        <Text style={styles.h2}>12. Modifiche</Text>
        <Text style={styles.p}>
          Potremmo aggiornare questa Privacy Policy. Cambiamenti significativi saranno notificati via
          email o in-app almeno 30 giorni prima dell'entrata in vigore.
        </Text>

        <Text style={styles.h2}>13. Contatti</Text>
        <Text style={styles.p}>
          Per domande sulla privacy:
          {'\n'}• Email: privacy@runhub.app
          {'\n'}• DPO (Data Protection Officer): dpo@runhub.app
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
