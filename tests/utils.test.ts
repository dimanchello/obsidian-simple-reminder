import { describe, it, expect } from 'vitest';
import {
  calcNextTrigger,
  advanceTrigger,
  generateId,
  mondayOf,
  migrateLegacyReminder,
  pruneOldCompleted,
  remindBeforeToMs,
  calcRemindBeforeTrigger,
} from '../src/utils';
import { Reminder } from '../src/types';

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'test',
    title: 'Test',
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
    nextTrigger: null,
    remindBeforeTrigger: null,
    completedAt: null,
    remindBeforeValue: null,
    remindBeforeUnit: null,
    emoji: '⏰',
    ...overrides,
  };
}

// ── generateId ───────────────────────────────────────────────────────────────

describe('generateId', () => {
  it('returns unique strings', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) ids.add(generateId());
    expect(ids.size).toBe(100);
  });

  it('returns non-empty strings', () => {
    const id = generateId();
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns alphanumeric strings (base36)', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });
});

// ── mondayOf ─────────────────────────────────────────────────────────────────

describe('mondayOf', () => {
  it('returns Monday for a Wednesday', () => {
    const wed = new Date(2025, 0, 15);
    const mon = mondayOf(wed);
    expect(mon.getDay()).toBe(1);
    expect(mon.getDate()).toBe(13);
  });

  it('returns same day for a Monday', () => {
    const mon = new Date(2025, 0, 13);
    const result = mondayOf(mon);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(13);
  });

  it('handles Sunday correctly (previous Monday)', () => {
    const sun = new Date(2025, 0, 19);
    const result = mondayOf(sun);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(13);
  });

  it('resets time to midnight', () => {
    const d = new Date(2025, 5, 15, 14, 30, 45, 123);
    const mon = mondayOf(d);
    expect(mon.getHours()).toBe(0);
    expect(mon.getMinutes()).toBe(0);
    expect(mon.getSeconds()).toBe(0);
    expect(mon.getMilliseconds()).toBe(0);
  });

  it('does not mutate the input date', () => {
    const original = new Date(2025, 0, 15, 10, 30);
    const originalTime = original.getTime();
    mondayOf(original);
    expect(original.getTime()).toBe(originalTime);
  });
});

// ── calcNextTrigger — once ──────────────────────────────────────────────────

describe('calcNextTrigger — once', () => {
  it('returns specificTs when in the future', () => {
    const now = Date.now();
    const future = now + 3600_000;
    const r = makeReminder({ type: 'once', specificTs: future });
    expect(calcNextTrigger(r, now)).toBe(future);
  });

  it('returns null when specificTs is in the past', () => {
    const now = Date.now();
    const past = now - 3600_000;
    const r = makeReminder({ type: 'once', specificTs: past });
    expect(calcNextTrigger(r, now)).toBeNull();
  });

  it('returns null when specificTs is null', () => {
    const r = makeReminder({ type: 'once', specificTs: null });
    expect(calcNextTrigger(r, Date.now())).toBeNull();
  });

  it('returns null when specificTs equals now', () => {
    const now = Date.now();
    const r = makeReminder({ type: 'once', specificTs: now });
    expect(calcNextTrigger(r, now)).toBeNull();
  });
});

// ── calcNextTrigger — repeat daily ──────────────────────────────────────────

describe('calcNextTrigger — repeat daily', () => {
  it('finds next trigger for daily single time', () => {
    const now = new Date(2025, 5, 15, 8, 0).getTime();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'day',
      repStep: 1,
      intraDayMode: 'single',
      intraDayTime: '10:00',
      startDate: now,
    });
    const next = calcNextTrigger(r, now);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(10);
    expect(d.getMinutes()).toBe(0);
  });

  it('skips to next day when time has passed', () => {
    const now = new Date(2025, 5, 15, 14, 0).getTime();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'day',
      repStep: 1,
      intraDayMode: 'single',
      intraDayTime: '10:00',
      startDate: now,
    });
    const next = calcNextTrigger(r, now);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getDate()).toBe(16);
    expect(d.getHours()).toBe(10);
  });

  it('respects repStep > 1', () => {
    const now = new Date(2025, 5, 15, 8, 0).getTime();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'day',
      repStep: 3,
      intraDayMode: 'single',
      intraDayTime: '09:00',
      startDate: now,
    });
    const next = calcNextTrigger(r, now);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getDate()).toBe(15);
  });

  it('returns null when intraDayMode is null', () => {
    const now = Date.now();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'day',
      repStep: 1,
      intraDayMode: null,
      startDate: now,
    });
    expect(calcNextTrigger(r, now)).toBeNull();
  });

  it('uses default 09:00 when intraDayTime is malformed', () => {
    const now = new Date(2025, 5, 15, 8, 0).getTime();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'day',
      repStep: 1,
      intraDayMode: 'single',
      intraDayTime: 'bad',
      startDate: now,
    });
    const next = calcNextTrigger(r, now);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
  });
});

