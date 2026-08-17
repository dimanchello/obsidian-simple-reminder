export type ReminderType = 'once' | 'repeat';
export type RepeatUnit = 'day' | 'week' | 'month' | 'year';
export type RemindBeforeUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
export type GroupBy = 'none' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
export type Language = 'auto' | 'en' | 'ru';

export interface RemindBeforeEntry {
  value: number;
  unit: RemindBeforeUnit;
  trigger: number | null;
}

export interface Reminder {
  id: string;
  title: string;
  checked: boolean;
  type: ReminderType;

  // ── Разовое ─────────────────────────────────────────────────────────────────
  specificTs: number | null;
  nagMode: boolean | null; // Если true, то после срабатывания сдвигается на nagIntervalMin, пока не будет отмечено вручную
  nagIntervalMin: number | null;

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

  // ── Эмодзи и описание напоминания ──────────────────────────────────────────
  emoji: string;
  description?: string;
  url?: string;

  // ── Runtime ─────────────────────────────────────────────────────────────────
  nextTrigger: number | null;
  completedAt: number | null;
  nagSilencedUntil: number | null;
}

export interface PluginSettings {
  reminders: Reminder[];
  checkIntervalSec: number;
  language: Language;
  activeTab: 'all' | 'active' | 'done';
  groupBy: GroupBy;
  pruneCompletedDays: number;
}

export interface CodeBlockConfig {
  tab?: 'all' | 'active' | 'done';
  groupBy?: GroupBy;
  showHeader?: boolean;
  showTabs?: boolean;
  title?: string;
}

export const DEFAULT_EMOJI = '⏰';

export const DEFAULT_SETTINGS: PluginSettings = {
  reminders: [],
  checkIntervalSec: 30,
  language: 'auto',
  activeTab: 'all',
  groupBy: 'none',
  pruneCompletedDays: 3,
};

/** Legacy format for backward compatibility (pre-v1.0.0). Migrated via migrateLegacyReminder(). */
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
