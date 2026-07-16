import React from "react";
import { Image, StyleSheet, View } from "react-native";
import Svg, { Path, Circle, Ellipse, G } from "react-native-svg";

/**
 * OtterMascot — a soft cartoon otter, filled illustration.
 * Renders an inline SVG placeholder until real PNG assets are dropped in
 * `/app/frontend/assets/otter/otter-<variant>.png`.
 *
 * Variants:
 *   "default" — sitting otter with a soft scarf
 *   "crown"   — sitting otter with a small gold crown (Founding Otter)
 *   "peek"    — smaller floating head (used inline)
 */

type Variant = "default" | "crown" | "peek";

const IMAGE_ASSETS: Record<Variant, any> = {
  default: null, // Drop /app/frontend/assets/otter/otter-default.png here + require it
  crown: null,
  peek: null,
};

export function OtterMascot({
  size = 120,
  variant = "default",
}: {
  size?: number;
  variant?: Variant;
}) {
  const asset = IMAGE_ASSETS[variant];
  if (asset) {
    return (
      <Image
        source={asset}
        style={{ width: size, height: size, resizeMode: "contain" }}
        accessibilityLabel="Otter mascot"
      />
    );
  }
  return <FallbackOtter size={size} variant={variant} />;
}

/**
 * Fallback SVG otter — warm, sitting posture, no cartoon face features
 * (still trying to keep away from too-cute) but recognizable as an otter.
 * Colors: warm brown body, cream belly, teal-shadow.
 */
function FallbackOtter({ size, variant }: { size: number; variant: Variant }) {
  const BROWN = "#8A6A4A";
  const BROWN_DARK = "#5E4530";
  const BELLY = "#E8D8BE";
  const SCARF = "#D4A24F";
  const SCARF_STROKE = "#B58A3F";
  const NOSE = "#3B2E22";
  const CROWN = "#E0B26A";
  const CROWN_DARK = "#B58A3F";

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {/* Ears */}
        <Circle cx="70" cy="55" r="16" fill={BROWN_DARK} />
        <Circle cx="130" cy="55" r="16" fill={BROWN_DARK} />
        <Circle cx="70" cy="55" r="8" fill={BROWN} />
        <Circle cx="130" cy="55" r="8" fill={BROWN} />

        {/* Head */}
        <Ellipse cx="100" cy="80" rx="46" ry="42" fill={BROWN} />

        {/* Muzzle / cheeks (cream) */}
        <Ellipse cx="100" cy="98" rx="30" ry="20" fill={BELLY} />

        {/* Eyes */}
        <Circle cx="82" cy="82" r="4" fill={NOSE} />
        <Circle cx="118" cy="82" r="4" fill={NOSE} />
        {/* eye shine */}
        <Circle cx="83.5" cy="80" r="1.2" fill="#FFFFFF" />
        <Circle cx="119.5" cy="80" r="1.2" fill="#FFFFFF" />

        {/* Nose */}
        <Ellipse cx="100" cy="95" rx="5" ry="3.5" fill={NOSE} />

        {/* Smile — very subtle */}
        <Path
          d="M92 104 Q 100 110 108 104"
          stroke={NOSE}
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
        />

        {/* Body */}
        <G>
          <Ellipse cx="100" cy="150" rx="52" ry="38" fill={BROWN} />
          {/* Belly patch */}
          <Ellipse cx="100" cy="158" rx="30" ry="24" fill={BELLY} />
          {/* Paws (front, crossed) */}
          <Ellipse cx="85" cy="164" rx="10" ry="8" fill={BROWN_DARK} />
          <Ellipse cx="115" cy="164" rx="10" ry="8" fill={BROWN_DARK} />
        </G>

        {/* Scarf */}
        {variant !== "peek" ? (
          <G>
            <Path
              d="M60 118 Q 100 132 140 118 L 138 130 Q 100 142 62 130 Z"
              fill={SCARF}
              stroke={SCARF_STROKE}
              strokeWidth={0.5}
            />
            {/* scarf tail */}
            <Path
              d="M138 126 L 148 146 L 156 138 L 145 122 Z"
              fill={SCARF}
              stroke={SCARF_STROKE}
              strokeWidth={0.5}
            />
            {/* scarf checker hint */}
            <Path d="M70 122 L 130 128" stroke={SCARF_STROKE} strokeWidth={0.5} opacity={0.5} />
          </G>
        ) : null}

        {/* Crown */}
        {variant === "crown" ? (
          <G>
            <Path
              d="M78 32 L 84 46 L 92 30 L 100 46 L 108 30 L 116 46 L 122 32 L 122 52 L 78 52 Z"
              fill={CROWN}
              stroke={CROWN_DARK}
              strokeWidth={1}
              strokeLinejoin="round"
            />
            <Circle cx="84" cy="42" r="2" fill={CROWN_DARK} />
            <Circle cx="100" cy="42" r="2" fill={CROWN_DARK} />
            <Circle cx="116" cy="42" r="2" fill={CROWN_DARK} />
          </G>
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
