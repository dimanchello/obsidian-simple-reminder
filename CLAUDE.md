# CLAUDE.md — Obsidian Simple Reminder

## Project overview

Obsidian plugin that manages a reminder list with system notifications. Supports one-shot, daily/weekly/monthly/yearly recurring reminders with intra-day single-time or interval modes.

Completed one-shot reminders are auto-deleted after 3 days unless re-opened. Each reminder can have a custom emoji icon and an optional "remind before" pre-alert. Reminders can be grouped by time period (minute/hour/day/week/month/year) in the sidebar.

## Tech stack

- **TypeScript** (strict mode, ES2018 target, ESM)
- **esbuild** for bundling
- **vitest** for unit tests
- **ESLint + Prettier** for code quality and static analysis
- **Obsidian Plugin API** (external, not bundled)

## Key commands

```bash
npm run dev          # watch mode with inline sourcemaps
npm run build        # typecheck + production build (minified)
npm test             # run unit tests once
npm run test:watch   # run tests in watch mode
npm run lint         # check code quality
npm run lint:fix     # auto-fix lint issues
npm run format       # format code with Prettier
```

**After each feature:** run `npm run lint && npm test && npm run build` to verify code quality, tests, and build.

## Architecture

```
src/
  main.ts              — Plugin entry: lifecycle, check loop, notifications, view management, pruning
  types.ts             — Reminder, PluginSettings, GroupBy, LegacyReminder interfaces + defaults
  utils.ts             — Pure functions: generateId, fmtDate, calcNextTrigger, advanceTrigger, migrateLegacyReminder, pruneOldCompleted, remindBeforeToMs, calcRemindBeforeTrigger, getGroupKey, formatGroupLabel, groupReminders
  api.ts               — Public API for other plugins (add/remove/get reminders, event system)
  i18n.ts              — EN/RU string dictionaries, language resolution
  ReminderView.ts      — Obsidian ItemView (sidebar panel) with tab/group rendering
  AddReminderModal.ts  — Modal for creating/editing reminders
  CalendarModal.ts     — Calendar view modal
  ReminderViewModal.ts — Read-only reminder detail modal
  SettingsTab.ts       — Obsidian PluginSettingTab
  emojis.ts            — Emoji picker data
tests/
  utils.test.ts        — Tests for calcNextTrigger, advanceTrigger, migration, helpers, remindBefore, grouping
  i18n.test.ts         — Tests for i18n strings, EN/RU consistency
dist/                  — Build output (main.js, manifest.json, styles.css) — gitignored
```

## Conventions

- **No comments** unless explicitly requested
- **No emojis** in code (only in UI strings in i18n.ts and user-chosen emoji)
- Follow existing naming: `camelCase` for variables/functions, `PascalCase` for types/classes
- All UI strings go through `i18n.ts` — never hardcode text in components
- Pure logic lives in `utils.ts` — keep it framework-agnostic
- DOM manipulation stays in views/modals — use Obsidian's `createEl`/`createDiv` API
- **Mobile compatibility** — all changes must work correctly on mobile devices (iOS/Android): touch events, no hover-only interactions, responsive layout

## Important implementation details

### Reminder types
- `once` — fires at `specificTs`, then marks as `checked = true` with `completedAt` timestamp
- `repeat` — uses `repUnit`/`repStep` for inter-day scheduling + `intraDayMode` for time-of-day

### Intra-day modes
- `single` — fires at a specific HH:MM each valid day
- `interval` — fires every N minutes within a time window (`timeWindowStart` to `timeWindowEnd`)

### Emoji
- Each reminder has an `emoji` field (string, default `'⏰'`)
- Shown in the sidebar list and used in OS notifications
- User can type/paste any emoji in the modal form

### Remind before ("Напомнить за")
- Optional pre-alert that fires X minutes/hours/days/weeks/months/years before the main trigger
- Stored as `remindBefore` array of `RemindBeforeEntry` objects (`value`, `unit`, `trigger`)
- When `trigger` fires: sends notification, sets `trigger = null`
- When main trigger fires and advances (repeat): recalculates all `remindBefore` triggers
- Business logic in utils.ts: `remindBeforeToMs(value, unit)`, `calcRemindBeforeTriggers(nextTrigger, entries)`

