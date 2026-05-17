// ─────────────────────────────────────────────────────────────
// Mini-charts SVG — Sparkline + BarChart light-weight, no deps
// Pensati per dashboard "RUNNA-style" minimal
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, typography } from './theme';

// ─────────────────────────────────────────────────────────────
// Sparkline — line chart elegante con area fill
// ─────────────────────────────────────────────────────────────
export function Sparkline({
  data,
  width = 120,
  height = 40,
  color = colors.primary,
  strokeWidth = 2,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}) {
  if (!data || data.length < 2) {
    return <View style={{ width, height }} />;
  }
  const max = Math.max(...data, 0.1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD =
    pathD + ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.3" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={areaD} fill="url(#grad)" />
      <Path d={pathD} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      {/* Punto finale */}
      <Circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={color} />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────
// BarChart — bar chart minimal per giorni della settimana
// ─────────────────────────────────────────────────────────────
export function BarChart({
  data,
  labels,
  width = 320,
  height = 140,
  color = colors.primary,
  maxValue,
}: {
  data: number[];
  labels?: string[];
  width?: number;
  height?: number;
  color?: string;
  maxValue?: number;
}) {
  const max = maxValue ?? Math.max(...data, 0.1);
  const barW = (width - 20) / data.length - 6;
  const chartH = height - 22;

  return (
    <View>
      <Svg width={width} height={chartH}>
        {data.map((v, i) => {
          const x = 10 + i * (barW + 6);
          const h = max > 0 ? (v / max) * (chartH - 4) : 0;
          const y = chartH - h;
          const isMax = v === max && v > 0;
          return (
            <React.Fragment key={i}>
              <Rect
                x={x}
                y={0}
                width={barW}
                height={chartH}
                rx={6}
                fill={colors.surfaceSecondary}
                opacity={0.5}
              />
              <Rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={6}
                fill={isMax ? color : colors.textMuted}
                opacity={isMax ? 1 : 0.6}
              />
            </React.Fragment>
          );
        })}
      </Svg>
      {labels && (
        <View style={[styles.labels, { width }]}>
          {labels.map((l, i) => (
            <Text key={i} style={styles.label}>{l}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// StatBlock — singolo numero grande + label + sparkline
// ─────────────────────────────────────────────────────────────
export function StatBlock({
  label,
  value,
  unit,
  trend,
  color = colors.primary,
}: {
  label: string;
  value: string;
  unit?: string;
  trend?: number[];
  color?: string;
}) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statBlockLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text style={styles.statBlockValue}>{value}</Text>
        {unit ? <Text style={styles.statBlockUnit}>{unit}</Text> : null}
      </View>
      {trend && trend.length > 1 ? (
        <View style={{ marginTop: 6, alignSelf: 'stretch' }}>
          <Sparkline data={trend} color={color} width={120} height={28} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  label: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    width: 30,
    textAlign: 'center',
  },
  statBlock: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 18,
    shadowColor: '#0F1115',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statBlockLabel: {
    ...typography.eyebrow,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  statBlockValue: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  statBlockUnit: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
});