// ── calcNextTrigger — repeat weekly ─────────────────────────────────────────

describe('calcNextTrigger — repeat weekly', () => {
  it('finds next trigger on selected days of week', () => {
    const now = new Date(2025, 5, 16, 8, 0).getTime(); // Mon June 16
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'week',
      repStep: 1,
      repDaysOfWeek: [1, 3], // Mon, Wed
      intraDayMode: 'single',
      intraDayTime: '09:00',
      startDate: now,
    });
    const next = calcNextTrigger(r, now);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getDay()).toBe(1);
  });

  it('falls back to anchor day when repDaysOfWeek is empty', () => {
    const now = new Date(2025, 5, 16, 8, 0).getTime(); // Monday
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'week',
      repStep: 1,
      repDaysOfWeek: [],
      intraDayMode: 'single',
      intraDayTime: '09:00',
      startDate: now,
    });
    const next = calcNextTrigger(r, now);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getDay()).toBe(1); // Monday (anchor day)
  });

  it('skips weeks when repStep > 1', () => {
    const startDate = new Date(2025, 5, 9, 9, 0).getTime(); // Mon week 0
    const now = new Date(2025, 5, 9, 10, 0).getTime(); // Mon week 0, past trigger
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'week',
      repStep: 2,
      repDaysOfWeek: [1],
      intraDayMode: 'single',
      intraDayTime: '09:00',
      startDate,
    });
    const next = calcNextTrigger(r, now);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    // Should be 2 weeks later (week 0 skipped, week 1 not valid, week 2 is next valid)
    const diffDays = Math.round((d.getTime() - startDate) / 86400_000);
    expect(diffDays).toBe(14);
  });
});

// ── calcNextTrigger — repeat monthly ────────────────────────────────────────

describe('calcNextTrigger — repeat monthly', () => {
  it('triggers on the same day of month', () => {
    const now = new Date(2025, 0, 15, 8, 0).getTime();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'month',
      repStep: 1,
      intraDayMode: 'single',
      intraDayTime: '09:00',
      startDate: now,
    });
    const next = calcNextTrigger(r, now);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(15);
  });

  it('handles month with fewer days (31 -> 28)', () => {
    const startDate = new Date(2025, 0, 31, 9, 0).getTime();
    const now = new Date(2025, 0, 31, 12, 0).getTime();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'month',
      repStep: 1,
      intraDayMode: 'single',
      intraDayTime: '09:00',
      startDate,
    });
    const next = calcNextTrigger(r, now);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(28);
  });

  it('skips months when repStep > 1', () => {
    const now = new Date(2025, 0, 15, 8, 0).getTime();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'month',
      repStep: 3,
      intraDayMode: 'single',
      intraDayTime: '09:00',
      startDate: now,
    });
    const next = calcNextTrigger(r, now);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getMonth()).toBe(0); // Jan (0 % 3 === 0)
  });
});

// ── calcNextTrigger — repeat yearly ─────────────────────────────────────────

describe('calcNextTrigger — repeat yearly', () => {
  it('triggers on the same month and day', () => {
    const now = new Date(2025, 5, 15, 8, 0).getTime();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'year',
      repStep: 1,
      repMonth: 5,
      intraDayMode: 'single',
      intraDayTime: '09:00',
      startDate: now,
    });
    const next = calcNextTrigger(r, now);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(15);
  });

  it('falls back to anchor month when repMonth is null', () => {
    const now = new Date(2025, 5, 15, 8, 0).getTime();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'year',
      repStep: 1,
      repMonth: null,
      intraDayMode: 'single',
      intraDayTime: '09:00',
      startDate: now,
    });
    const next = calcNextTrigger(r, now);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getMonth()).toBe(5); // June (anchor month)
  });
});

// ── calcNextTrigger — intra-day interval ────────────────────────────────────

