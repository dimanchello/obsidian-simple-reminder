/**
 * Simple Reminder — Public Plugin API
 *
 * Access from another plugin:
 *
 *   import type { SimpleReminderAPI } from 'path/to/api'; // types only
 *
 *   const sr = (app as any).plugins.plugins['simple-reminder'];
 *   if (!sr?.api) { new Notice('Simple Reminder not installed'); return; }
 *   const api: SimpleReminderAPI = sr.api;
 */

import { Reminder, CalendarUnit, PeriodicUnit } from './types';
import { generateId, calcNextTrigger, calcNextCalendarTrigger, calcNextPeriodicTrigger } from './utils';
import type SimpleReminderPlugin from './main';

// ─── Public option types ──────────────────────────────────────────────────────

export interface OnceOptions {
  type: 'once';
  /** ISO string, timestamp (ms), or Date object. */
  date: string | number | Date;
}

export interface RepeatOptions {
  type: 'repeat';
  /** Interval in minutes. Min: 1. */
  intervalMin: number;
  /** Don't fire before this moment. */
  startDate?: string | number | Date;
  /** Stop firing after this moment. */
  endDate?: string | number | Date;
  /** Only fire inside this daily time window. Format: "HH:MM". */
  timeWindowStart?: string;
  timeWindowEnd?: string;
  /** Only fire on these weekdays (0 = Sun … 6 = Sat). */
  daysOfWeek?: number[];
}

export interface CalendarOptions {
  type:         'calendar';
  unit:         CalendarUnit;
  /** Notification time of day. Format: "HH:MM". */
  time:         string;
  /** For unit = 'week': 0 = Sun … 6 = Sat. Single value or array for multi-day. */
  dayOfWeek?:   number | number[];
  /** For unit = 'month' or 'year': 1–31. */
  dayOfMonth?:  number;
  /** For unit = 'year': 0 = Jan … 11 = Dec. */
  month?:       number;
}

export interface PeriodicOptions {
  type:         'periodic';
  unit:         PeriodicUnit;
  /** Every N units. Min: 1. */
  n:            number;
  /** Notification time. Format: "HH:MM". */
  time:         string;
  /** Anchor date — defines the phase. Accepts Date, ms timestamp, or ISO string. */
  startDate:    string | number | Date;
}

export type AddReminderOptions = { title: string } &
  (OnceOptions | RepeatOptions | CalendarOptions | PeriodicOptions);

// ─── Public read model ────────────────────────────────────────────────────────

/** A read-only snapshot of a reminder, safe to expose to external plugins. */
export interface ReminderInfo {
  readonly id:          string;
  readonly title:       string;
  readonly checked:     boolean;
  readonly type:        string;
  readonly nextTrigger: number | null;
  /** Full detail — cast to the specific option type you need. */
  readonly raw:         Readonly<Reminder>;
}

// ─── Event map ────────────────────────────────────────────────────────────────

export type ReminderEvent =
  | 'reminder-fired'
  | 'reminder-added'
  | 'reminder-removed'
  | 'reminder-updated';

type EventCallback<E extends ReminderEvent> =
  E extends 'reminder-removed' ? (id: string)              => void
                               : (info: ReminderInfo)       => void;

// ─── API interface ────────────────────────────────────────────────────────────

export interface SimpleReminderAPI {
  /** Semver version of the API contract. Check this before calling methods. */
  readonly version: string;

  // ── CRUD ──────────────────────────────────────────────────────────────────

  /**
   * Create a new reminder.
   * @returns The ID of the newly created reminder.
   */
  addReminder(options: AddReminderOptions): string;

  /**
   * Remove a reminder by ID.
   * @returns `true` if found and deleted, `false` if not found.
   */
  removeReminder(id: string): boolean;

  /**
   * Update fields of an existing reminder and recalculate nextTrigger.
   * @returns `true` if found and updated.
   */
  updateReminder(id: string, options: Partial<AddReminderOptions>): boolean;

  /**
   * Mark a reminder as done or undone.
   * A checked reminder will not fire until unchecked.
   * @returns `true` if found.
   */
  setChecked(id: string, checked: boolean): boolean;

