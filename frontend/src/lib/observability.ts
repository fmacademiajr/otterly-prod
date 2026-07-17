// Sentry init — wires only if EXPO_PUBLIC_SENTRY_DSN is set.
// In preview / dev-without-DSN, this is a no-op so nothing breaks.
//
// After deploying to iOS/Android:
//   1. Create a Sentry project at sentry.io → get its DSN
//   2. Set EXPO_PUBLIC_SENTRY_DSN in /app/frontend/.env
//   3. Redeploy — events start flowing

import * as Sentry from "@sentry/react-native";

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

let initialized = false;

export function initSentry() {
  if (initialized) return;
  if (!DSN || DSN === "placeholder") return;
  try {
    Sentry.init({
      dsn: DSN,
      debug: false,
      tracesSampleRate: 0.1,
      enableAutoSessionTracking: true,
      // Don't send events in local dev
      enabled: !__DEV__,
    });
    initialized = true;
  } catch {
    // never let observability break the app
  }
}

export function setUser(userId: string | null) {
  if (!initialized) return;
  try {
    Sentry.setUser(userId ? { id: userId } : null);
  } catch {}
}

export const sentry = Sentry;