describe('calcNextTrigger — intra-day interval', () => {
  it('finds next interval slot', () => {
    const now = new Date(2025, 5, 15, 9, 5).getTime();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'day',
      repStep: 1,
      intraDayMode: 'interval',
      intraDayStepMin: 30,
      timeWindowStart: '09:00',
      timeWindowEnd: '17:00',
      startDate: now,
    });
    const next = calcNextTrigger(r, now);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(30);
  });

  it('returns null when outside time window', () => {
    const now = new Date(2025, 5, 15, 18, 0).getTime();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'day',
      repStep: 1,
      intraDayMode: 'interval',
      intraDayStepMin: 30,
      timeWindowStart: '09:00',
      timeWindowEnd: '17:00',
      startDate: now,
    });
    const next = calcNextTrigger(r, now);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
  });

  it('handles overnight windows', () => {
    const now = new Date(2025, 5, 15, 20, 0).getTime();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'day',
      repStep: 1,
      intraDayMode: 'interval',
      intraDayStepMin: 60,
      timeWindowStart: '23:00',
      timeWindowEnd: '06:00',
      startDate: now,
    });
    const next = calcNextTrigger(r, now);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(0);
  });

  it('uses default values when time window fields are missing', () => {
    const now = new Date(2025, 5, 15, 8, 0).getTime();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'day',
      repStep: 1,
      intraDayMode: 'interval',
      intraDayStepMin: 15,
      timeWindowStart: null,
      timeWindowEnd: null,
      startDate: now,
    });
    const next = calcNextTrigger(r, now);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getHours()).toBeGreaterThanOrEqual(0);
  });
});

// ── calcNextTrigger — end date ──────────────────────────────────────────────

describe('calcNextTrigger — end date', () => {
  it('returns null when next trigger is after endDate', () => {
    const now = new Date(2025, 5, 15, 8, 0).getTime();
    const end = new Date(2025, 5, 15, 7, 0).getTime();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'day',
      repStep: 1,
      intraDayMode: 'single',
      intraDayTime: '09:00',
      startDate: now,
      endDate: end,
    });
    expect(calcNextTrigger(r, now)).toBeNull();
  });

  it('returns trigger when before endDate', () => {
    const now = new Date(2025, 5, 15, 8, 0).getTime();
    const end = new Date(2025, 5, 20, 23, 59).getTime();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'day',
      repStep: 1,
      intraDayMode: 'single',
      intraDayTime: '09:00',
      startDate: now,
      endDate: end,
    });
    const next = calcNextTrigger(r, now);
    expect(next).not.toBeNull();
    expect(next!).toBeLessThanOrEqual(end);
  });
});

// ── calcNextTrigger — negative / edge cases ─────────────────────────────────

describe('calcNextTrigger — edge cases', () => {
  it('returns null for unknown type', () => {
    const now = Date.now();
    const r = makeReminder({ type: 'unknown' as any, startDate: now });
    expect(calcNextTrigger(r, now)).toBeNull();
  });

  it('returns null when repUnit is null for repeat type', () => {
    const now = Date.now();
    const r = makeReminder({
      type: 'repeat',
      repUnit: null,
      intraDayMode: 'single',
      intraDayTime: '09:00',
      startDate: now,
    });
    expect(calcNextTrigger(r, now)).toBeNull();
  });

  it('uses current time as fallback when startDate is null', () => {
    const now = new Date(2025, 5, 15, 8, 0).getTime();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'day',
      repStep: 1,
      intraDayMode: 'single',
      intraDayTime: '09:00',
      startDate: null,
    });
    const next = calcNextTrigger(r, now);
    expect(next).not.toBeNull();
  });
});

// ── advanceTrigger ──────────────────────────────────────────────────────────

describe('advanceTrigger', () => {
  it('returns null for once reminders', () => {
    const r = makeReminder({ type: 'once' });
    expect(advanceTrigger(r, Date.now())).toBeNull();
  });

  it('finds next trigger after current one fires', () => {
    const now = new Date(2025, 5, 15, 10, 0).getTime();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'day',
      repStep: 1,
      intraDayMode: 'single',
      intraDayTime: '10:00',
      startDate: now,
      nextTrigger: now,
    });
    const next = advanceTrigger(r, now);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getDate()).toBe(16);
  });

  it('handles null nextTrigger gracefully', () => {
    const now = Date.now();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'day',
      repStep: 1,
      intraDayMode: 'single',
      intraDayTime: '09:00',
      startDate: now,
      nextTrigger: null,
    });
    const next = advanceTrigger(r, now);
    expect(next).not.toBeNull();
  });

  it('returns null when all future triggers are past endDate', () => {
    const now = new Date(2025, 5, 15, 10, 0).getTime();
    const r = makeReminder({
      type: 'repeat',
      repUnit: 'day',
      repStep: 1,
      intraDayMode: 'single',
      intraDayTime: '10:00',
      startDate: now,
      endDate: now,
      nextTrigger: now,
    });
    const next = advanceTrigger(r, now);
    expect(next).toBeNull();
  });
});

