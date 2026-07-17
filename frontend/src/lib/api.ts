// Otterly backend client — sends Bearer token when signed in, else X-Device-Id.

import { identity } from "./identity";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export type Task = {
  id: string;
  title: string;
  note?: string | null;
  created_at: string;
  shrunk: boolean;
  difficulty?: "easy" | "medium" | "hard" | null;
};

export type Step = {
  id: string;
  task_id: string;
  order: number;
  text: string;
  minutes: number;
  done: boolean;
  completed_at?: string | null;
};

export type Energy = "low" | "medium" | "good";

export type NextResponse = {
  step?: Step | null;
  task?: Task | null;
  reason: string;
  empty: boolean;
};

export type StreakStats = {
  days_this_week: number;
  total_days: number;
  todays_steps: number;
};

export type RoomMessage = {
  id: string;
  session_id: string;
  role: "user" | "otter";
  text: string;
  created_at: string;
};

export type AccessSnapshot = {
  premium: boolean;
  plan: string;
  limits: {
    shrinks_today: number;
    shrinks_cap: number;
    braindumps_today: number;
    braindumps_cap: number;
    room_today: number;
    room_cap: number;
  };
};

export type StoredUser = {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
};

async function buildHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = await identity.getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    const deviceId = await identity.getDeviceId();
    headers["X-Device-Id"] = deviceId;
  }
  return headers;
}

export class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
  }
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = await buildHeaders();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...headers, ...(opts.headers || {}) },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = typeof j?.detail === "string" ? j.detail : JSON.stringify(j?.detail || j);
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

export const api = {
  listTasks: () => req<Task[]>("/api/tasks"),
  createTask: (title: string, note?: string) =>
    req<Task>("/api/tasks", { method: "POST", body: JSON.stringify({ title, note }) }),
  deleteTask: (id: string) =>
    req<{ ok: boolean }>(`/api/tasks/${id}`, { method: "DELETE" }),
  listSteps: (taskId: string) => req<Step[]>(`/api/tasks/${taskId}/steps`),
  shrinkTask: (
    taskId: string,
    difficulty: "easy" | "medium" | "hard",
    deep = false,
    opts: { force?: boolean; tooBig?: boolean } = {}
  ) =>
    req<Step[]>(`/api/tasks/${taskId}/shrink`, {
      method: "POST",
      body: JSON.stringify({
        difficulty,
        deep,
        force: opts.force ?? false,
        too_big: opts.tooBig ?? false,
      }),
    }),
  toggleStep: (stepId: string, done: boolean) =>
    req<Step>(`/api/steps/${stepId}`, { method: "PATCH", body: JSON.stringify({ done }) }),
  next: (energy: Energy, minutes?: number) =>
    req<NextResponse>("/api/next", { method: "POST", body: JSON.stringify({ energy, minutes }) }),
  braindump: (text: string) =>
    req<{ tasks: string[]; referral?: string | null }>("/api/braindump", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  transcribe: async (uri: string): Promise<{ text: string }> => {
    const form = new FormData();
    // On native, we pass an object with uri/name/type; on web we blob.
    // Using `any` avoids strict FormData typing issues in RN.
    // @ts-ignore RN FormData accepts { uri, name, type }
    form.append("audio", { uri, name: "audio.m4a", type: "audio/m4a" });
    const headers = await (async () => {
      const h: Record<string, string> = {};
      const { identity } = await import("./identity");
      const token = await identity.getToken();
      if (token) h["Authorization"] = `Bearer ${token}`;
      else h["X-Device-Id"] = await identity.getDeviceId();
      return h;
    })();
    const res = await fetch(`${BASE}/api/transcribe`, {
      method: "POST",
      headers,
      body: form as any,
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return await res.json();
  },
  roomSend: (session_id: string, text: string, goal?: string) =>
    req<{ reply: string }>("/api/room/message", {
      method: "POST",
      body: JSON.stringify({ session_id, text, goal }),
    }),
  roomHistory: (session_id: string) => req<RoomMessage[]>(`/api/room/history/${session_id}`),
  streak: () => req<StreakStats>("/api/streak"),
  access: () => req<AccessSnapshot>("/api/me/access"),

  // Auth
  exchangeSession: (session_token: string, device_id?: string) =>
    req<StoredUser & { session_token: string; expires_at: string }>("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ session_token, device_id }),
    }),
  me: () => req<StoredUser>("/api/auth/me"),
  logout: () => req<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
};
