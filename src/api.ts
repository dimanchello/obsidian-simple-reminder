import { Reminder, RepeatUnit } from './types';
import { generateId, calcNextTrigger, calcRemindBeforeTrigger } from './utils';
import type SimpleReminderPlugin from './main';

export interface OnceOptions {
  type: 'once';
  date: string | number | Date;
}

export interface RepeatOptions {
  type: 'repeat';
  unit: RepeatUnit;
  step: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  month?: number;

  startDate?: string | number | Date;
  endDate?: string | number | Date;

  intraDayMode: 'single' | 'interval';
  intraDayTime?: string;
  intraDayStepMin?: number;
  timeWindowStart?: string;
  timeWindowEnd?: string;
}

export type AddReminderOptions = {
  title: string;
  emoji?: string;
  remindBeforeValue?: number;
  remindBeforeUnit?: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
} & (OnceOptions | RepeatOptions);

export interface ReminderInfo {
  readonly id: string;
  readonly title: string;
  readonly emoji: string;
  readonly checked: boolean;
  readonly type: string;
  readonly nextTrigger: number | null;
  readonly raw: Readonly<Reminder>;
}

export type ReminderEvent = 'reminder-fired' | 'reminder-added' | 'reminder-removed' | 'reminder-updated';

type EventCallback<E extends ReminderEvent> = E extends 'reminder-removed'
  ? (id: string) => void
  : (info: ReminderInfo) => void;

export interface SimpleReminderAPI {
  readonly version: string;
  addReminder(options: AddReminderOptions): string;
  removeReminder(id: string): boolean;
  setChecked(id: string, checked: boolean): boolean;
  getReminders(): ReminderInfo[];
  getReminder(id: string): ReminderInfo | null;
  on<E extends ReminderEvent>(event: E, callback: EventCallback<E>): () => void;
}

function toTs(value: string | number | Date | undefined): number | null {
  if (value == null) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  const ts = new Date(value).getTime();
  return isNaN(ts) ? null : ts;
}

function toInfo(r: Reminder): ReminderInfo {
  return {
    id: r.id,
    title: r.title,
    emoji: r.emoji,
    checked: r.checked,
    type: r.type,
    nextTrigger: r.nextTrigger,
    raw: r,
  };
}

export class SimpleReminderAPIImpl implements SimpleReminderAPI {
  readonly version = '1.1.0';
  private plugin: SimpleReminderPlugin;
  private listeners: Map<ReminderEvent, Set<(...args: unknown[]) => void>> = new Map();

  constructor(plugin: SimpleReminderPlugin) {
    this.plugin = plugin;
  }

  _emitFired(r: Reminder): void {
    this._emit('reminder-fired', toInfo(r));
  }
  _emitAdded(r: Reminder): void {
    this._emit('reminder-added', toInfo(r));
  }
  _emitRemoved(id: string): void {
    this._emit('reminder-removed', id);
  }
  _emitUpdated(r: Reminder): void {
    this._emit('reminder-updated', toInfo(r));
  }

  private _emit(event: ReminderEvent, payload: unknown): void {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(payload);
      } catch (e) {
        console.error('[SimpleReminder API] error:', e);
      }
    });
  }

  on<E extends ReminderEvent>(event: E, callback: EventCallback<E>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    const set = this.listeners.get(event)!;
    set.add(callback as (...args: unknown[]) => void);
    return () => set.delete(callback as (...args: unknown[]) => void);
  }

  addReminder(options: AddReminderOptions): string {
    const now = Date.now();
    const r: Reminder = {
      id: generateId(),
      title: options.title.trim(),
      checked: false,
      type: 'once',
      specificTs: null,
      repUnit: null,
      repStep: null,
      repDaysOfWeek: null,
      repDayOfMonth: null,
      repMonth: null,
      startDate: null,
      endDate: null,
      intraDayMode: null,
      intraDayTime: null,
      intraDayStepMin: null,
      timeWindowStart: null,
      timeWindowEnd: null,
      remindBeforeValue: null,
      remindBeforeUnit: null,
      emoji: '⏰',
      nextTrigger: null,
      remindBeforeTrigger: null,
      completedAt: null,
    };

    if (options.type === 'once') {
      r.type = 'once';
      r.specificTs = toTs(options.date);
    } else {
      r.type = 'repeat';
      r.repUnit = options.unit;
      r.repStep = options.step;
      r.repDaysOfWeek = options.daysOfWeek ?? null;
      r.repDayOfMonth = options.dayOfMonth ?? null;
      r.repMonth = options.month ?? null;
      r.startDate = toTs(options.startDate);
      r.endDate = toTs(options.endDate);
      r.intraDayMode = options.intraDayMode;
      r.intraDayTime = options.intraDayTime ?? null;
      r.intraDayStepMin = options.intraDayStepMin ?? null;
      r.timeWindowStart = options.timeWindowStart ?? null;
      r.timeWindowEnd = options.timeWindowEnd ?? null;
    }

    if (options.emoji) r.emoji = options.emoji;
    if (options.remindBeforeValue != null && options.remindBeforeValue > 0) {
      r.remindBeforeValue = options.remindBeforeValue;
      r.remindBeforeUnit = options.remindBeforeUnit ?? null;
    }

    r.nextTrigger = calcNextTrigger(r, now);
    if (r.remindBeforeValue != null) {
      r.remindBeforeTrigger = calcRemindBeforeTrigger(r);
    }
    this.plugin.reminders.push(r);
    this.plugin.saveSettings();
    this._emitAdded(r);
    this.plugin.refreshView();
    return r.id;
  }

  removeReminder(id: string): boolean {
    const idx = this.plugin.reminders.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    this.plugin.reminders.splice(idx, 1);
    this.plugin.saveSettings();
    this._emitRemoved(id);
    this.plugin.refreshView();
    return true;
  }

  setChecked(id: string, checked: boolean): boolean {
    const r = this.plugin.reminders.find((x) => x.id === id);
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
    const r = this.plugin.reminders.find((x) => x.id === id);
    return r ? toInfo(r) : null;
  }
}