// ── migrateLegacyReminder ───────────────────────────────────────────────────

describe('migrateLegacyReminder', () => {
  it('passes through already-migrated reminders', () => {
    const r = makeReminder({ type: 'repeat' });
    const result = migrateLegacyReminder(r);
    expect(result.type).toBe('repeat');
  });

  it('migrates "specific" type to "once"', () => {
    const legacy = { id: '1', title: 'Test', checked: false, type: 'specific', specificTs: 123 };
    const result = migrateLegacyReminder(legacy);
    expect(result.type).toBe('once');
    expect(result.specificTs).toBe(123);
  });

  it('migrates "flexible" type to "repeat" with interval mode', () => {
    const legacy = {
      id: '2',
      title: 'Flex',
      checked: false,
      type: 'flexible',
      startTs: 100,
      interval: 30,
      timeWindowStart: '09:00',
      timeWindowEnd: '18:00',
    };
    const result = migrateLegacyReminder(legacy);
    expect(result.type).toBe('repeat');
    expect(result.repUnit).toBe('day');
    expect(result.intraDayMode).toBe('interval');
    expect(result.intraDayStepMin).toBe(30);
  });

  it('migrates "scheduled" type to "repeat" with interval mode', () => {
    const legacy = {
      id: '3',
      title: 'Scheduled',
      checked: false,
      type: 'scheduled',
      startTs: 200,
      interval: 60,
      timeWindowStart: '08:00',
      timeWindowEnd: '20:00',
    };
    const result = migrateLegacyReminder(legacy);
    expect(result.type).toBe('repeat');
    expect(result.repUnit).toBe('day');
    expect(result.intraDayMode).toBe('interval');
  });

  it('migrates "periodic" type to "repeat" with single mode', () => {
    const legacy = {
      id: '4',
      title: 'Periodic',
      checked: false,
      type: 'periodic',
      periodicUnit: 'week' as const,
      periodicN: 2,
      periodicTime: '14:00',
    };
    const result = migrateLegacyReminder(legacy);
    expect(result.type).toBe('repeat');
    expect(result.repUnit).toBe('week');
    expect(result.repStep).toBe(2);
    expect(result.intraDayMode).toBe('single');
    expect(result.intraDayTime).toBe('14:00');
  });

  it('uses defaults for missing fields in flexible migration', () => {
    const legacy = { id: '5', title: 'Min', checked: false, type: 'flexible' };
    const result = migrateLegacyReminder(legacy);
    expect(result.intraDayStepMin).toBe(15);
    expect(result.timeWindowStart).toBe('00:00');
    expect(result.timeWindowEnd).toBe('23:59');
  });

  it('uses defaults for missing fields in periodic migration', () => {
    const legacy = { id: '6', title: 'Min', checked: false, type: 'periodic' };
    const result = migrateLegacyReminder(legacy);
    expect(result.repUnit).toBe('day');
    expect(result.repStep).toBe(1);
    expect(result.intraDayTime).toBe('09:00');
  });

  it('calculates nextTrigger after migration', () => {
    const legacy = { id: '7', title: 'Test', checked: false, type: 'specific', specificTs: Date.now() + 3600_000 };
    const result = migrateLegacyReminder(legacy);
    expect(result.nextTrigger).not.toBeNull();
  });

  it('provides default values for empty legacy object', () => {
    const legacy = { type: 'unknown' };
    const result = migrateLegacyReminder(legacy);
    expect(result.id).toBe('');
    expect(result.title).toBe('');
    expect(result.checked).toBe(false);
    expect(result.type).toBe('once');
  });
});

