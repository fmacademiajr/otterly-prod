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

type Variant = "default" | "crown" | "peek" | "line" | "line-peek" | "focus" | "focused" | "working" | "working-bed" | "celebrate" | "float" | "float-awake" | "wave" | "sleep" | "sit-attentive" | "sit-calm" | "hands-raised";

const IMAGE_ASSETS: Record<Variant, any> = {
  default: require("@/assets/otter/otter-default.png"),
  focus: require("@/assets/otter/otter-focus.png"),
  focused: require("@/assets/otter/otter-focused.png"),
  working: require("@/assets/otter/otter-working.png"),
  "working-bed": require("@/assets/otter/otter-working-bed.png"),
  celebrate: require("@/assets/otter/otter-celebrate.png"),
  float: require("@/assets/otter/otter-float.png"),
  "float-awake": require("@/assets/otter/otter-float-awake.png"),
  crown: require("@/assets/otter/otter-crown.png"),
  wave: require("@/assets/otter/otter-wave.png"),
  sleep: require("@/assets/otter/otter-sleep.png"),
  peek: require("@/assets/otter/otter-peek.png"),
  // Onboarding cuts (transparent-background) — see docs/design-handoff mood map
  "sit-attentive": require("@/assets/otter/otter-sit-attentive.png"),
  "sit-calm": require("@/assets/otter/otter-sit-calm.png"),
  "hands-raised": require("@/assets/otter/otter-hands-raised.png"),
  // Line SVG fallbacks remain for edge cases
  line: null,
  "line-peek": null,
};

export function OtterMascot({
  size = 120,
  variant = "default",
  color,
}: {
  size?: number;
  variant?: Variant;
  color?: string;
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
  if (variant === "line") return <LineOtter size={size} color={color} />;
  if (variant === "line-peek") return <LineOtterPeek size={size} color={color} />;
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

/**
 * Line-drawing otter floating on its back with water waves under it.
 * Used on Welcome and Crisis screens — a quieter, more design-forward moment.
 */
function LineOtter({ size, color }: { size: number; color?: string }) {
  const c = color || "#2E7268";
  return (
    <View style={[styles.wrap, { width: size, height: size * 0.68 }]}>
      <Svg width={size} height={size * 0.68} viewBox="0 0 200 136" fill="none">
        {/* Water waves under otter */}
        <Path
          d="M8 108 Q 50 90, 100 108 T 192 108"
          stroke={c}
          strokeWidth={1.2}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M2 118 Q 46 100, 100 118 T 198 118"
          stroke={c}
          strokeWidth={1.2}
          fill="none"
          strokeLinecap="round"
          opacity={0.75}
        />
        <Path
          d="M20 126 Q 60 112, 100 126 T 180 126"
          stroke={c}
          strokeWidth={1.2}
          fill="none"
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* Otter body (float on back) — long elongated shape */}
        <Path
          d="M40 94 C 44 74, 90 60, 130 62 C 150 63, 162 74, 160 90 C 158 100, 150 108, 130 108 C 90 108, 60 108, 42 106 Z"
          stroke={c}
          strokeWidth={1.6}
          fill="none"
        />
        {/* Otter head */}
        <Path
          d="M132 56 C 128 40, 140 32, 154 34 C 168 36, 172 48, 168 60 C 166 68, 158 72, 148 70"
          stroke={c}
          strokeWidth={1.6}
          fill="none"
          strokeLinecap="round"
        />
        {/* Eyes */}
        <Path d="M144 50 L 145 51" stroke={c} strokeWidth={2.2} strokeLinecap="round" />
        <Path d="M158 50 L 159 51" stroke={c} strokeWidth={2.2} strokeLinecap="round" />
        {/* Nose */}
        <Path d="M156 58 L 158 58" stroke={c} strokeWidth={2} strokeLinecap="round" />
        {/* Smile */}
        <Path d="M150 62 Q 154 66, 158 62" stroke={c} strokeWidth={1.4} fill="none" strokeLinecap="round" />
        {/* Whiskers */}
        <Path d="M148 60 L 138 61" stroke={c} strokeWidth={1} strokeLinecap="round" opacity={0.7} />
        <Path d="M148 62 L 138 64" stroke={c} strokeWidth={1} strokeLinecap="round" opacity={0.7} />
        <Path d="M164 60 L 174 60" stroke={c} strokeWidth={1} strokeLinecap="round" opacity={0.7} />
        <Path d="M164 62 L 174 64" stroke={c} strokeWidth={1} strokeLinecap="round" opacity={0.7} />
        {/* Paws on chest */}
        <Path
          d="M90 72 C 88 66, 98 62, 104 66 C 108 68, 110 74, 104 76"
          stroke={c}
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M72 78 C 68 74, 74 68, 82 70 C 88 72, 92 78, 88 82"
          stroke={c}
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
        />
        {/* Tail curling to the left */}
        <Path
          d="M42 90 C 20 80, 8 90, 14 108"
          stroke={c}
          strokeWidth={1.6}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

/**
 * Just the peeking head — used inline next to headings.
 */
function LineOtterPeek({ size, color }: { size: number; color?: string }) {
  const c = color || "#7EA79E";
  return (
    <View style={[styles.wrap, { width: size, height: size * 0.9 }]}>
      <Svg width={size} height={size * 0.9} viewBox="0 0 100 90" fill="none">
        {/* Head outline */}
        <Path
          d="M22 30 C 18 14, 40 6, 58 8 C 78 10, 88 22, 84 42 C 82 56, 68 68, 50 68 C 32 68, 22 58, 22 42"
          stroke={c}
          strokeWidth={1.6}
          fill="none"
        />
        {/* Ears */}
        <Path d="M28 20 Q 24 12, 32 12" stroke={c} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        <Path d="M76 20 Q 82 10, 82 20" stroke={c} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        {/* Eyes */}
        <Path d="M40 34 L 41 35" stroke={c} strokeWidth={2.5} strokeLinecap="round" />
        <Path d="M62 34 L 63 35" stroke={c} strokeWidth={2.5} strokeLinecap="round" />
        {/* Nose */}
        <Path d="M50 44 Q 52 46, 54 44" stroke={c} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        {/* Whiskers */}
        <Path d="M40 44 L 30 44" stroke={c} strokeWidth={1} strokeLinecap="round" opacity={0.7} />
        <Path d="M40 46 L 30 48" stroke={c} strokeWidth={1} strokeLinecap="round" opacity={0.7} />
        <Path d="M64 44 L 74 44" stroke={c} strokeWidth={1} strokeLinecap="round" opacity={0.7} />
        <Path d="M64 46 L 74 48" stroke={c} strokeWidth={1} strokeLinecap="round" opacity={0.7} />
        {/* Small smile */}
        <Path d="M46 52 Q 52 58, 58 52" stroke={c} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

