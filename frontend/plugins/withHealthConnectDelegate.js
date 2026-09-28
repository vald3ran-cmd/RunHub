/**
 * Config plugin per react-native-health-connect (managed workflow).
 *
 * 1) MainActivity.onCreate → HealthConnectPermissionDelegate.setPermissionDelegate(this)
 *    Senza, requestPermission() crasha (lateinit requestPermission non inizializzato).
 * 2) AndroidManifest → activity-alias ViewPermissionUsageActivity, richiesta da
 *    Android 14+ per mostrare la rationale dei permessi Health Connect.
 *
 * Idempotente: non duplica import, chiamata o alias se già presenti.
 */
const { withMainActivity, withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

const IMPORT = 'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
const CALL = 'HealthConnectPermissionDelegate.setPermissionDelegate(this)';
const ALIAS_NAME = 'ViewPermissionUsageActivity';

function withPermissionDelegate(config) {
  return withMainActivity(config, (config) => {
    if (config.modResults.language !== 'kt') {
      throw new Error('withHealthConnectDelegate: MainActivity must be Kotlin');
    }
    let src = config.modResults.contents;

    if (!src.includes(IMPORT)) {
      src = src.replace(/^(package .+\n)/m, `$1\n${IMPORT}\n`);
    }
    if (!src.includes(CALL)) {
      const anchor = /super\.onCreate\((null|savedInstanceState)\)\s*\n/;
      if (!anchor.test(src)) {
        throw new Error('withHealthConnectDelegate: super.onCreate(...) not found in MainActivity');
      }
      src = src.replace(anchor, (m) => `${m}    ${CALL}\n`);
    }

    config.modResults.contents = src;
    return config;
  });
}

function withPermissionUsageAlias(config) {
  return withAndroidManifest(config, (config) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);

    if (!app['activity-alias']) app['activity-alias'] = [];
    const exists = app['activity-alias'].some((a) => a.$['android:name'] === ALIAS_NAME);
    if (!exists) {
      app['activity-alias'].push({
        $: {
          'android:name': ALIAS_NAME,
          'android:exported': 'true',
          'android:targetActivity': mainActivity.$['android:name'],
          'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' } }],
            category: [{ $: { 'android:name': 'android.intent.category.HEALTH_PERMISSIONS' } }],
          },
        ],
      });
    }
    return config;
  });
}

module.exports = function withHealthConnectDelegate(config) {
  config = withPermissionDelegate(config);
  config = withPermissionUsageAlias(config);
  return config;
};
