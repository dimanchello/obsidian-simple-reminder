// ─── Reminder types ───────────────────────────────────────────────────────────

/** Legacy types kept for backward compatibility with existing data.json entries. */
export type ReminderType = 'interval' | 'specific' | 'scheduled' | 'flexible';

export interface Reminder {
  id:      string;
  title:   string;
  checked: boolean;
  type:    ReminderType;

  // ── One-shot ───────────────────────────────────────────────────────────────
  /** For type='specific': the exact fire timestamp. */
  specificTs: number | null;

  // ── Repeat / flexible fields ───────────────────────────────────────────────
  /** Repeat interval in minutes (used by interval / scheduled / flexible). */
  interval: number;

  /** Don't fire before this timestamp (also used by legacy 'scheduled'). */
  startTs: number | null;

  /** Stop firing after this timestamp (null = no end). */
  endTs: number | null;

  /**
   * Daily time-of-day window: fire only between these local times.
   * Format: "HH:MM" (24h). Both must be set or both null.
   */
  timeWindowStart: string | null;
  timeWindowEnd:   string | null;

  /**
   * Restrict to certain weekdays.
   * 0 = Sunday … 6 = Saturday. null = every day.
   */
  daysOfWeek: number[] | null;

  // ── Runtime ────────────────────────────────────────────────────────────────
  /** Next planned fire timestamp. null = no future trigger. */
  nextTrigger: number | null;
}

// ─── Plugin settings ──────────────────────────────────────────────────────────

export type Language = 'auto' | 'en' | 'ru';

export interface PluginSettings {
  reminders:        Reminder[];
  checkIntervalSec: number;
  language:         Language;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  reminders:        [],
  checkIntervalSec: 30,
  language:         'auto',
};
