// ─────────────────────────────────────────────────────────────
// RunHub Brand Icons — Custom SVG icons designed for the app
// Stile: minimalista, stroke-based, coerente con tema RUNNA
// ─────────────────────────────────────────────────────────────

import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

const D = 24;

// HOME — casa con percorso runner stilizzato
export const HomeIcon = ({ size = 22, color = '#0F1115', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox={`0 0 ${D} ${D}`} fill="none">
    <Path
      d="M3 11 L12 4 L21 11 V19 A2 2 0 0 1 19 21 H5 A2 2 0 0 1 3 19 Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    <Path
      d="M9 21 V14 H15 V21"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// PLANS — lista con check dinamico
export const PlansIcon = ({ size = 22, color = '#0F1115', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox={`0 0 ${D} ${D}`} fill="none">
    <Rect x="3" y="4" width="18" height="16" rx="3" stroke={color} strokeWidth={strokeWidth} />
    <Path d="M7 9 L10 12 L13 8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="15" y1="9" x2="18" y2="9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="7" y1="16" x2="18" y2="16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

// RUN — figura stilizzata che corre (per pulsante centrale tab + activity)
export const RunIcon = ({ size = 22, color = '#FFFFFF', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox={`0 0 ${D} ${D}`} fill="none">
    <Circle cx="14" cy="4.5" r="1.8" stroke={color} strokeWidth={strokeWidth} fill={color} />
    <Path
      d="M5 20 L8.5 14 L11.5 16 L14 13 L17 15 L19 12"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M11.5 16 L13 21"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <Path
      d="M14 13 L11 9 L8 10"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// WALK — figura stilizzata che cammina
export const WalkIcon = ({ size = 22, color = '#0F1115', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox={`0 0 ${D} ${D}`} fill="none">
    <Circle cx="12" cy="4" r="1.8" stroke={color} strokeWidth={strokeWidth} fill={color} />
    <Path
      d="M9 22 L11 15 L13 13 L15 17 L17 22"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M11 15 L8 11 L10 8 L13 13 L16 11"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// BIKE — bicicletta minimal
export const BikeIcon = ({ size = 22, color = '#0F1115', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox={`0 0 ${D} ${D}`} fill="none">
    <Circle cx="5.5" cy="17.5" r="3.5" stroke={color} strokeWidth={strokeWidth} />
    <Circle cx="18.5" cy="17.5" r="3.5" stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M5.5 17.5 L10 9 L15 9 L18.5 17.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M10 9 L13 9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Circle cx="13" cy="5" r="1" stroke={color} strokeWidth={strokeWidth} fill={color} />
    <Path d="M13 6 L13 9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

// HISTORY — orologio analogico stilizzato
export const HistoryIcon = ({ size = 22, color = '#0F1115', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox={`0 0 ${D} ${D}`} fill="none">
    <Circle cx="12" cy="13" r="8" stroke={color} strokeWidth={strokeWidth} />
    <Path d="M12 9 V13 L15 15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 3 H15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

// PROFILE — silhouette pulita
export const ProfileIcon = ({ size = 22, color = '#0F1115', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox={`0 0 ${D} ${D}`} fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M4 21 C4 16.5 7.5 14 12 14 C16.5 14 20 16.5 20 21"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);

// TROPHY brand — per achievements
export const TrophyIcon = ({ size = 22, color = '#FF6B6B', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox={`0 0 ${D} ${D}`} fill="none">
    <Path
      d="M7 4 H17 V9 A5 5 0 0 1 7 9 Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    <Path d="M7 6 H4 V8 A2 2 0 0 0 6 10 H7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17 6 H20 V8 A2 2 0 0 1 18 10 H17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M10 14 H14 L13 20 H11 Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    <Line x1="8" y1="20" x2="16" y2="20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

// FLAME — streak
export const FlameIcon = ({ size = 22, color = '#FF6B6B', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox={`0 0 ${D} ${D}`} fill="none">
    <Path
      d="M12 3 C13 7 17 9 17 14 A5 5 0 0 1 7 14 C7 11 9 10 9 7 C10 8 11 8 12 7 Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </Svg>
);

// LIGHTNING / BOLT — used for "start run" CTA
export const BoltIcon = ({ size = 22, color = '#FFFFFF', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox={`0 0 ${D} ${D}`} fill="none">
    <Path
      d="M13 2 L4 14 H11 L10 22 L20 10 H13 Z"
      fill={color}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  </Svg>
);

// SPARKLES — AI Coach
export const SparklesIcon = ({ size = 22, color = '#FF6B6B', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox={`0 0 ${D} ${D}`} fill="none">
    <Path
      d="M12 3 L13.5 9 L19 10.5 L13.5 12 L12 18 L10.5 12 L5 10.5 L10.5 9 Z"
      fill={color}
      stroke={color}
      strokeWidth={strokeWidth * 0.5}
      strokeLinejoin="round"
    />
    <Path
      d="M19 4 L19.7 6 L22 6.7 L19.7 7.4 L19 9 L18.3 7.4 L16 6.7 L18.3 6 Z"
      fill={color}
      strokeLinejoin="round"
    />
    <Path
      d="M5 16 L5.7 18 L8 18.7 L5.7 19.4 L5 21 L4.3 19.4 L2 18.7 L4.3 18 Z"
      fill={color}
      strokeLinejoin="round"
    />
  </Svg>
);
