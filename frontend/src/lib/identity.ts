// Otterly identity + auth store. Anonymous-first: every install gets a
// device_id used to scope data. Signing in via Emergent Google Auth upgrades
// to a real user and merges the device's existing data.

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { storage } from "@/src/utils/storage";

const DEVICE_KEY = "otterly.deviceId";
const TOKEN_KEY = "otterly.sessionToken";
const USER_KEY = "otterly.user";

export type StoredUser = {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
};

function uuid() {
  // v4-ish
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string) {
  if (Platform.OS === "web") {
    try {
      window.localStorage.setItem(key, value);
    } catch {}
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function secureDelete(key: string) {
  if (Platform.OS === "web") {
    try {
      window.localStorage.removeItem(key);
    } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const identity = {
  async getDeviceId(): Promise<string> {
    let id = await storage.getItem<string>(DEVICE_KEY, "");
    if (!id) {
      id = uuid();
      await storage.setItem(DEVICE_KEY, id);
    }
    return id;
  },

  async getToken(): Promise<string | null> {
    return await secureGet(TOKEN_KEY);
  },

  async setToken(token: string) {
    await secureSet(TOKEN_KEY, token);
  },

  async clearToken() {
    await secureDelete(TOKEN_KEY);
  },

  async getUser(): Promise<StoredUser | null> {
    return await storage.getItem<StoredUser | null>(USER_KEY, null);
  },

  async setUser(u: StoredUser) {
    await storage.setItem(USER_KEY, u);
  },

  async clearUser() {
    await storage.setItem(USER_KEY, null);
  },

  async reset() {
    await secureDelete(TOKEN_KEY);
    await storage.setItem(USER_KEY, null);
    await storage.removeItem(DEVICE_KEY); // getDeviceId() mints a fresh uuid next call
  },
};
