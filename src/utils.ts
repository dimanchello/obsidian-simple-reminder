import {
  Reminder,
  LegacyReminder,
  RemindBeforeUnit,
  RemindBeforeEntry,
  GroupBy,
  CodeBlockConfig,
  DEFAULT_EMOJI,
} from './types';
import { Strings } from './i18n';

export const DAY_MS = 86400_000;
export const MINUTE_MS = 60_000;
export const THREE_DAYS_MS = 3 * DAY_MS;
export const MAX_SEARCH_DAYS = 36500;

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

export function fmtDate(ts: number | null | undefined): string {
  if (ts == null) return '—';
  return new Date(ts).toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtDateShort(ts: number | null | undefined): string {
  if (ts == null) return '—';
  return new Date(ts).toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function mondayOf(d: Date): Date {
  const r = new Date(d);
  const diff = r.getDay() === 0 ? -6 : 1 - r.getDay();
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function parseTime(hhmm: string): [number, number] {
  const p = hhmm.split(':').map(Number);
  return [isNaN(p[0]) ? 9 : p[0], isNaN(p[1]) ? 0 : p[1]];
}

export function isValidDay(cand: Date, anchor: Date, r: Reminder): boolean {
  const diffDays = Math.round((cand.getTime() - anchor.getTime()) / DAY_MS);
  if (diffDays < 0) return false;

  const step = r.repStep || 1;

  if (r.repUnit === 'day') {
    return diffDays % step === 0;
  }
  if (r.repUnit === 'week') {
    const anchorMon = mondayOf(anchor);
    const candMon = mondayOf(cand);
    const diffWeeks = Math.round((candMon.getTime() - anchorMon.getTime()) / (7 * DAY_MS));
    if (diffWeeks % step !== 0) return false;

    const days = r.repDaysOfWeek && r.repDaysOfWeek.length > 0 ? r.repDaysOfWeek : [anchor.getDay()];
    return days.includes(cand.getDay());
  }
  if (r.repUnit === 'month') {
    const diffMonths = (cand.getFullYear() - anchor.getFullYear()) * 12 + (cand.getMonth() - anchor.getMonth());
    if (diffMonths % step !== 0) return false;

    const targetDay = r.repDayOfMonth || anchor.getDate();
    const lastDayOfMonth = new Date(cand.getFullYear(), cand.getMonth() + 1, 0).getDate();
    const expectedDay = Math.min(targetDay, lastDayOfMonth);
    return cand.getDate() === expectedDay;
  }
  if (r.repUnit === 'year') {
    const diffYears = cand.getFullYear() - anchor.getFullYear();
    if (diffYears % step !== 0) return false;

    const targetMonth = r.repMonth != null ? r.repMonth : anchor.getMonth();
    if (cand.getMonth() !== targetMonth) return false;

    const targetDay = r.repDayOfMonth || anchor.getDate();
    const lastDayOfMonth = new Date(cand.getFullYear(), cand.getMonth() + 1, 0).getDate();
    const expectedDay = Math.min(targetDay, lastDayOfMonth);
    return cand.getDate() === expectedDay;
  }
  return false;
}

function findNextTimeOnDay(candDay: Date, r: Reminder, now: number, startTs: number): number | null {
  const y = candDay.getFullYear();
  const m = candDay.getMonth();
  const d = candDay.getDate();

  if (r.intraDayMode === 'single') {
    const [hh, mm] = parseTime(r.intraDayTime || '09:00');
    const ts = new Date(y, m, d, hh, mm).getTime();
    if (ts > now && ts >= startTs) return ts;
    return null;
  }

  if (r.intraDayMode === 'interval') {
    const [sH, sM] = parseTime(r.timeWindowStart || '00:00');
    const [eH, eM] = parseTime(r.timeWindowEnd || '23:59');

    const winStart = new Date(y, m, d, sH, sM).getTime();
    let winEnd = new Date(y, m, d, eH, eM).getTime();
    if (winEnd < winStart) winEnd += DAY_MS;

    const stepMs = (r.intraDayStepMin || 15) * MINUTE_MS;
    const searchFrom = Math.max(now, startTs);
    let nextTs = winStart;

    if (searchFrom > winStart) {
      const elapsed = searchFrom - winStart;
      const steps = Math.floor(elapsed / stepMs) + 1;
      nextTs = winStart + steps * stepMs;
    }
    return nextTs <= winEnd ? nextTs : null;
  }
  return null;
}

export function calcNextTrigger(r: Reminder, now: number): number | null {
  if (r.type === 'once') {
    return r.specificTs && r.specificTs > now ? r.specificTs : null;
  }
  if (r.type !== 'repeat') {
    return null;
  }

  const anchorTs = r.startDate ?? now;
  const anchor = new Date(anchorTs);
  anchor.setHours(0, 0, 0, 0);

  const cand = new Date(Math.max(now, anchorTs));
  cand.setDate(cand.getDate() - 1);
  cand.setHours(0, 0, 0, 0);

  for (let i = 0; i < MAX_SEARCH_DAYS; i++) {
    if (cand.getTime() + DAY_MS >= anchor.getTime() && isValidDay(cand, anchor, r)) {
      const nextTime = findNextTimeOnDay(cand, r, now, anchorTs);
      if (nextTime !== null) {
        if (r.endDate && nextTime > r.endDate) {
          return null;
        }
        return nextTime;
      }
    }
    cand.setDate(cand.getDate() + 1);
  }
  return null;
}

export function advanceTrigger(r: Reminder, now: number): number | null {
  if (r.type === 'once') return null;
  const nextNow = Math.max(now, r.nextTrigger ?? now);
  return calcNextTrigger(r, nextNow + MINUTE_MS);
}

export function migrateLegacyReminder(r: LegacyReminder): Reminder {
  if (r.type === 'once' || r.type === 'repeat') return migrateRemindBefore(r as Reminder);

  const migrated: Reminder = {
    id: r.id ?? '',
    title: r.title ?? '',
    checked: r.checked ?? false,
    type: 'once',
    specificTs: r.specificTs ?? null,
    nagMode: false,
    nagIntervalMin: null,
    repUnit: null,
    repStep: null,
    repDaysOfWeek: null,
    repDayOfMonth: null,
    repMonth: null,
    startDate: r.startTs ?? r.periodicStart ?? null,
    endDate: r.endTs ?? null,
    intraDayMode: null,
    intraDayTime: null,
    intraDayStepMin: null,
    timeWindowStart: null,
    timeWindowEnd: null,
    remindBefore: [],
    emoji: DEFAULT_EMOJI,
    nextTrigger: null,
    completedAt: null,
    nagSilencedUntil: null,
  };

  if (r.type === 'specific') {
    migrated.type = 'once';
  } else if (r.type === 'flexible' || r.type === 'scheduled') {
    migrated.type = 'repeat';
    migrated.repUnit = 'day';
    migrated.repStep = 1;
    migrated.repDaysOfWeek = r.daysOfWeek ?? null;
    migrated.intraDayMode = 'interval';
    migrated.intraDayStepMin = r.interval ?? 15;
    migrated.timeWindowStart = r.timeWindowStart ?? '00:00';
    migrated.timeWindowEnd = r.timeWindowEnd ?? '23:59';
  } else if (r.type === 'periodic') {
    migrated.type = 'repeat';
    migrated.repUnit = r.periodicUnit ?? 'day';
    migrated.repStep = r.periodicN ?? 1;
    migrated.repDaysOfWeek = r.periodicDayOfWeek ?? null;
    migrated.repDayOfMonth = r.periodicDayOfMonth ?? null;
    migrated.repMonth = r.periodicMonth ?? null;
    migrated.intraDayMode = 'single';
    migrated.intraDayTime = r.periodicTime ?? '09:00';
  }
  migrated.nextTrigger = calcNextTrigger(migrated, Date.now());
  return migrated;
}

export function pruneOldCompleted(reminders: Reminder[], keepDays: number, now: number = Date.now()): Reminder[] {
  if (keepDays === 0) return reminders;
  const maxAgeMs = keepDays * DAY_MS;
  return reminders.filter((r) => {
    if (!r.checked || r.completedAt == null) return true;
    return now - r.completedAt <= maxAgeMs;
  });
}

export function remindBeforeToMs(value: number, unit: RemindBeforeUnit): number {
  switch (unit) {
    case 'minute':
      return value * MINUTE_MS;
    case 'hour':
      return value * 60 * MINUTE_MS;
    case 'day':
      return value * 1440 * MINUTE_MS;
    case 'week':
      return value * 10080 * MINUTE_MS;
    case 'month':
      return value * 43200 * MINUTE_MS;
    case 'year':
      return value * 525600 * MINUTE_MS;
  }
}

export function calcRemindBeforeTarget(targetTs: number, value: number, unit: RemindBeforeUnit): number {
  if (unit === 'month' || unit === 'year') {
    const d = new Date(targetTs);
    const targetDay = d.getDate();
    if (unit === 'month') {
      d.setMonth(d.getMonth() - value);
    }
    if (unit === 'year') {
      d.setFullYear(d.getFullYear() - value);
    }
    if (d.getDate() !== targetDay) {
      d.setDate(0);
    }
    return d.getTime();
  }
  return targetTs - remindBeforeToMs(value, unit);
}

export function calcRemindBeforeTriggers(
  nextTrigger: number | null,
  entries: RemindBeforeEntry[],
): RemindBeforeEntry[] {
  return entries.map((e) => {
    if (nextTrigger == null) return { ...e, trigger: null };
    const result = calcRemindBeforeTarget(nextTrigger, e.value, e.unit);
    return { ...e, trigger: result > Date.now() ? result : null };
  });
}

export function migrateRemindBefore(r: Reminder): Reminder {
  const raw = r as unknown as Record<string, unknown>;
  if (!Array.isArray(raw.remindBefore)) {
    if (raw.remindBeforeValue != null && (raw.remindBeforeValue as number) > 0) {
      r.remindBefore = [
        {
          value: raw.remindBeforeValue as number,
          unit: (raw.remindBeforeUnit as RemindBeforeUnit) || 'minute',
          trigger: (raw.remindBeforeTrigger as number | null) ?? null,
        },
      ];
    } else {
      r.remindBefore = [];
    }
    delete raw.remindBeforeValue;
    delete raw.remindBeforeUnit;
    delete raw.remindBeforeTrigger;
  }

  if (Array.isArray(r.remindBefore)) {
    r.remindBefore.forEach((rb) => {
      const u = rb.unit as string;
      let broken = false;
      if (['минут', 'минуты', 'минуту', 'minutes'].includes(u)) {
        rb.unit = 'minute';
        broken = true;
      } else if (['часов', 'часа', 'час', 'hours'].includes(u)) {
        rb.unit = 'hour';
        broken = true;
      } else if (['дней', 'дня', 'день', 'days'].includes(u)) {
        rb.unit = 'day';
        broken = true;
      } else if (['недель', 'недели', 'неделю', 'weeks'].includes(u)) {
        rb.unit = 'week';
        broken = true;
      } else if (['месяцев', 'месяца', 'месяц', 'months'].includes(u)) {
        rb.unit = 'month';
        broken = true;
      } else if (['лет', 'года', 'год', 'years'].includes(u)) {
        rb.unit = 'year';
        broken = true;
      }

      if (broken && rb.trigger === null) {
        const target = r.nextTrigger ?? r.specificTs;
        if (target) {
          const result = calcRemindBeforeTarget(target, rb.value, rb.unit as RemindBeforeUnit);
          if (result > Date.now()) {
            rb.trigger = result;
          }
        }
      }
    });
  }

  return r;
}

export interface ScheduleSummary {
  isOnce: boolean;
  tagCls: string;
  tagText: string;
  mainText: string;
  endBadgeText?: string;
}

export function formatScheduleSummary(r: Reminder, t: Strings): ScheduleSummary {
  if (r.type === 'once') {
    return {
      isOnce: true,
      tagCls: 'sr-tag sr-tag--once',
      tagText: t.tagOnce,
      mainText: fmtDate(r.specificTs),
    };
  }

  const parts: string[] = [];
  const n = r.repStep ?? 1;
  const unitIdx = ['day', 'week', 'month', 'year'].indexOf(r.repUnit ?? 'day');
  const prefix = n === 1 ? t.periodicEverySingular : t.periodicEvery;
  let unitLabel: string;
  if (n === 1) {
    unitLabel = t.periodicUnitSingular[unitIdx];
  } else if (n >= 2 && n <= 4) {
    unitLabel = t.periodicUnitFew[unitIdx];
  } else {
    unitLabel = t.periodicUnitLabels[unitIdx];
  }
  parts.push(`${prefix} ${n} ${unitLabel}`);

  if (r.repUnit === 'week' && r.repDaysOfWeek) {
    parts.push(`(${r.repDaysOfWeek.map((d) => t.daysShort[d]).join(', ')})`);
  }

  if (r.intraDayMode === 'interval') {
    parts.push(t.ruleInterval(r.intraDayStepMin ?? 15, r.timeWindowStart || '00:00', r.timeWindowEnd || '23:59'));
  } else {
    parts.push(t.ruleAt(r.intraDayTime || '09:00'));
  }

  return {
    isOnce: false,
    tagCls: 'sr-tag sr-tag--repeat',
    tagText: t.tagRepeat,
    mainText: parts.join(' '),
    endBadgeText: r.endDate ? `${t.endsLabel} ${fmtDateShort(r.endDate)}` : undefined,
  };
}

const NO_TRIGGER_KEY = '__no_trigger__';

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

function isoWeek(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
}

export function getGroupKey(ts: number | null, groupBy: GroupBy): string {
  if (groupBy === 'none') return '';
  if (ts == null) return NO_TRIGGER_KEY;
  const d = new Date(ts);
  const y = d.getFullYear();
  const mo = d.getMonth();
  const da = d.getDate();
  const hh = d.getHours();
  const mm = d.getMinutes();
  switch (groupBy) {
    case 'minute':
      return `${y}-${pad2(mo + 1)}-${pad2(da)} ${pad2(hh)}:${pad2(mm)}`;
    case 'hour':
      return `${y}-${pad2(mo + 1)}-${pad2(da)} ${pad2(hh)}:00`;
    case 'day':
      return `${y}-${pad2(mo + 1)}-${pad2(da)}`;
    case 'week':
      return `${y}-W${pad2(isoWeek(d))}`;
    case 'month':
      return `${y}-${pad2(mo + 1)}`;
    case 'year':
      return `${y}`;
  }
}

export function formatGroupLabel(key: string, groupBy: GroupBy, t: Strings): string {
  if (groupBy === 'none') return '';
  if (key === NO_TRIGGER_KEY) return t.groupNoTrigger;

  const parts = key.split(/[-W :T]+/).map(Number);

  switch (groupBy) {
    case 'minute': {
      const [y, mo, da, hh, mm] = parts;
      return `${pad2(da)} ${t.monthsShort[mo - 1]} ${y}, ${pad2(hh)}:${pad2(mm)}`;
    }
    case 'hour': {
      const [y, mo, da, hh] = parts;
      return `${pad2(da)} ${t.monthsShort[mo - 1]} ${y}, ${pad2(hh)}:00`;
    }
    case 'day': {
      const [y, mo, da] = parts;
      return `${pad2(da)} ${t.monthsShort[mo - 1]} ${y}`;
    }
    case 'week': {
      const [y, w] = parts;
      return t.groupWeekLabel(w, y);
    }
    case 'month': {
      const [y, mo] = parts;
      return `${t.monthsShort[mo - 1]} ${y}`;
    }
    case 'year': {
      return key;
    }
  }
}

export interface ReminderGroup {
  label: string;
  items: Reminder[];
}

export function groupReminders(items: Reminder[], groupBy: GroupBy, t: Strings): ReminderGroup[] {
  if (groupBy === 'none' || items.length === 0) {
    return [{ label: '', items }];
  }

  const groups: ReminderGroup[] = [];
  let currentKey: string | null = null;
  let currentGroup: Reminder[] = [];

  for (const r of items) {
    const ts = r.checked ? r.completedAt : (r.nextTrigger ?? r.specificTs);
    const key = getGroupKey(ts, groupBy);
    if (key !== currentKey) {
      if (currentGroup.length > 0 && currentKey !== null) {
        groups.push({ label: formatGroupLabel(currentKey, groupBy, t), items: currentGroup });
      }
      currentKey = key;
      currentGroup = [r];
    } else {
      currentGroup.push(r);
    }
  }
  if (currentGroup.length > 0 && currentKey !== null) {
    groups.push({ label: formatGroupLabel(currentKey, groupBy, t), items: currentGroup });
  }

  return groups;
}

export function parseCodeBlockConfig(source: string): CodeBlockConfig {
  const config: CodeBlockConfig = {};
  if (!source || !source.trim()) {
    return config;
  }

  const lines = source.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      continue;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
      continue;
    }

    const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const val = trimmed.slice(colonIdx + 1).trim();

    if (key === 'tab') {
      const lowerVal = val.toLowerCase();
      if (lowerVal === 'all' || lowerVal === 'active' || lowerVal === 'done') {
        config.tab = lowerVal;
      }
    } else if (key === 'group' || key === 'groupby') {
      const lowerVal = val.toLowerCase();
      const validGroups: GroupBy[] = ['none', 'minute', 'hour', 'day', 'week', 'month', 'year'];
      if (validGroups.includes(lowerVal as GroupBy)) {
        config.groupBy = lowerVal as GroupBy;
      }
    } else if (key === 'header' || key === 'showheader') {
      const lowerVal = val.toLowerCase();
      if (lowerVal === 'false' || lowerVal === 'no' || lowerVal === '0' || lowerVal === 'off') {
        config.showHeader = false;
      } else if (lowerVal === 'true' || lowerVal === 'yes' || lowerVal === '1' || lowerVal === 'on') {
        config.showHeader = true;
      }
    } else if (key === 'tabs' || key === 'showtabs') {
      const lowerVal = val.toLowerCase();
      if (lowerVal === 'false' || lowerVal === 'no' || lowerVal === '0' || lowerVal === 'off') {
        config.showTabs = false;
      } else if (lowerVal === 'true' || lowerVal === 'yes' || lowerVal === '1' || lowerVal === 'on') {
        config.showTabs = true;
      }
    } else if (key === 'title') {
      config.title = val;
    }
  }

  return config;
}
