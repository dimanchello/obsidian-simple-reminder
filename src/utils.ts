import { Reminder, LegacyReminder } from './types';

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

function isValidDay(cand: Date, anchor: Date, r: Reminder): boolean {
  const dayMs = 86400_000;
  const diffDays = Math.round((cand.getTime() - anchor.getTime()) / dayMs);
  if (diffDays < 0) return false;

  const step = r.repStep || 1;

  if (r.repUnit === 'day') {
    return diffDays % step === 0;
  }
  if (r.repUnit === 'week') {
    const anchorMon = mondayOf(anchor);
    const candMon = mondayOf(cand);
    const diffWeeks = Math.round((candMon.getTime() - anchorMon.getTime()) / (7 * dayMs));
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
  const y = candDay.getFullYear(),
    m = candDay.getMonth(),
    d = candDay.getDate();

  if (r.intraDayMode === 'single') {
    const [hh, mm] = parseTime(r.intraDayTime || '09:00');
    const ts = new Date(y, m, d, hh, mm).getTime();
    if (ts > now && ts >= startTs) return ts;
    return null;
  }

  if (r.intraDayMode === 'interval') {
    const [sH, sM] = parseTime(r.timeWindowStart || '00:00');
    const [eH, eM] = parseTime(r.timeWindowEnd || '23:59');

    let winStart = new Date(y, m, d, sH, sM).getTime();
    let winEnd = new Date(y, m, d, eH, eM).getTime();
    if (winEnd < winStart) winEnd += 86400_000; // Обработка ночных окон (например с 23:00 до 06:00)

    const stepMs = (r.intraDayStepMin || 15) * 60_000;
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
  if (r.type === 'once') return r.specificTs && r.specificTs > now ? r.specificTs : null;
  if (r.type !== 'repeat') return null;

  const anchor = new Date(r.startDate ?? Date.now());
  anchor.setHours(0, 0, 0, 0);

  const cand = new Date(Math.max(now, r.startDate ?? 0));
  cand.setHours(0, 0, 0, 0);

  for (let i = 0; i < 2000; i++) {
    if (isValidDay(cand, anchor, r)) {
      const nextTime = findNextTimeOnDay(cand, r, now, r.startDate ?? 0);
      if (nextTime !== null) {
        if (r.endDate && nextTime > r.endDate) return null;
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
  // Прибавляем 1 минуту, чтобы скрипт шагнул дальше текущего сработавшего времени
  return calcNextTrigger(r, nextNow + 60_000);
}

export function migrateLegacyReminder(r: LegacyReminder): Reminder {
  if (r.type === 'once' || r.type === 'repeat') return r as Reminder; // Уже мигрировано

  const migrated: Reminder = {
    id: r.id ?? '',
    title: r.title ?? '',
    checked: r.checked ?? false,
    type: 'once',
    specificTs: r.specificTs ?? null,
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
    nextTrigger: null,
    completedAt: null,
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

export function pruneOldCompleted(reminders: Reminder[], now: number = Date.now()): Reminder[] {
  const threeDaysMs = 3 * 86400_000;
  return reminders.filter((r) => {
    if (r.checked && r.completedAt != null && now - r.completedAt > threeDaysMs) {
      return false;
    }
    return true;
  });
}
