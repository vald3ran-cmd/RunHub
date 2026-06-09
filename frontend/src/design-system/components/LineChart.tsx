/**
 * Mini line chart per sparklines (Run Score trend, Training Load).
 * Costruito su react-native-svg per evitare Skia dependency.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line as SvgLine } from 'react-native-svg';
import { chart, neutral } from '../tokens';

type Series = {
  data: number[];
  color: string;
  strokeWidth?: number;
};

type Props = {
  series: Series[];
  height?: number;
  width?: number;
  showGrid?: boolean;
  showLastPoint?: boolean;
  padding?: number;
};

export function LineChart({
  series,
  height = 80,
  width,
  showGrid = false,
  showLastPoint = true,
  padding = 4,
}: Props) {
  const [containerWidth, setContainerWidth] = React.useState(width || 300);

  const W = width || containerWidth;
  const H = height;

  // global min/max across all series
  let min = Infinity, max = -Infinity;
  series.forEach((s) => s.data.forEach((v) => {
    if (v < min) min = v;
    if (v > max) max = v;
  }));
  if (min === Infinity) { min = 0; max = 1; }
  if (min === max) { max = min + 1; }

  const pointToCoords = (data: number[], idx: number) => {
    const x = padding + (idx / Math.max(1, data.length - 1)) * (W - padding * 2);
    const y = H - padding - ((data[idx] - min) / (max - min)) * (H - padding * 2);
    return { x, y };
  };

  const buildPath = (data: number[]): string => {
    return data.map((_, i) => {
      const { x, y } = pointToCoords(data, i);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
  };

  return (
    <View
      onLayout={(e) => !width && setContainerWidth(e.nativeEvent.layout.width)}
      style={{ width: width || '100%', height }}
    >
      <Svg width={W} height={H}>
        {showGrid ? (
          <>
            <SvgLine x1={0} y1={H * 0.25} x2={W} y2={H * 0.25} stroke={chart.grid} strokeWidth={1} strokeDasharray="2,3" />
            <SvgLine x1={0} y1={H * 0.5} x2={W} y2={H * 0.5} stroke={chart.grid} strokeWidth={1} strokeDasharray="2,3" />
            <SvgLine x1={0} y1={H * 0.75} x2={W} y2={H * 0.75} stroke={chart.grid} strokeWidth={1} strokeDasharray="2,3" />
          </>
        ) : null}
        {series.map((s, i) => (
          <Path
            key={i}
            d={buildPath(s.data)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.strokeWidth ?? chart.strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {showLastPoint && series.length > 0 ? series.map((s, i) => {
          const last = pointToCoords(s.data, s.data.length - 1);
          return (
            <Circle key={`p${i}`} cx={last.x} cy={last.y} r={chart.pointSize} fill={s.color} />
          );
        }) : null}
      </Svg>
    </View>
  );
}
