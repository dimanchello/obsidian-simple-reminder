// ─── Reminder data ────────────────────────────────────────────────────────────

export type ReminderType = 'interval' | 'specific' | 'scheduled';

export interface Reminder {
    id: string;
    title: string;
    checked: boolean;
    type: ReminderType;
    /** Repeat period in minutes (used by 'interval' and 'scheduled'). */
    interval: number;
    /** Timestamp of the next planned trigger (null = no future trigger). */
    nextTrigger: number | null;
    /** For type='specific': the one-shot fire timestamp. */
    specificTs: number | null;
    /** For type='scheduled': the start timestamp. */
    startTs: number | null;
}

// ─── Plugin settings ──────────────────────────────────────────────────────────

export type Language = 'auto' | 'en' | 'ru';

export interface PluginSettings {
    reminders: Reminder[];
    /** How often (in seconds) the plugin checks for due reminders. Min: 2. */
    checkIntervalSec: number;
    language: Language;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    reminders: [],
    checkIntervalSec: 30,
    language: 'auto',
};
