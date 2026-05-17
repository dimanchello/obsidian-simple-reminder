# AGENTS.md — Simple Reminder

## Project overview

Obsidian plugin that manages a reminder list with system notifications. Supports one-shot, daily/weekly/monthly/yearly recurring reminders with intra-day single-time or interval modes.

## Tech stack

- **TypeScript** (strict mode, ES2018 target)
- **esbuild** for bundling
- **vitest** for unit tests
- **Obsidian Plugin API** (external, not bundled)

## Key commands

```bash
npm run dev          # watch mode with inline sourcemaps
npm run build        # typecheck + production build (minified)
npm test             # run unit tests once
npm run test:watch   # run tests in watch mode
```

## Architecture

```
src/
  main.ts              — Plugin entry: lifecycle, check loop, notifications, view management
  types.ts             — Reminder, PluginSettings, LegacyReminder interfaces + defaults
  utils.ts             — Pure functions: generateId, fmtDate, calcNextTrigger, advanceTrigger, migrateLegacyReminder
  api.ts               — Public API for other plugins (add/remove/get reminders, event system)
  i18n.ts              — EN/RU string dictionaries, language resolution
  ReminderView.ts      — Obsidian ItemView (sidebar panel)
  AddReminderModal.ts  — Modal for creating/editing reminders
  SettingsTab.ts       — Obsidian PluginSettingTab
tests/
  utils.test.ts        — Tests for calcNextTrigger, advanceTrigger, migration, helpers
  i18n.test.ts         — Tests for i18n strings, EN/RU consistency
dist/                  — Build output (main.js, manifest.json, styles.css)
```

## Conventions

- **No comments** unless explicitly requested
- **No emojis** in code (only in UI strings in i18n.ts)
- Follow existing naming: `camelCase` for variables/functions, `PascalCase` for types/classes
- All UI strings go through `i18n.ts` — never hardcode text in components
- Pure logic lives in `utils.ts` — keep it framework-agnostic
- DOM manipulation stays in views/modals — use Obsidian's `createEl`/`createDiv` API

## Important implementation details

### Reminder types
- `once` — fires at `specificTs`, then stops (`nextTrigger` becomes null)
- `repeat` — uses `repUnit`/`repStep` for inter-day scheduling + `intraDayMode` for time-of-day

### Intra-day modes
- `single` — fires at a specific HH:MM each valid day
- `interval` — fires every N minutes within a time window (`timeWindowStart` to `timeWindowEnd`)

### Check loop
- Runs at `checkIntervalSec` (default 30s, min 2s)
- Skips reminders where `checked === true` or `nextTrigger` is null/past
- On fire: notification → `advanceTrigger` → save → refresh view

### API events
- `reminder-fired` — when a reminder triggers
- `reminder-added` / `reminder-removed` / `reminder-updated` — CRUD operations
- Access via `app.plugins.plugins['simple-reminder'].api`

### Migration
- `migrateLegacyReminder` converts old reminder formats (`specific`, `flexible`, `scheduled`, `periodic`) to the current `once`/`repeat` schema
- Already-migrated reminders pass through unchanged

## Testing

Tests cover the critical scheduling logic in `utils.ts` and i18n dictionaries:

**`tests/utils.test.ts`** (47 tests):
- `generateId` — uniqueness, format
- `mondayOf` — all edge cases (Mon-Sun, time reset, immutability)
- `calcNextTrigger` — once (future/past/null/equal), daily/weekly/monthly/yearly with step > 1, interval mode, overnight windows, end dates, malformed inputs, null fields
- `advanceTrigger` — once null, progression, null nextTrigger, past endDate
- `migrateLegacyReminder` — all legacy types (specific/flexible/scheduled/periodic), defaults, empty objects

**`tests/i18n.test.ts`** (38 tests):
- `resolveLanguage` — explicit en/ru, auto fallback
- English strings — all UI text, plural/singular forms, rule formatters
- Russian strings — all UI text, plural forms, rule formatters
- EN/RU consistency — same key count, array lengths, non-empty strings

Run with `npm test`. Add tests for any new scheduling logic or language strings.
