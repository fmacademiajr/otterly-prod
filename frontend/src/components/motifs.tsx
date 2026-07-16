import React from "react";
import Svg, { Path } from "react-native-svg";

// A quiet single-line otter floating on its back. No cartoon face.
export function OtterGlyph({ size = 96, color = "#5E8B82" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={(size * 0.6)} viewBox="0 0 160 96" fill="none">
      {/* body — elongated ellipse suggesting a floating otter */}
      <Path
        d="M20 60 C 30 30, 130 30, 140 60 C 130 78, 30 78, 20 60 Z"
        stroke={color}
        strokeWidth={1.5}
        fill="none"
      />
      {/* head */}
      <Path
        d="M138 58 C 148 52, 156 56, 154 66 C 152 74, 144 74, 140 68"
        stroke={color}
        strokeWidth={1.5}
        fill="none"
      />
      {/* tiny ear tuft */}
      <Path d="M148 56 L 150 52" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      {/* paws crossed on chest */}
      <Path
        d="M78 54 C 82 50, 88 50, 92 54"
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M70 58 C 74 62, 96 62, 100 58"
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
      {/* tail */}
      <Path
        d="M22 62 C 12 66, 10 74, 18 78"
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Hairline calm-water wave — used under cards / hero moments.
export function WaterWave({ width = 240, color = "#E4E4E7" }: { width?: number; color?: string }) {
  return (
    <Svg width={width} height={16} viewBox="0 0 240 16" fill="none">
      <Path
        d="M0 8 Q 30 0, 60 8 T 120 8 T 180 8 T 240 8"
        stroke={color}
        strokeWidth={1}
        fill="none"
      />
    </Svg>
  );
}

// Concentric soft ripples for the streak visual — quiet, non-gamified.
export function StreakRipple({ size = 140, color = "#5E8B82" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 140 140" fill="none">
      <Path
        d="M70 70 m -55 0 a 55 55 0 1 0 110 0 a 55 55 0 1 0 -110 0"
        stroke={color}
        strokeOpacity={0.25}
        strokeWidth={1}
        fill="none"
      />
      <Path
        d="M70 70 m -38 0 a 38 38 0 1 0 76 0 a 38 38 0 1 0 -76 0"
        stroke={color}
        strokeOpacity={0.45}
        strokeWidth={1}
        fill="none"
      />
      <Path
        d="M70 70 m -22 0 a 22 22 0 1 0 44 0 a 22 22 0 1 0 -44 0"
        stroke={color}
        strokeOpacity={0.7}
        strokeWidth={1}
        fill="none"
      />
    </Svg>
  );
}
