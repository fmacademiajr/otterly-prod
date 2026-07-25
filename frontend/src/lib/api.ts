// Otterly backend client — sends Bearer token when signed in, else X-Device-Id.

import { identity } from "./identity";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
const DEMO =
  typeof __DEV__ !== "undefined" && __DEV__;

const NOW = () => new Date().toISOString();
const DEMO_TASK: Task = { id: "demo-task-1", title: "Take the bins out", note: null, created_at: NOW(), shrunk: true, difficulty: "easy" };
const DEMO_STEPS: Step[] = [
  { id: "demo-step-1", task_id: "demo-task-1", order: 1, text: "Stand up and stretch for 10 seconds", minutes: 1, done: false, completed_at: null },
  { id: "demo-step-2", task_id: "demo-task-1", order: 2, text: "Walk to the kitchen and find the bin bags", minutes: 2, done: false, completed_at: null },
  { id: "demo-step-3", task_id: "demo-task-1", order: 3, text: "Tie the bag and carry it to the outside bin, then put in a fresh one", minutes: 5, done: false, completed_at: null },
];
const DEMO_ROOM: RoomMessage[] = [
  { id: "demo-msg-1", session_id: "demo-session", role: "user", text: "I'm struggling to start my day. I have so many things to do and I just feel stuck.", created_at: NOW() },
  { id: "demo-msg-3", session_id: "demo-session", role: "user", text: "I guess taking the bins out. It's been three days.", created_at: NOW() },
  { id: "demo-msg-4", session_id: "demo-session", role: "otter", text: "Three days is okay. Let's make it easier. Stand up first — just that. I'll wait.", created_at: NOW() },
];
const DEMO_STREAK: StreakStats = { days_this_week: 4, total_days: 12, todays_steps: 1 };
const DEMO_ACCESS: AccessSnapshot = { premium: true, plan: "lifetime", limits: { shrinks_today: 5, shrinks_cap: 999, braindumps_today: 5, braindumps_cap: 999, room_today: 50, room_cap: 999 } };

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
  listTasks: () => DEMO ? Promise.resolve([DEMO_TASK]) : req<Task[]>("/api/tasks"),
  createTask: (title: string, note?: string) =>
    DEMO ? Promise.resolve(DEMO_TASK) : req<Task>("/api/tasks", { method: "POST", body: JSON.stringify({ title, note }) }),
  classifyTask: (text: string) =>
    DEMO ? Promise.resolve({ category: "ok" as const, message: "" }) : req<{ category: "ok" | "crisis" | "medical" | "harm"; message: string }>("/api/tasks/classify", { method: "POST", body: JSON.stringify({ text }) }),
  deleteTask: (id: string) =>
    DEMO ? Promise.resolve({ ok: true }) : req<{ ok: boolean }>(`/api/tasks/${id}`, { method: "DELETE" }),
  listSteps: (taskId: string) => DEMO ? Promise.resolve(DEMO_STEPS) : req<Step[]>(`/api/tasks/${taskId}/steps`),
  shrinkTask: (taskId: string, difficulty: "easy" | "medium" | "hard", deep = false, opts: { force?: boolean; tooBig?: boolean; energy?: Energy } = {}) =>
    DEMO ? Promise.resolve(DEMO_STEPS) : req<Step[]>(`/api/tasks/${taskId}/shrink`, { method: "POST", body: JSON.stringify({ difficulty, deep, force: opts.force ?? false, too_big: opts.tooBig ?? false, energy: opts.energy ?? "medium" }) }),
  toggleStep: (stepId: string, done: boolean) =>
    DEMO ? Promise.resolve(DEMO_STEPS[0]) : req<Step>(`/api/steps/${stepId}`, { method: "PATCH", body: JSON.stringify({ done }) }),
  resplitStep: (stepId: string) =>
    DEMO ? Promise.resolve(DEMO_STEPS) : req<Step[]>(`/api/steps/${stepId}/resplit`, { method: "POST" }),
  next: (energy: Energy, minutes?: number) =>
    DEMO ? Promise.resolve({ task: DEMO_TASK, step: DEMO_STEPS[0], reason: "Your next step is waiting.", empty: false }) : req<NextResponse>("/api/next", { method: "POST", body: JSON.stringify({ energy, minutes }) }),
  braindump: (text: string) =>
    DEMO ? Promise.resolve({ tasks: ["Take the bins out", "Book dentist appointment", "Reply to Sarah's email", "Order more coffee"] }) : req<{ tasks: string[]; referral?: string | null }>("/api/braindump", { method: "POST", body: JSON.stringify({ text }) }),

  transcribe: async (uri: string): Promise<{ text: string }> => {
    if (DEMO) return Promise.resolve({ text: "captured some thoughts on my mind today" });
    const form = new FormData();
    form.append("audio", { uri, name: "audio.m4a", type: "audio/m4a" } as any);
    const headers = await (async () => {
      const h: Record<string, string> = {};
      const { identity } = await import("./identity");
      const token = await identity.getToken();
      if (token) h["Authorization"] = `Bearer ${token}`;
      else h["X-Device-Id"] = await identity.getDeviceId();
      return h;
    })();
    const res = await fetch(`${BASE}/api/transcribe`, { method: "POST", headers, body: form as any });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return await res.json();
  },
  roomSend: (session_id: string, text: string, goal?: string) =>
    DEMO ? Promise.resolve({ reply: "I hear you. Let's pick just one thing. What's the smallest task you've been avoiding? I'll sit with you while you do it." }) : req<{ reply: string }>("/api/room/message", { method: "POST", body: JSON.stringify({ session_id, text, goal }) }),
  roomHistory: (session_id: string) => DEMO ? Promise.resolve(DEMO_ROOM) : req<RoomMessage[]>(`/api/room/history/${session_id}`),
  streak: () => DEMO ? Promise.resolve(DEMO_STREAK) : req<StreakStats>("/api/streak"),
  access: () => DEMO ? Promise.resolve(DEMO_ACCESS) : req<AccessSnapshot>("/api/me/access"),
  logEvent: (type: string, data?: Record<string, any>) =>
    DEMO ? Promise.resolve({ ok: true }) : req<{ ok: boolean }>("/api/events", { method: "POST", body: JSON.stringify({ type, task_id: data?.task_id ?? null, data }) }).catch(() => ({ ok: false })),

  exchangeSession: (session_token: string, device_id?: string) =>
    DEMO ? Promise.resolve({ user_id: "demo-user", email: "demo@getotterly.com", name: "Demo Otter", picture: null, session_token: "demo-session-token", expires_at: "2099-12-31T00:00:00Z" }) : req<StoredUser & { session_token: string; expires_at: string }>("/api/auth/session", { method: "POST", body: JSON.stringify({ session_token, device_id }) }),
  appleAuth: (identity_token: string, device_id?: string, full_name?: string) =>
    DEMO ? Promise.resolve({ user_id: "demo-user", email: "demo@getotterly.com", name: "Demo Otter", picture: null, session_token: "demo-session-token", expires_at: "2099-12-31T00:00:00Z" }) : req<StoredUser & { session_token: string; expires_at: string }>("/api/auth/apple", { method: "POST", body: JSON.stringify({ identity_token, device_id, full_name }) }),
  me: () => DEMO ? Promise.resolve({ user_id: "demo-user", email: "demo@getotterly.com", name: "Demo Otter", picture: null }) : req<StoredUser>("/api/auth/me"),
  logout: () => DEMO ? Promise.resolve({ ok: true }) : req<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  deleteAccount: async () =>
    DEMO ? Promise.resolve({ ok: true, deleted: {} }) : req<{ ok: boolean; deleted: Record<string, number> }>("/api/account", { method: "DELETE", headers: { "X-Device-Id": await identity.getDeviceId() } }),

  redeemVoucher: (code: string) =>
    DEMO ? Promise.resolve({ ok: true, plan: "lifetime", expires_at_ms: Date.now() + 365 * 86400000 }) : req<{ ok: boolean; plan: string; expires_at_ms?: number | null }>("/api/vouchers/redeem", { method: "POST", body: JSON.stringify({ code }) }),
};
