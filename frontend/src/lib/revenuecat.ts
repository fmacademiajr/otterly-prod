// RevenueCat wrapper. Native purchases only work in a built app on iOS/Android.
// In Expo Go and web, we surface a friendly "purchases open in the built app" state.
//
// Expects EXPO_PUBLIC_REVENUECAT_IOS_KEY (and later _ANDROID_KEY) in .env.
// The Otterly entitlement identifier is "premium".

import { Platform } from "react-native";
import Constants from "expo-constants";

type PurchasesModule = typeof import("react-native-purchases").default;
type PurchasesPackage = import("react-native-purchases").PurchasesPackage;
type CustomerInfo = import("react-native-purchases").CustomerInfo;

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

const isExpoGo = Constants.appOwnership === "expo";
const canRunNativeIAP =
  !isExpoGo && Platform.OS !== "web" && (Platform.OS === "ios" ? !!IOS_KEY : !!ANDROID_KEY);

let purchases: PurchasesModule | null = null;
let configured = false;

async function loadModule(): Promise<PurchasesModule | null> {
  if (purchases) return purchases;
  if (!canRunNativeIAP) return null;
  try {
    const mod = await import("react-native-purchases");
    purchases = mod.default;
    return purchases;
  } catch {
    return null;
  }
}

export async function initRevenueCat(appUserId?: string) {
  const p = await loadModule();
  if (!p || configured) return;
  const key = Platform.OS === "ios" ? IOS_KEY : ANDROID_KEY;
  if (!key) return;
  try {
    await p.configure({ apiKey: key, appUserID: appUserId ?? null });
    configured = true;
  } catch {}
}

export async function fetchPackages(): Promise<PurchasesPackage[]> {
  const p = await loadModule();
  if (!p) return [];
  try {
    const offerings = await p.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch {
    return [];
  }
}

export async function purchase(pkg: PurchasesPackage): Promise<boolean> {
  const p = await loadModule();
  if (!p) return false;
  try {
    const res = await p.purchasePackage(pkg);
    return !!res.customerInfo.entitlements.active["premium"];
  } catch {
    return false;
  }
}

export async function restore(): Promise<boolean> {
  const p = await loadModule();
  if (!p) return false;
  try {
    const info = await p.restorePurchases();
    return !!info.entitlements.active["premium"];
  } catch {
    return false;
  }
}

export const revenuecat = {
  canRunNativeIAP,
  isExpoGo,
  initRevenueCat,
  fetchPackages,
  purchase,
  restore,
};
