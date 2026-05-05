import {Reminder} from './types';

export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

export function fmtDate(ts: number | null | undefined): string {
    if (ts === null || ts === undefined) return '—';
    return new Date(ts).toLocaleString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Calculate the next trigger timestamp for a given reminder.
 * Returns null if the reminder has no future trigger.
 */
export function calcNextTrigger(reminder: Reminder, now: number): number | null {
    const intervalMs = reminder.interval * 60_000;

    if (reminder.type === 'interval') {
        return now + intervalMs;
    }

    if (reminder.type === 'specific') {
        // one-shot: only fire once, no future recalculation
        return reminder.specificTs ?? null;
    }

    if (reminder.type === 'scheduled') {
        const start = reminder.startTs;
        if (start === null) return null;
        if (start > now) return start;
        const elapsed = now - start;
        const periods = Math.floor(elapsed / intervalMs) + 1;
        return start + periods * intervalMs;
    }

    return null;
}

/**
 * After a reminder fires, advance its nextTrigger to the next future slot.
 * Returns null for one-shot reminders.
 */
export function advanceTrigger(reminder: Reminder, now: number): number | null {
    if (reminder.type === 'specific') return null;

    const intervalMs = reminder.interval * 60_000;
    let next = (reminder.nextTrigger ?? now) + intervalMs;
    // skip missed intervals so we never fire in a tight loop after a long pause
    while (next <= now) next += intervalMs;
    return next;
}

/** Clamp a number to [min, max]. */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