  // ── Queries ────────────────────────────────────────────────────────────────

  /** Returns a snapshot copy of all reminders. */
  getReminders(): ReminderInfo[];

  /** Returns a snapshot of one reminder, or null if not found. */
  getReminder(id: string): ReminderInfo | null;

  // ── Events ────────────────────────────────────────────────────────────────

  /**
   * Subscribe to a reminder lifecycle event.
   * @returns An unsubscribe function — call it to remove the listener.
   *
   * @example
   * const unsub = api.on('reminder-fired', info => {
   *   console.log('Fired:', info.title);
   * });
   * // later:
   * unsub();
   */
  on<E extends ReminderEvent>(event: E, callback: EventCallback<E>): () => void;
}

// ─── Implementation ───────────────────────────────────────────────────────────

function toTs(value: string | number | Date | undefined): number | null {
  if (value == null)            return null;
  if (value instanceof Date)    return value.getTime();
  if (typeof value === 'number') return value;
  const ts = new Date(value).getTime();
  return isNaN(ts) ? null : ts;
}

function toInfo(r: Reminder): ReminderInfo {
  return { id: r.id, title: r.title, checked: r.checked, type: r.type, nextTrigger: r.nextTrigger, raw: r };
}

export class SimpleReminderAPIImpl implements SimpleReminderAPI {
  readonly version = '1.0.0';

  private plugin: SimpleReminderPlugin;
  private listeners: Map<ReminderEvent, Set<(...args: unknown[]) => void>> = new Map();

  constructor(plugin: SimpleReminderPlugin) {
    this.plugin = plugin;
  }

  // ── Internal event bus ────────────────────────────────────────────────────

  /** Called by the plugin when a reminder fires. */
  _emitFired(r: Reminder): void    { this._emit('reminder-fired',   toInfo(r)); }
  /** Called by the plugin when a reminder is added. */
  _emitAdded(r: Reminder): void    { this._emit('reminder-added',   toInfo(r)); }
  /** Called by the plugin when a reminder is removed. */
  _emitRemoved(id: string): void   { this._emit('reminder-removed', id); }
  /** Called by the plugin when a reminder is updated. */
  _emitUpdated(r: Reminder): void  { this._emit('reminder-updated', toInfo(r)); }

  private _emit(event: ReminderEvent, payload: unknown): void {
    this.listeners.get(event)?.forEach(cb => {
      try { cb(payload); } catch (e) { console.error('[SimpleReminder API] event handler error:', e); }
    });
  }

  // ── SimpleReminderAPI ─────────────────────────────────────────────────────

  on<E extends ReminderEvent>(event: E, callback: EventCallback<E>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    const set = this.listeners.get(event)!;
    set.add(callback as (...args: unknown[]) => void);
    return () => set.delete(callback as (...args: unknown[]) => void);
  }

  addReminder(options: AddReminderOptions): string {
    const now = Date.now();
    const r: Reminder = {
      id: generateId(), title: options.title.trim(), checked: false,
      type: 'specific', specificTs: null, interval: 0,
      startTs: null, endTs: null,
      timeWindowStart: null, timeWindowEnd: null, daysOfWeek: null,
      calendarUnit: null, calendarTime: null,
      calendarDayOfWeek: null, calendarDayOfMonth: null, calendarMonth: null,
      periodicUnit: null, periodicN: null, periodicTime: null, periodicStart: null,
      nextTrigger: null,
    };

    if (options.type === 'once') {
      const ts = toTs(options.date);
      r.type = 'specific'; r.specificTs = ts; r.nextTrigger = ts;

    } else if (options.type === 'repeat') {
      r.type        = 'flexible';
      r.interval    = Math.max(1, options.intervalMin ?? 15);
      r.startTs     = toTs(options.startDate);
      r.endTs       = toTs(options.endDate);
      r.timeWindowStart = options.timeWindowStart ?? null;
      r.timeWindowEnd   = options.timeWindowEnd   ?? null;
      r.daysOfWeek      = options.daysOfWeek       ?? null;
      r.nextTrigger = calcNextTrigger(r, now);

    } else if (options.type === 'calendar') {
      r.type               = 'calendar';
      r.calendarUnit       = options.unit;
      r.calendarTime       = options.time       ?? '09:00';
      r.calendarDayOfWeek  = options.dayOfWeek != null
        ? (Array.isArray(options.dayOfWeek) ? options.dayOfWeek : [options.dayOfWeek])
        : null;
      r.calendarDayOfMonth = options.dayOfMonth ?? null;
      r.calendarMonth      = options.month      ?? null;
      r.nextTrigger        = calcNextCalendarTrigger(r, now);

    } else if (options.type === 'periodic') {
      const startTs        = toTs(options.startDate) ?? Date.now();
      r.type               = 'periodic';
      r.periodicUnit       = options.unit;
      r.periodicN          = Math.max(1, options.n ?? 1);
      r.periodicTime       = options.time ?? '09:00';
      r.periodicStart      = startTs;
      r.nextTrigger        = calcNextPeriodicTrigger(r, now);
    }

    this.plugin.reminders.push(r);
    this.plugin.saveSettings();
    this._emitAdded(r);
    this.plugin.refreshView();
    return r.id;
  }