### Grouping
- Setting `groupBy: GroupBy` controls sidebar grouping (`'none'` | `'minute'` | `'hour'` | `'day'` | `'week'` | `'month'` | `'year'`)
- `getGroupKey(ts, groupBy)` — sortable string key from timestamp
- `formatGroupLabel(key, groupBy, t)` — human-readable localized label
- `groupReminders(items, groupBy, t)` — splits sorted array into `ReminderGroup[]`
- Dividers rendered as `.sr-group-divider` elements in sidebar

### Check loop
- Runs at `checkIntervalSec` (default 30s, min 2s)
- Two-pass per reminder:
  1. Check `remindBefore` entries — if due, fire pre-alert and clear trigger
  2. Check `nextTrigger` — if due, fire main notification
- On fire (once): notification → `checked = true` → `completedAt = now` → clear triggers → save → refresh view
- On fire (repeat): notification → `advanceTrigger` → recalculate `remindBefore` triggers → save → refresh view

### Completed reminder pruning
- `pruneOldCompleted()` removes reminders where `checked === true` and `completedAt` is older than 3 days
- Called on plugin load and at the start of each check cycle
- Re-opening a reminder via edit modal resets `checked`, `completedAt`, and restores `nextTrigger`

### API events
- `reminder-fired` — when a reminder triggers
- `reminder-added` / `reminder-removed` / `reminder-updated` — CRUD operations
- Access via `app.plugins.plugins['simple-reminder'].api`

### Migration
- `migrateLegacyReminder` converts old reminder formats (`specific`, `flexible`, `scheduled`, `periodic`) to the current `once`/`repeat` schema
- `migrateRemindBefore` converts old single-entry `remindBeforeValue`/`remindBeforeUnit` fields to `remindBefore[]` array
- Already-migrated reminders pass through unchanged

## Testing

Tests cover the critical scheduling logic in `utils.ts` and i18n dictionaries. **All business logic (pure functions in utils.ts) must be covered by unit tests.**

**`tests/utils.test.ts`** (107 tests):
- `generateId` — uniqueness, format
- `mondayOf` — all edge cases (Mon-Sun, time reset, immutability)
- `calcNextTrigger` — once (future/past/null/equal), daily/weekly/monthly/yearly with step > 1, interval mode, overnight windows, end dates, malformed inputs, null fields
- `advanceTrigger` — once null, progression, null nextTrigger, past endDate
- `migrateLegacyReminder` — all legacy types (specific/flexible/scheduled/periodic), defaults, empty objects
- `pruneOldCompleted` — removes old completed, keeps recent, handles edge cases
- `remindBeforeToMs` — all 6 units (minute, hour, day, week, month, year), zero value
- `calcRemindBeforeTriggers` — future trigger, null fields, past trigger, different units
- `formatScheduleSummary` — once/repeat summary formatting, end badge
- `getGroupKey` — all groupBy modes, null ts, boundary cases
- `formatGroupLabel` — all modes, EN/RU localization, no-trigger key
- `groupReminders` — none mode, empty list, multi-group, null-trigger, completedAt, ordering

**`tests/i18n.test.ts`** (41 tests):
- `resolveLanguage` — explicit en/ru, auto fallback
- English strings — all UI text, plural/singular forms, rule formatters, groupBy strings
- Russian strings — all UI text, plural forms, rule formatters, groupBy strings
- EN/RU consistency — same key count, array lengths, non-empty strings

Run with `npm test`. Add tests for any new scheduling logic or language strings.

## Linting

ESLint + Prettier enforce code quality:
- `@typescript-eslint/recommended` rules (strict mode for `src/`)
- Prettier formatting (single quotes, trailing commas, 120 char line width)
- Additional strict rules: `eqeqeq` (smart), `no-var`, `prefer-const`, `@typescript-eslint/no-explicit-any` (error)
- Test files have relaxed rules (no unused-var, no-explicit-any checks)
- Run `npm run lint && npm test && npm run build` after each feature addition
