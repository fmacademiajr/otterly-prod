import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import { GoogleSignin, isCancelledResponse } from "@react-native-google-signin/google-signin";

import { identity, type StoredUser } from "@/src/lib/identity";
import { api, ApiError } from "@/src/lib/api";
import { storage } from "@/src/utils/storage";

type AuthCtx = {
  status: "loading" | "authed" | "anonymous";
  user: StoredUser | null;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

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

async function processGoogleIdToken(idToken: string) {
  const deviceId = await identity.getDeviceId();
  const res = await api.googleAuth(idToken, deviceId);
  await identity.setToken(res.session_token);
  await identity.setUser({
    user_id: res.user_id,
    email: res.email,
    name: res.name,
    picture: res.picture,
  });
  return res;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authed" | "anonymous">("loading");
  const [user, setUser] = useState<StoredUser | null>(null);

  const bootstrap = useCallback(async () => {
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

  const signInWithGoogle = useCallback(async () => {
    GoogleSignin.configure({ iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID });
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return; // user tapped Cancel, not a failure
    const idToken = response.data.idToken;
    if (!idToken) return;
    const res = await processGoogleIdToken(idToken);
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
      value={{ status, user, signInWithApple, signInWithGoogle, signOut, deleteAccount, refresh: bootstrap }}
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
