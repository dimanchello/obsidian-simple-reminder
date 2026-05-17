# Simple Reminder

Obsidian plugin — reminder list with system notifications. Create tasks, set schedules, and get notified on time.

---

## Features

- **Two reminder types:**
  - **Once** — single notification at a specific date and time
  - **Repeat** — recurring reminders (daily, weekly, monthly, yearly) with intra-day modes
- **Intra-day modes for repeat reminders:**
  - **Single** — fires at a specific HH:MM each valid day
  - **Interval** — fires every N minutes within a time window
- **System notifications** via Web Notification API (desktop); automatic fallback to Obsidian Notice on mobile or when permissions are denied
- **Configurable check interval** — any value >= 2 seconds
- **Task checkbox** — disables notifications without deleting the reminder
- **Edit any reminder** — name, type, dates, and intervals
- **Public API** for other plugins — add/remove/get reminders, subscribe to events
- **Two languages:** English and Russian (auto-detect from system locale, or manual selection)
- Full compatibility with **any Obsidian theme** — all styles via CSS variables

---

## Mobile Support

> On **iOS and Android**, notifications work **only while Obsidian is open and active on screen**. If the app is minimized or the screen is locked, notifications will not arrive. This is an OS limitation, not a plugin issue.

---

## Installation

### Via Community Plugins *(coming soon)*

1. Open **Settings → Community plugins → Browse**
2. Search for **Simple Reminder**
3. Click **Install**, then **Enable**

### Manual Installation

1. Download the latest release from [Releases](../../releases)
2. Extract the archive — it should contain `main.js`, `manifest.json`, and `styles.css`
3. Copy the folder to `<vault-path>/.obsidian/plugins/simple-reminder/`
4. In Obsidian: **Settings → Community plugins** → enable **Simple Reminder**

---

## Building from Source

**Requirements:** Node.js >= 18, npm >= 9

```bash
git clone https://github.com/dimanchello/obsidian-simple-reminder.git
cd simple-reminder
npm install

# Development mode (watch + source maps)
npm run dev

# Production build (minified, no source maps)
npm run build

# Run tests
npm test
```

After `npm run build`, copy `main.js`, `manifest.json`, and `styles.css` to the plugin folder in your vault.

### Project Structure

```
simple-reminder/
├── src/
│   ├── main.ts              # Entry point, check loop, notifications
│   ├── types.ts             # Reminder, PluginSettings, LegacyReminder interfaces
│   ├── utils.ts             # Pure functions: calcNextTrigger, advanceTrigger, migrateLegacyReminder
│   ├── api.ts               # Public API for other plugins
│   ├── i18n.ts              # EN/RU translations + language resolution
│   ├── ReminderView.ts      # Sidebar panel (ItemView)
│   ├── AddReminderModal.ts  # Create/edit reminder modal
│   └── SettingsTab.ts       # Plugin settings page
├── tests/
│   └── utils.test.ts        # Unit tests for scheduling logic
├── styles.css
├── manifest.json
├── package.json
├── tsconfig.json
└── esbuild.config.mjs
```

---

## Usage

### Open the Panel

Click the **bell icon** on the ribbon sidebar, or run the command **Simple Reminder: Open reminder panel**.

### Add a Reminder

Click **+ Add** in the panel header and fill in the form:

| Field | Description |
|---|---|
| Task name | Text that appears in the notification |
| Type | Once or Repeat |
| Repeat unit | Day, Week, Month, Year |
| Interval | Repeat every N units |
| Time | For single mode — specific HH:MM; for interval mode — step and time window |

### Edit a Reminder

Click the **pencil icon** on any reminder — the form opens with pre-filled data.

### Mark as Done

Check the **checkbox** next to a task. The entry stays in the list but notifications stop. Uncheck to reactivate.

### Delete a Reminder

Click the **X button** to the right of the reminder.

---

## Settings

| Parameter | Default | Description |
|---|---|---|
| Language | Auto | `Auto` (system locale), `English`, `Russian` |
| Check interval | 30s | How often the plugin checks for due reminders. Minimum: 2s |
| Open panel | — | Button to open the sidebar panel |
| Test notification | — | Sends a test system notification |
| Request permission | — | Re-request OS permission for notifications |
| Delete all | — | Permanently removes all reminders |

---

## How Notifications Work

1. The plugin runs a timer (configurable interval, default 30s) that iterates through all active reminders
2. If `now >= nextTrigger` — the notification fires
3. `nextTrigger` advances by one period, skipping past intervals — long Obsidian downtime does not cause a notification flood
4. Once reminders (`once`) clear `nextTrigger` after firing and do not repeat
5. All state is saved to Obsidian's plugin storage (`data.json`)

---

## Public API

Other plugins can interact with Simple Reminder via:

```typescript
const api = app.plugins.plugins['simple-reminder'].api;

// Add a reminder
const id = api.addReminder({
  title: 'Meeting',
  type: 'once',
  date: new Date('2025-12-01T10:00:00'),
});

// Get all reminders
const reminders = api.getReminders();

// Listen for events
api.on('reminder-fired', (info) => {
  console.log('Fired:', info.title);
});
```

See [API.md](./API.md) for full documentation.

---

## License

MIT © 2026 Dimon