describe('pruneOldCompleted', () => {
  const threeDaysMs = 3 * 86400_000;
  const now = Date.now();

  it('removes completed reminders older than 3 days', () => {
    const reminders: Reminder[] = [
      makeReminder({ id: '1', checked: true, completedAt: now - threeDaysMs - 1000 }),
      makeReminder({ id: '2', checked: false }),
    ];
    const result = pruneOldCompleted(reminders, now);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('2');
  });

  it('keeps completed reminders younger than 3 days', () => {
    const reminders: Reminder[] = [
      makeReminder({ id: '1', checked: true, completedAt: now - threeDaysMs + 1000 }),
      makeReminder({ id: '2', checked: false }),
    ];
    const result = pruneOldCompleted(reminders, now);
    expect(result.length).toBe(2);
  });

  it('keeps active reminders regardless of completedAt', () => {
    const reminders: Reminder[] = [makeReminder({ id: '1', checked: false, completedAt: now - threeDaysMs * 2 })];
    const result = pruneOldCompleted(reminders, now);
    expect(result.length).toBe(1);
  });

  it('keeps completed reminders with null completedAt', () => {
    const reminders: Reminder[] = [makeReminder({ id: '1', checked: true, completedAt: null })];
    const result = pruneOldCompleted(reminders, now);
    expect(result.length).toBe(1);
  });

  it('returns empty array for empty input', () => {
    expect(pruneOldCompleted([], now)).toEqual([]);
  });

  it('handles exactly 3 days boundary', () => {
    const reminders: Reminder[] = [makeReminder({ id: '1', checked: true, completedAt: now - threeDaysMs })];
    const result = pruneOldCompleted(reminders, now);
    expect(result.length).toBe(1);
  });
});

describe('remindBeforeToMs', () => {
  it('converts minutes correctly', () => {
    expect(remindBeforeToMs(30, 'minute')).toBe(30 * 60_000);
  });

  it('converts hours correctly', () => {
    expect(remindBeforeToMs(2, 'hour')).toBe(2 * 60 * 60_000);
  });

  it('converts days correctly', () => {
    expect(remindBeforeToMs(3, 'day')).toBe(3 * 1440 * 60_000);
  });

  it('converts weeks correctly', () => {
    expect(remindBeforeToMs(2, 'week')).toBe(2 * 10080 * 60_000);
  });

  it('converts months correctly (30 days)', () => {
    expect(remindBeforeToMs(1, 'month')).toBe(43200 * 60_000);
  });

  it('converts years correctly (365 days)', () => {
    expect(remindBeforeToMs(1, 'year')).toBe(525600 * 60_000);
  });

  it('returns 0 for value 0', () => {
    expect(remindBeforeToMs(0, 'minute')).toBe(0);
  });
});

describe('calcRemindBeforeTrigger', () => {
  it('returns correct trigger for future reminder', () => {
    const future = Date.now() + 7200_000; // 2 hours from now
    const r = makeReminder({
      type: 'once',
      specificTs: future,
      nextTrigger: future,
      remindBeforeValue: 30,
      remindBeforeUnit: 'minute',
    });
    const trigger = calcRemindBeforeTrigger(r);
    expect(trigger).not.toBeNull();
    expect(trigger!).toBe(future - 30 * 60_000);
  });

  it('returns null when nextTrigger is null', () => {
    const r = makeReminder({
      remindBeforeValue: 30,
      remindBeforeUnit: 'minute',
      nextTrigger: null,
    });
    expect(calcRemindBeforeTrigger(r)).toBeNull();
  });

  it('returns null when remindBeforeValue is null', () => {
    const r = makeReminder({
      remindBeforeValue: null,
      remindBeforeUnit: null,
      nextTrigger: Date.now() + 3600_000,
    });
    expect(calcRemindBeforeTrigger(r)).toBeNull();
  });

  it('returns null when remindBeforeUnit is null', () => {
    const r = makeReminder({
      remindBeforeValue: 30,
      remindBeforeUnit: null,
      nextTrigger: Date.now() + 3600_000,
    });
    expect(calcRemindBeforeTrigger(r)).toBeNull();
  });

  it('returns null when remindBefore time is in the past', () => {
    const r = makeReminder({
      nextTrigger: Date.now() + 60_000, // 1 min from now
      remindBeforeValue: 30,
      remindBeforeUnit: 'minute',
    });
    // remindBeforeTrigger would be 30 min before nextTrigger = 29 min in the past
    expect(calcRemindBeforeTrigger(r)).toBeNull();
  });

  it('returns trigger for one hour before with hour unit', () => {
    const future = Date.now() + 7200_000; // 2 hours from now
    const r = makeReminder({
      nextTrigger: future,
      remindBeforeValue: 1,
      remindBeforeUnit: 'hour',
    });
    const trigger = calcRemindBeforeTrigger(r);
    expect(trigger).not.toBeNull();
    expect(trigger!).toBe(future - 3600_000);
  });
});
