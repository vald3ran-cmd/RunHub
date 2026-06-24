/**
 * WeatherForecast — 7-day weather widget for the Lab tab.
 *
 * Fetches /api/weather/forecast which auto-falls-back to the user's latest
 * workout location if no lat/lng is provided. Renders a horizontally scrollable
 * row of 7 day cards with weather icon, high/low temp and precipitation
 * probability.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import {
  Sun, CloudSun, Cloud, CloudFog, CloudRain, CloudSnow, CloudLightning,
  Droplets, MapPin,
} from 'lucide-react-native';
import { tokens, Card } from '../design-system';
import { api } from '../api';
import { useT, t as tStatic } from '../i18n';

const { brand, neutral, text, semantic, spacing, typography, radius } = tokens;

type ForecastDay = {
  date: string;
  weather_code: number;
  label: string;
  icon: string;
  temp_max_c: number | null;
  temp_min_c: number | null;
  precip_prob_pct: number | null;
  wind_kmh_max: number | null;
};

type Forecast = {
  available: boolean;
  reason?: string;
  lat: number | null;
  lng: number | null;
  timezone?: string;
  current?: {
    temperature_c: number | null;
    weather_code: number;
    label: string;
    icon: string;
  };
  days: ForecastDay[];
};

const DOW_KEYS = [
  'lab.weather_dow_sun',
  'lab.weather_dow_mon',
  'lab.weather_dow_tue',
  'lab.weather_dow_wed',
  'lab.weather_dow_thu',
  'lab.weather_dow_fri',
  'lab.weather_dow_sat',
];

function getIconComponent(icon: string) {
  switch (icon) {
    case 'sun': return Sun;
    case 'cloud-sun': return CloudSun;
    case 'cloud-fog': return CloudFog;
    case 'cloud-rain': return CloudRain;
    case 'cloud-snow': return CloudSnow;
    case 'cloud-lightning': return CloudLightning;
    case 'cloud':
    default: return Cloud;
  }
}

function getIconColor(icon: string): string {
  switch (icon) {
    case 'sun': return '#F59E0B';
    case 'cloud-sun': return '#F59E0B';
    case 'cloud-rain': return '#3B82F6';
    case 'cloud-lightning': return '#7C3AED';
    case 'cloud-snow': return '#0EA5E9';
    case 'cloud-fog': return text.muted;
    default: return text.secondary;
  }
}

function formatDayLabel(iso: string, isToday: boolean): string {
  if (isToday) return tStatic('lab.weather_today');
  try {
    const dt = new Date(iso + 'T00:00:00');
    return tStatic(DOW_KEYS[dt.getDay()]);
  } catch {
    return '—';
  }
}

export function WeatherForecast() {
  const { t, locale: _locale } = useT();
  void _locale;
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchForecast = useCallback(async () => {
    try {
      const res = await api.get('/weather/forecast');
      setForecast(res.data);
    } catch (e: any) {
      console.warn('[weather] forecast error:', e?.message);
      setForecast({ available: false, reason: 'fetch_error', lat: null, lng: null, days: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchForecast(); }, [fetchForecast]);

  if (loading) {
    return (
      <Card>
        <View style={styles.headRow}>
          <Text style={styles.sectionTitle}>{t('lab.weather_title')}</Text>
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={brand.primary} />
          <Text style={styles.loadingText}>{t('lab.weather_loading')}</Text>
        </View>
      </Card>
    );
  }

  if (!forecast || !forecast.available || forecast.days.length === 0) {
    return (
      <Card>
        <View style={styles.headRow}>
          <Text style={styles.sectionTitle}>{t('lab.weather_title')}</Text>
          <Text style={styles.sectionSub}>{t('lab.weather_sub_no_loc')}</Text>
        </View>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <MapPin size={22} color={text.muted} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>{t('lab.weather_empty_title')}</Text>
          <Text style={styles.emptyBody}>{t('lab.weather_empty_body')}</Text>
        </View>
      </Card>
    );
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const curTemp = forecast.current?.temperature_c;

  return (
    <Card padding={'paddingCard' as any}>
      <View style={styles.headRow}>
        <Text style={styles.sectionTitle}>{t('lab.weather_title')}</Text>
        <Text style={styles.sectionSub}>
          {curTemp !== null && curTemp !== undefined
            ? t('lab.weather_sub_now', { temp: curTemp })
            : forecast.current?.label || ''}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysRow}
      >
        {forecast.days.map((day, i) => {
          const isToday = day.date === todayIso || i === 0;
          const Icon = getIconComponent(day.icon);
          const iconColor = getIconColor(day.icon);
          return (
            <View key={day.date} style={[styles.dayCard, isToday && styles.dayCardToday]}>
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                {formatDayLabel(day.date, isToday)}
              </Text>
              <View style={styles.iconWrap}>
                <Icon size={26} color={iconColor} strokeWidth={2} />
              </View>
              <View style={styles.tempsRow}>
                <Text style={styles.tempMax}>{day.temp_max_c ?? '—'}°</Text>
                <Text style={styles.tempMin}>{day.temp_min_c ?? '—'}°</Text>
              </View>
              {day.precip_prob_pct !== null && day.precip_prob_pct !== undefined && day.precip_prob_pct > 0 ? (
                <View style={styles.precipRow}>
                  <Droplets size={10} color={semantic.info} strokeWidth={2.4} />
                  <Text style={styles.precipText}>{day.precip_prob_pct}%</Text>
                </View>
              ) : (
                <View style={styles.precipRowEmpty} />
              )}
            </View>
          );
        })}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  headRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.kpiLabel,
    color: text.primary,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  sectionSub: {
    ...typography.kpiLabel,
    color: text.muted,
    fontSize: 11,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: text.secondary,
    fontSize: 13,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: neutral.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typography.body,
    color: text.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyBody: {
    ...typography.body,
    color: text.secondary,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 17,
  },
  daysRow: {
    gap: spacing.sm,
    paddingHorizontal: 2,
  },
  dayCard: {
    width: 64,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: neutral.border,
    backgroundColor: neutral.background,
    alignItems: 'center',
    gap: 6,
  },
  dayCardToday: {
    borderColor: brand.primary,
    backgroundColor: brand.subtle,
  },
  dayLabel: {
    ...typography.kpiLabel,
    fontSize: 10,
    color: text.muted,
    letterSpacing: 1,
  },
  dayLabelToday: {
    color: brand.primary,
  },
  iconWrap: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  tempMax: {
    ...typography.kpiValue,
    fontSize: 14,
    color: text.primary,
    fontWeight: '700',
  },
  tempMin: {
    ...typography.kpiValue,
    fontSize: 11,
    color: text.muted,
  },
  precipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 14,
  },
  precipRowEmpty: {
    minHeight: 14,
  },
  precipText: {
    ...typography.kpiLabel,
    fontSize: 9,
    color: semantic.info,
    letterSpacing: 0.3,
  },
});
