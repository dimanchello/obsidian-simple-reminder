import { Reminder } from './types';

// ─── ID & formatting ──────────────────────────────────────────────────────────

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

export function fmtDate(ts: number | null | undefined): string {
  if (ts === null || ts === undefined) return '—';
  return new Date(ts).toLocaleString(undefined, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function fmtTime(hhmm: string | null | undefined): string {
  return hhmm ?? '—';
}

export function fmtDateShort(ts: number | null | undefined): string {
  if (ts === null || ts === undefined) return '—';
  return new Date(ts).toLocaleString(undefined, {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ─── Slot validation ──────────────────────────────────────────────────────────

/**
 * Returns true if the candidate timestamp satisfies all schedule constraints
 * (days-of-week filter and time-of-day window).
 */
function isValidSlot(ts: number, reminder: Reminder): boolean {
  const d = new Date(ts);

  // Days of week
  if (reminder.daysOfWeek && reminder.daysOfWeek.length > 0) {
    if (!reminder.daysOfWeek.includes(d.getDay())) return false;
  }

  // Time-of-day window
  if (reminder.timeWindowStart && reminder.timeWindowEnd) {
    const hh  = d.getHours().toString().padStart(2, '0');
    const mm  = d.getMinutes().toString().padStart(2, '0');
    const cur = `${hh}:${mm}`;

    const start = reminder.timeWindowStart;
    const end   = reminder.timeWindowEnd;

    if (start <= end) {
      // Normal window: 09:00 – 18:00
      if (cur < start || cur > end) return false;
    } else {
      // Overnight window: 22:00 – 06:00
      if (cur < start && cur > end) return false;
    }
  }

  return true;
}

// ─── Next trigger calculation ─────────────────────────────────────────────────

const MAX_SEARCH_ITERATIONS = 20_000;

/**
 * Calculate the very first trigger for a newly created reminder.
 * For interval/flexible: starts from `now + interval`.
 * For scheduled: starts from `startTs` (or `now + interval` if past).
 */
export function calcNextTrigger(reminder: Reminder, now: number): number | null {
  if (reminder.type === 'specific') return reminder.specificTs;

  const intervalMs = reminder.interval * 60_000;

  // Starting point
  let candidate: number;
  if (reminder.startTs && reminder.startTs > now) {
    candidate = reminder.startTs;
  } else {
    candidate = now + intervalMs;
  }

  return findNextValidSlot(candidate, reminder, intervalMs);
}

/**
 * After a reminder fires, advance nextTrigger to the next valid future slot.
 * Returns null when the reminder has no more future triggers.
 */
export function advanceTrigger(reminder: Reminder, now: number): number | null {
  if (reminder.type === 'specific') return null; // one-shot

  const intervalMs = reminder.interval * 60_000;
  const base       = reminder.nextTrigger ?? now;

  // Step forward by one interval from the fired slot
  let candidate = base + intervalMs;
  // Skip any further missed intervals
  while (candidate <= now) candidate += intervalMs;

  return findNextValidSlot(candidate, reminder, intervalMs);
}

/**
 * Starting from `candidate`, walk forward by `intervalMs` until a slot
 * satisfies all constraints. Respects startTs / endTs bounds.
 */
function findNextValidSlot(
  candidate: number,
  reminder: Reminder,
  intervalMs: number,
): number | null {
  // Respect startTs lower bound
  if (reminder.startTs && candidate < reminder.startTs) {
    candidate = reminder.startTs;
  }

  for (let i = 0; i < MAX_SEARCH_ITERATIONS; i++) {
    // Respect endTs upper bound
    if (reminder.endTs && candidate > reminder.endTs) return null;

    if (isValidSlot(candidate, reminder)) return candidate;

    candidate += intervalMs;
  }

  return null; // no valid slot found within search limit
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Migrate a legacy reminder to ensure all new flexible fields are present. */
export function migrateLegacyReminder(r: Reminder): Reminder {
  return {
    ...r,
    timeWindowStart: r.timeWindowStart ?? null,
    timeWindowEnd:   r.timeWindowEnd   ?? null,
    daysOfWeek:      r.daysOfWeek      ?? null,
    endTs:           r.endTs           ?? null,
    // Map old 'scheduled' → 'flexible' transparently
    type: r.type === 'scheduled' ? 'flexible' : r.type,
  };
}
