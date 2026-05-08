export type ReminderType  = 'interval' | 'specific' | 'scheduled' | 'flexible' | 'calendar' | 'periodic';
export type CalendarUnit  = 'day' | 'week' | 'month' | 'year';
export type PeriodicUnit  = 'day' | 'week' | 'month' | 'year';
export type Language      = 'auto' | 'en' | 'ru';

export interface Reminder {
  id:      string;
  title:   string;
  checked: boolean;
  type:    ReminderType;

  // ── One-shot ───────────────────────────────────────────────────────────────
  specificTs: number | null;

  // ── Flexible / interval ────────────────────────────────────────────────────
  interval:        number;
  startTs:         number | null;
  endTs:           number | null;
  timeWindowStart: string | null;  // "HH:MM"
  timeWindowEnd:   string | null;
  daysOfWeek:      number[] | null;

  // ── Calendar recurrence ────────────────────────────────────────────────────
  calendarUnit:       CalendarUnit | null;
  calendarTime:       string | null;    // "HH:MM"
  calendarDayOfWeek:  number[] | null;  // 0-6 each, multi-select (for 'week')
  calendarDayOfMonth: number | null;    // 1-31 (for 'month' and 'year')
  calendarMonth:      number | null;    // 0-11 (for 'year')

  // ── Periodic recurrence ────────────────────────────────────────────────────
  periodicUnit:  PeriodicUnit | null;
  periodicN:     number | null;   // every N units (>=1)
  periodicTime:  string | null;   // "HH:MM" — time of day to fire
  periodicStart: number | null;   // anchor timestamp — defines the phase

  // ── Runtime ────────────────────────────────────────────────────────────────
  nextTrigger: number | null;
}

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
