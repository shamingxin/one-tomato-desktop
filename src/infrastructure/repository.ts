import type { TimerSettings, TimerState } from "../domain/types";

export interface TaskRecord {
  id: string;
  title: string;
  completed: boolean;
  position: number;
}

export interface FocusSession {
  id: string;
  completionKey: string;
  taskId: string | null;
  startedAt: number;
  endedAt: number;
  durationMs: number;
}

export interface AppSettings extends TimerSettings {
  themeId: string;
  locale: "zh-CN" | "en";
  notifications: boolean;
  sound: boolean;
}

export interface DailyStats {
  sessions: number;
  focusMinutes: number;
}

export interface Repository {
  loadSnapshot(): Promise<TimerState | null>;
  saveSnapshot(snapshot: TimerState): Promise<void>;
  listTasks(): Promise<TaskRecord[]>;
  saveTask(task: TaskRecord): Promise<void>;
  deleteTask(id: string): Promise<void>;
  completeSession(session: FocusSession): Promise<void>;
  getDailyStats(startMs: number, endMs: number): Promise<DailyStats>;
  loadSettings(): Promise<AppSettings | null>;
  saveSettings(settings: AppSettings): Promise<void>;
}

export class MemoryRepository implements Repository {
  private snapshot: TimerState | null = null;
  private settings: AppSettings | null = null;
  private tasks = new Map<string, TaskRecord>();
  private sessions = new Map<string, FocusSession>();

  async loadSnapshot(): Promise<TimerState | null> {
    return this.snapshot ? structuredClone(this.snapshot) : null;
  }

  async saveSnapshot(snapshot: TimerState): Promise<void> {
    this.snapshot = structuredClone(snapshot);
  }

  async listTasks(): Promise<TaskRecord[]> {
    return [...this.tasks.values()]
      .sort((a, b) => a.position - b.position)
      .map((task) => ({ ...task }));
  }

  async saveTask(task: TaskRecord): Promise<void> {
    this.tasks.set(task.id, { ...task });
  }

  async deleteTask(id: string): Promise<void> {
    this.tasks.delete(id);
  }

  async completeSession(session: FocusSession): Promise<void> {
    if (!this.sessions.has(session.completionKey)) {
      this.sessions.set(session.completionKey, { ...session });
    }
  }

  async getDailyStats(startMs: number, endMs: number): Promise<DailyStats> {
    const sessions = [...this.sessions.values()].filter(
      (session) => session.endedAt >= startMs && session.endedAt < endMs,
    );
    return {
      sessions: sessions.length,
      focusMinutes: Math.round(
        sessions.reduce((total, session) => total + session.durationMs, 0) /
          60_000,
      ),
    };
  }

  async loadSettings(): Promise<AppSettings | null> {
    return this.settings ? structuredClone(this.settings) : null;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    this.settings = structuredClone(settings);
  }
}
