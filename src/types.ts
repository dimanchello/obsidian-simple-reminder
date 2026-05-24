export type ReminderType = 'once' | 'repeat';
export type RepeatUnit = 'day' | 'week' | 'month' | 'year';
export type RemindBeforeUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
export type Language = 'auto' | 'en' | 'ru';

export interface RemindBeforeEntry {
  value: number;
  unit: RemindBeforeUnit;
  trigger?: number | null;
}

export interface Reminder {
  id: string;
  title: string;
  checked: boolean;
  type: ReminderType;

  // ── Разовое ─────────────────────────────────────────────────────────────────
  specificTs: number | null;

  // ── Меж-дневные правила (Календарь) ─────────────────────────────────────────
  repUnit: RepeatUnit | null;
  repStep: number | null; // каждые X (дней/недель...)
  repDaysOfWeek: number[] | null; // [0, 1, 2] (Вс, Пн, Вт)
  repDayOfMonth: number | null; // 1-31
  repMonth: number | null; // 0-11

  // ── Границы (Ограничения по датам) ──────────────────────────────────────────
  startDate: number | null;
  endDate: number | null;

  // ── Внутри-дневные правила (Время) ──────────────────────────────────────────
  intraDayMode: 'single' | 'interval' | null;
  intraDayTime: string | null; // "HH:MM"
  intraDayStepMin: number | null; // интервал в минутах
  timeWindowStart: string | null; // "HH:MM"
  timeWindowEnd: string | null; // "HH:MM"

  // ── Напомнить за X до срабатывания ──────────────────────────────────────────
  remindBefore: RemindBeforeEntry[];

  // ── Эмодзи напоминания ──────────────────────────────────────────────────────
  emoji: string;

  // ── Runtime ─────────────────────────────────────────────────────────────────
  nextTrigger: number | null;
  completedAt: number | null;
}

export interface PluginSettings {
  reminders: Reminder[];
  checkIntervalSec: number;
  language: Language;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  reminders: [],
  checkIntervalSec: 30,
  language: 'auto',
};

export interface LegacyReminder {
  id?: string;
  title?: string;
  checked?: boolean;
  type?: string;
  specificTs?: number | null;
  startTs?: number | null;
  endTs?: number | null;
  periodicStart?: number | null;
  periodicUnit?: RepeatUnit;
  periodicN?: number;
  periodicDayOfWeek?: number[] | null;
  periodicDayOfMonth?: number | null;
  periodicMonth?: number | null;
  periodicTime?: string;
  daysOfWeek?: number[] | null;
  interval?: number;
  timeWindowStart?: string | null;
  timeWindowEnd?: string | null;
}
