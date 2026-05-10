import { CalendarUnit, Reminder } from './types';

// ─── ID & formatting ──────────────────────────────────────────────────────────

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

export function fmtDate(ts: number | null | undefined): string {
  if (ts == null) return '—';
  return new Date(ts).toLocaleString(undefined, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function fmtDateShort(ts: number | null | undefined): string {
  if (ts == null) return '—';
  return new Date(ts).toLocaleString(undefined, {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ─── Week helpers ─────────────────────────────────────────────────────────────

/** ISO 8601 week number (1-53). Monday is first day of week. */
export function isoWeekNumber(d: Date): number {
  const tmp = new Date(d);
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - (tmp.getDay() + 6) % 7);
  const w1  = new Date(tmp.getFullYear(), 0, 4);
  return 1 + Math.round(((tmp.getTime() - w1.getTime()) / 86_400_000 - 3 + (w1.getDay() + 6) % 7) / 7);
}

/** Returns a new Date set to Monday 00:00:00 of the week containing `d`. */
export function mondayOf(d: Date): Date {
  const r    = new Date(d);
  const diff = (r.getDay() === 0) ? -6 : 1 - r.getDay();
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

// ─── Time parsing ─────────────────────────────────────────────────────────────

function parseTime(hhmm: string): [number, number] {
  const p = hhmm.split(':').map(Number);
  return [isNaN(p[0]) ? 9 : p[0], isNaN(p[1]) ? 0 : p[1]];
}

// ─── Calendar trigger ─────────────────────────────────────────────────────────

function matchesCalendar(d: Date, unit: CalendarUnit, r: Reminder): boolean {
  switch (unit) {
    case 'day':   return true;
    case 'week': {
      const days = r.calendarDayOfWeek;
      if (!days || days.length === 0) return false;
      return days.includes(d.getDay());
    }
    case 'month': return d.getDate()  === r.calendarDayOfMonth;
    case 'year':  return d.getMonth() === r.calendarMonth &&
                         d.getDate()  === r.calendarDayOfMonth;
  }
}

export function calcNextCalendarTrigger(r: Reminder, from: number): number | null {
  const unit = r.calendarUnit;
  if (!unit || !r.calendarTime) return null;
  const [hh, mm] = parseTime(r.calendarTime);
  const d = new Date(from);
  d.setHours(hh, mm, 0, 0);
  if (d.getTime() <= from) d.setDate(d.getDate() + 1);
  for (let i = 0; i < 1827; i++) {
    if (matchesCalendar(d, unit, r)) return d.getTime();
    d.setDate(d.getDate() + 1);
  }
  return null;
}

// ─── Periodic trigger ─────────────────────────────────────────────────────────

/**
 * Every N calendar units starting from an anchor date.
 *
 * - day:   anchor date at periodicTime, step = N days (exact ms)
 * - week:  Monday of anchor's week at periodicTime, step = N*7 days
 * - month: same day-of-month as anchor, step = N months (calendar-aware)
 * - year:  same month+day as anchor, step = N years (calendar-aware)
 */
function calcNextPeriodicDay(from: number, anchor: Date, periodicN: number): number {
  const msStep = periodicN * 86_400_000;
  let nextTs = anchor.getTime();
  if (nextTs <= from) {
    const periods = Math.floor((from - nextTs) / msStep) + 1;
    nextTs += periods * msStep;
  }
  return nextTs;
}

function calcNextPeriodicWeek(r: Reminder, from: number, anchor: Date, periodicN: number, hh: number, mm: number): number | null {
  const days = r.periodicDayOfWeek && r.periodicDayOfWeek.length > 0 ? r.periodicDayOfWeek : [anchor.getDay()];
  const mAnchor = mondayOf(anchor);
  mAnchor.setHours(hh, mm, 0, 0);

  let currentWeekMon = new Date(mAnchor);
  // Проматываем вперед до текущей недели (кратной периодичности)
  if (from > currentWeekMon.getTime()) {
    const weeksDiff = Math.floor((from - currentWeekMon.getTime()) / (7 * 86_400_000));
    const periodsToSkip = Math.floor(weeksDiff / periodicN);
    currentWeekMon.setDate(currentWeekMon.getDate() + periodsToSkip * periodicN * 7);
  }

  // Ищем подходящий день (лимит 1000 циклов)
  for (let p = 0; p < 1000; p++) {
    let validTimes: number[] = [];
    for (const d of days) {
      const cand = new Date(currentWeekMon);
      const diff = d === 0 ? 6 : d - 1; // Сдвиг от понедельника
      cand.setDate(cand.getDate() + diff);
      if (cand.getTime() >= anchor.getTime() && cand.getTime() > from) {
        validTimes.push(cand.getTime());
      }
    }
    if (validTimes.length > 0) {
      validTimes.sort((a, b) => a - b);
      return validTimes[0]; // Самый ближний день на этой неделе
    }
    currentWeekMon.setDate(currentWeekMon.getDate() + periodicN * 7);
  }
  return null;
}

function calcNextPeriodicMonth(r: Reminder, from: number, anchor: Date, periodicN: number, hh: number, mm: number): number | null {
  const targetDay = r.periodicDayOfMonth || anchor.getDate();
  let cand = new Date(anchor);
  cand.setDate(1);

  // Проматываем месяцы
  let mDiff = (new Date(from).getFullYear() - cand.getFullYear()) * 12 + (new Date(from).getMonth() - cand.getMonth());
  if (mDiff > 0) {
    const periods = Math.floor(mDiff / periodicN);
    cand.setMonth(cand.getMonth() + periods * periodicN);
  }

  for (let p = 0; p < 1000; p++) {
    const test = new Date(cand);
    test.setDate(targetDay);
    test.setHours(hh, mm, 0, 0);
    // test.getMonth() === cand.getMonth() защищает от переполнения (напр. 31 февраля -> март)
    if (test.getMonth() === cand.getMonth() && test.getTime() >= anchor.getTime() && test.getTime() > from) {
      return test.getTime();
    }
    cand.setMonth(cand.getMonth() + periodicN);
  }
  return null;
}

function calcNextPeriodicYear(r: Reminder, from: number, anchor: Date, periodicN: number): number | null {
  const targetMonth = r.periodicMonth != null ? r.periodicMonth : anchor.getMonth();
  const targetDay = r.periodicDayOfMonth || anchor.getDate();
  let cand = new Date(anchor);
  cand.setMonth(targetMonth, targetDay);

  const yDiff = new Date(from).getFullYear() - cand.getFullYear();
  if (yDiff > 0) {
    const periods = Math.floor(yDiff / periodicN);
    cand.setFullYear(cand.getFullYear() + periods * periodicN);
  }

  for (let p = 0; p < 1000; p++) {
    if (cand.getMonth() === targetMonth && cand.getTime() >= anchor.getTime() && cand.getTime() > from) {
      return cand.getTime();
    }
    cand.setFullYear(cand.getFullYear() + periodicN);
    cand.setMonth(targetMonth, targetDay);
  }
  return null;
}

export function calcNextPeriodicTrigger(r: Reminder, from: number): number | null {
  const { periodicUnit, periodicN, periodicTime, periodicStart } = r;
  if (!periodicUnit || !periodicN || periodicN < 1 || !periodicTime || periodicStart == null) return null;

  const [hh, mm] = parseTime(periodicTime);
  const anchor = new Date(periodicStart);
  anchor.setHours(hh, mm, 0, 0);

  switch (periodicUnit) {
    case 'day':
      return calcNextPeriodicDay(from, anchor, periodicN);
    case 'week':
      return calcNextPeriodicWeek(r, from, anchor, periodicN, hh, mm);
    case 'month':
      return calcNextPeriodicMonth(r, from, anchor, periodicN, hh, mm);
    case 'year':
      return calcNextPeriodicYear(r, from, anchor, periodicN);
    default:
      return null;
  }
}

// ─── Flexible slot validation ─────────────────────────────────────────────────

function isValidFlexSlot(ts: number, r: Reminder): boolean {
  const d = new Date(ts);
  if (r.daysOfWeek && r.daysOfWeek.length > 0 && !r.daysOfWeek.includes(d.getDay()))
    return false;
  if (r.timeWindowStart && r.timeWindowEnd) {
    const cur = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    const s = r.timeWindowStart, e = r.timeWindowEnd;
    if (s <= e) { if (cur < s || cur > e) return false; }
    else        { if (cur < s && cur > e) return false; }
  }
  return true;
}

function findNextFlexSlot(candidate: number, r: Reminder, intervalMs: number): number | null {
  if (r.startTs && candidate < r.startTs) candidate = r.startTs;
  for (let i = 0; i < 20_000; i++) {
    if (r.endTs && candidate > r.endTs) return null;
    if (isValidFlexSlot(candidate, r))  return candidate;
    candidate += intervalMs;
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function calcNextTrigger(r: Reminder, now: number): number | null {
  if (r.type === 'specific')  return r.specificTs;
  if (r.type === 'calendar')  return calcNextCalendarTrigger(r, now);
  if (r.type === 'periodic')  return calcNextPeriodicTrigger(r, now);
  const intervalMs = r.interval * 60_000;
  const candidate  = (r.startTs && r.startTs > now) ? r.startTs : now + intervalMs;
  return findNextFlexSlot(candidate, r, intervalMs);
}

export function advanceTrigger(r: Reminder, now: number): number | null {
  if (r.type === 'specific') return null;
  if (r.type === 'calendar') return calcNextCalendarTrigger(r, now);
  if (r.type === 'periodic') return calcNextPeriodicTrigger(r, now);
  const intervalMs = r.interval * 60_000;
  let next = (r.nextTrigger ?? now) + intervalMs;
  while (next <= now) next += intervalMs;
  return findNextFlexSlot(next, r, intervalMs);
}

export function migrateLegacyReminder(r: Reminder): Reminder {
  // calendarDayOfWeek: migrate old single number → array
  let calDow: number[] | null = null;
  if (Array.isArray(r.calendarDayOfWeek)) {
    calDow = r.calendarDayOfWeek;
  } else if (r.calendarDayOfWeek != null) {
    calDow = [r.calendarDayOfWeek as unknown as number];
  }
  return {
    ...r,
    timeWindowStart:    r.timeWindowStart    ?? null,
    timeWindowEnd:      r.timeWindowEnd      ?? null,
    daysOfWeek:         r.daysOfWeek         ?? null,
    endTs:              r.endTs              ?? null,
    calendarUnit:       r.calendarUnit       ?? null,
    calendarTime:       r.calendarTime       ?? null,
    calendarDayOfWeek:  calDow,
    calendarDayOfMonth: r.calendarDayOfMonth ?? null,
    calendarMonth:      r.calendarMonth      ?? null,
    periodicUnit:       r.periodicUnit       ?? null,
    periodicN:          r.periodicN          ?? null,
    periodicTime:       r.periodicTime       ?? null,
    periodicStart:      r.periodicStart      ?? null,
    periodicDayOfWeek:  (r as any).periodicDayOfWeek ?? null,
    periodicDayOfMonth: (r as any).periodicDayOfMonth ?? null,
    periodicMonth:      (r as any).periodicMonth ?? null,
    type: r.type === 'scheduled' ? 'flexible' : r.type,
  };
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}
