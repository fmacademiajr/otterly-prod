// Load Otterly's custom fonts from CDN URLs. Never install `@expo-google-fonts/*`.
//
// Otterly's DESIGN.md specifies Fraunces + General Sans + DM Sans.
// General Sans is a Fontshare-only font without a reliable public raw-TTF CDN,
// so we substitute DM Sans (a humanist sans that also satisfies the DESIGN.md
// "avoid Inter/Roboto/Poppins/system-ui" rule) as the body face until we ship
// General Sans as a bundled asset.
//
// - Fraunces (Google Fonts) — display / warm serif
// - DM Sans (Google Fonts) — body + numeric

import { useFonts } from "expo-font";

const OTTER_FONTS = {
  Fraunces_500Medium:
    "https://cdn.jsdelivr.net/gh/googlefonts/fraunces@main/fonts/static/Roman/Fraunces-Medium.ttf",
  Fraunces_600SemiBold:
    "https://cdn.jsdelivr.net/gh/googlefonts/fraunces@main/fonts/static/Roman/Fraunces-SemiBold.ttf",

  DMSans_500Medium:
    "https://cdn.jsdelivr.net/gh/googlefonts/dm-fonts@main/Sans/Exports/Static/TTF/DMSans-Medium.ttf",

  // Body faces (DM Sans, mapped under GeneralSans_* aliases used across the app)
  GeneralSans_Regular:
    "https://cdn.jsdelivr.net/gh/googlefonts/dm-fonts@main/Sans/Exports/Static/TTF/DMSans-Regular.ttf",
  GeneralSans_Medium:
    "https://cdn.jsdelivr.net/gh/googlefonts/dm-fonts@main/Sans/Exports/Static/TTF/DMSans-Medium.ttf",
  GeneralSans_Semibold:
    "https://cdn.jsdelivr.net/gh/googlefonts/dm-fonts@main/Sans/Exports/Static/TTF/DMSans-SemiBold.ttf",
};

export const useOtterFonts = () => useFonts(OTTER_FONTS);