  removeReminder(id: string): boolean {
    const idx = this.plugin.reminders.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.plugin.reminders.splice(idx, 1);
    this.plugin.saveSettings();
    this._emitRemoved(id);
    this.plugin.refreshView();
    return true;
  }

  updateReminder(id: string, options: Partial<AddReminderOptions>): boolean {
    const r = this.plugin.reminders.find(x => x.id === id);
    if (!r) return false;
    const now = Date.now();

    if (options.title) r.title = options.title.trim();

    if (options.type === 'once' && options.date != null) {
      const ts = toTs(options.date);
      r.type = 'specific'; r.specificTs = ts; r.nextTrigger = ts;

    } else if (options.type === 'repeat') {
      r.type     = 'flexible';
      if (options.intervalMin)     r.interval        = Math.max(1, options.intervalMin);
      if (options.startDate)       r.startTs         = toTs(options.startDate);
      if (options.endDate)         r.endTs           = toTs(options.endDate);
      if (options.timeWindowStart) r.timeWindowStart = options.timeWindowStart;
      if (options.timeWindowEnd)   r.timeWindowEnd   = options.timeWindowEnd;
      if (options.daysOfWeek)      r.daysOfWeek      = options.daysOfWeek;
      r.nextTrigger = calcNextTrigger(r, now);

    } else if (options.type === 'calendar') {
      r.type = 'calendar';
      if (options.unit)      r.calendarUnit       = options.unit;
      if (options.time)      r.calendarTime       = options.time;
      if (options.dayOfWeek  != null) r.calendarDayOfWeek =
        Array.isArray(options.dayOfWeek) ? options.dayOfWeek : [options.dayOfWeek];
      if (options.dayOfMonth != null) r.calendarDayOfMonth = options.dayOfMonth;
      if (options.month      != null) r.calendarMonth      = options.month;
      r.nextTrigger = calcNextCalendarTrigger(r, now);

    } else if (options.type === 'periodic') {
      r.type = 'periodic';
      if (options.unit      != null) r.periodicUnit  = options.unit;
      if (options.n         != null) r.periodicN     = Math.max(1, options.n);
      if (options.time      != null) r.periodicTime  = options.time;
      if (options.startDate != null) r.periodicStart = toTs(options.startDate);
      r.nextTrigger = calcNextPeriodicTrigger(r, now);
    }

    this.plugin.saveSettings();
    this._emitUpdated(r);
    this.plugin.refreshView();
    return true;
  }

  setChecked(id: string, checked: boolean): boolean {
    const r = this.plugin.reminders.find(x => x.id === id);
    if (!r) return false;
    r.checked = checked;
    this.plugin.saveSettings();
    this._emitUpdated(r);
    this.plugin.refreshView();
    return true;
  }

  getReminders(): ReminderInfo[] {
    return this.plugin.reminders.map(toInfo);
  }

  getReminder(id: string): ReminderInfo | null {
    const r = this.plugin.reminders.find(x => x.id === id);
    return r ? toInfo(r) : null;
  }
}
