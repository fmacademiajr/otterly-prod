// Otterly backend client — hits /api/* on EXPO_PUBLIC_BACKEND_URL.

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!BASE) {
  // eslint-disable-next-line no-console
  console.warn("EXPO_PUBLIC_BACKEND_URL not set");
}

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

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export const api = {
  listTasks: () => req<Task[]>("/api/tasks"),
  createTask: (title: string, note?: string) =>
    req<Task>("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title, note }),
    }),
  deleteTask: (id: string) =>
    req<{ ok: boolean }>(`/api/tasks/${id}`, { method: "DELETE" }),

  listSteps: (taskId: string) => req<Step[]>(`/api/tasks/${taskId}/steps`),
  shrinkTask: (taskId: string, difficulty: "easy" | "medium" | "hard") =>
    req<Step[]>(`/api/tasks/${taskId}/shrink`, {
      method: "POST",
      body: JSON.stringify({ difficulty }),
    }),

  toggleStep: (stepId: string, done: boolean) =>
    req<Step>(`/api/steps/${stepId}`, {
      method: "PATCH",
      body: JSON.stringify({ done }),
    }),

  next: (energy: Energy, minutes?: number) =>
    req<NextResponse>("/api/next", {
      method: "POST",
      body: JSON.stringify({ energy, minutes }),
    }),

  braindump: (text: string) =>
    req<{ tasks: string[] }>("/api/braindump", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  roomSend: (session_id: string, text: string, goal?: string) =>
    req<{ reply: string }>("/api/room/message", {
      method: "POST",
      body: JSON.stringify({ session_id, text, goal }),
    }),

  roomHistory: (session_id: string) =>
    req<RoomMessage[]>(`/api/room/history/${session_id}`),

  streak: () => req<StreakStats>("/api/streak"),
};
