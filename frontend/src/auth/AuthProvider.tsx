import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as AppleAuthentication from "expo-apple-authentication";

import { identity, type StoredUser } from "@/src/lib/identity";
import { api, ApiError } from "@/src/lib/api";
import { storage } from "@/src/utils/storage";

type AuthCtx = {
  status: "loading" | "authed" | "anonymous";
  user: StoredUser | null;
  signIn: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

const EMERGENT_AUTH_URL = "https://auth.emergentagent.com/";

async function processSessionToken(sessionToken: string) {
  const deviceId = await identity.getDeviceId();
  const res = await api.exchangeSession(sessionToken, deviceId);
  await identity.setToken(res.session_token);
  await identity.setUser({
    user_id: res.user_id,
    email: res.email,
    name: res.name,
    picture: res.picture,
  });
  return res;
}

async function processAppleCredential(identityToken: string, fullName?: string) {
  const deviceId = await identity.getDeviceId();
  const res = await api.appleAuth(identityToken, deviceId, fullName);
  await identity.setToken(res.session_token);
  await identity.setUser({
    user_id: res.user_id,
    email: res.email,
    name: res.name,
    picture: res.picture,
  });
  return res;
}

function extractSessionIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    // Support hash (#session_id=...) and query (?session_id=...)
    const hashIdx = url.indexOf("#");
    if (hashIdx >= 0) {
      const params = new URLSearchParams(url.substring(hashIdx + 1));
      const s = params.get("session_id");
      if (s) return s;
    }
    const qIdx = url.indexOf("?");
    if (qIdx >= 0) {
      const params = new URLSearchParams(url.substring(qIdx + 1));
      const s = params.get("session_id");
      if (s) return s;
    }
  } catch {}
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authed" | "anonymous">("loading");
  const [user, setUser] = useState<StoredUser | null>(null);

  const bootstrap = useCallback(async () => {
    // On web, process a redirect-embedded session_id first.
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const sid = extractSessionIdFromUrl(window.location.href);
      if (sid) {
        try {
          const res = await processSessionToken(sid);
          setUser({
            user_id: res.user_id,
            email: res.email,
            name: res.name,
            picture: res.picture,
          });
          window.history.replaceState(null, "", window.location.pathname);
          setStatus("authed");
          return;
        } catch (e) {
          // fall through to existing token check
        }
      }
    }

    // Existing token check
    const token = await identity.getToken();
    if (token) {
      try {
        const me = await api.me();
        await identity.setUser(me);
        setUser(me);
        setStatus("authed");
        return;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          await identity.clearToken();
        }
      }
    }

    // Anonymous
    const stored = await identity.getUser();
    setUser(stored || null);
    setStatus("anonymous");
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const signIn = useCallback(async () => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return;
      const redirectUrl = window.location.origin + "/";
      window.location.href = `${EMERGENT_AUTH_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
      return;
    }

    const redirectUrl = Linking.createURL("");
    const authUrl = `${EMERGENT_AUTH_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    if (result.type !== "success" || !result.url) return;
    const sid = extractSessionIdFromUrl(result.url);
    if (!sid) return;
    const res = await processSessionToken(sid);
    setUser({
      user_id: res.user_id,
      email: res.email,
      name: res.name,
      picture: res.picture,
    });
    setStatus("authed");
  }, []);

  const signInWithApple = useCallback(async () => {
    let credential: AppleAuthentication.AppleAuthenticationCredential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
    } catch (e: any) {
      if (e?.code === "ERR_REQUEST_CANCELED") return; // user tapped Cancel, not a failure
      throw e;
    }
    if (!credential.identityToken) return;
    // fullName is only populated on the user's first authorization; null on repeat sign-ins.
    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const res = await processAppleCredential(credential.identityToken, fullName || undefined);
    setUser({
      user_id: res.user_id,
      email: res.email,
      name: res.name,
      picture: res.picture,
    });
    setStatus("authed");
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {}
    await identity.clearToken();
    await identity.clearUser();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const deleteAccount = useCallback(async () => {
    await api.deleteAccount(); // throws → caller shows error, token kept for retry
    try {
      await identity.reset();
      await storage.removeItem("otterly.userName");
      await storage.removeItem("otterly.reminderTime");
    } catch {
      // ponytail: server delete already succeeded here. A local cleanup failure
      // (e.g. SecureStore throwing) must not read back to the caller as a
      // delete failure. Fall through to the anonymous state either way.
    }
    setUser(null);
    setStatus("anonymous");
  }, []);

  return (
    <AuthContext.Provider
      value={{ status, user, signIn, signInWithApple, signOut, deleteAccount, refresh: bootstrap }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
