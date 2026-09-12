# Obsidian Simple Reminder

[English](#features) | [Русский](#возможности)

An Obsidian plugin for managing a reminder list with system notifications. Create tasks, schedule recurring reminders, embed interactive widgets directly in your notes, and never miss a deadline.

---

## Features

- **Two Reminder Types:**
  - **Once** — single notification at a specific date and time
  - **Repeat** — recurring reminders (daily, weekly, monthly, yearly) with customizable intervals
- **Intra-Day Modes for Recurring Reminders:**
  - **Single** — triggers at a specific time (HH:MM) on scheduled days
  - **Interval** — triggers every N minutes within an active time window
- **Desktop System Notifications** via the Web Notification API with automatic fallback to Obsidian Notice on mobile devices or when system permissions are denied
- **Configurable Check Interval** — from 2 seconds upwards (default: 30s)
- **Automatic Pruning** — completed one-shot reminders are automatically deleted after 3 days (customizable)
- **Pre-Alert Notifications ("Remind Before")** — receive heads-up notifications minutes, hours, days, weeks, months, or years before the event
- **Reopen Completed Reminders** — easily uncheck completed reminders before they are pruned
- **Nag Mode (Persistent Notifications):**
  - **For one-shot reminders**: repeats every N minutes until manually checked off. If the trigger time has passed, the cycle continues without interruption even after editing
  - **For recurring reminders**: repeats every N minutes until clicked or until the next trigger
- **URL & Note Links:**
  - Attach external URLs (http, https, ftp, ssh) or internal note links (`[[Note Name]]`)
  - Clicking notification opens external URLs in your browser and note links directly in Obsidian
- **Markdown Code Block Widget** (`simple-reminder`) — embed interactive reminder lists inside any note with custom filtering, grouping, and headers
- **Bilingual Interface** — English and Russian with automatic detection based on Obsidian's language setting
- **Full Theme Compatibility** — built using Obsidian CSS variables to seamlessly match any theme

---

## Mobile Devices

> On **iOS and Android**, notifications only fire **while Obsidian is open and active on screen**. If the app is closed, minimized, or the device is locked, notifications will not appear due to OS platform restrictions.

---

## Installation

### Community Plugins *(coming soon)*

1. In Obsidian, go to **Settings → Community plugins → Browse**
2. Search for **Obsidian Simple Reminder**
3. Click **Install**, then **Enable**

### Manual Installation

1. Download the latest release from [Releases](../../releases)
2. Extract the archive containing `main.js`, `manifest.json`, and `styles.css`
3. Copy these files into `<vault-path>/.obsidian/plugins/simple-reminder/`
4. In Obsidian: **Settings → Community plugins** → enable **Obsidian Simple Reminder**

### Via BRAT (Beta Reviewer Auto-update Tool)

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin from Community Plugins
2. In BRAT settings, choose **BRAT: Add a beta plugin for testing**
3. Enter the repository URL: `https://github.com/dimanchello/obsidian-simple-reminder`
4. Click **Add Plugin**, then enable it in Obsidian settings

---

## Building from Source

**Requirements:** Node.js >= 18, npm >= 9

```bash
git clone https://github.com/dimanchello/obsidian-simple-reminder.git
cd obsidian-simple-reminder
npm install

# Development watch mode
npm run dev

# Production build
npm run build

# Run unit tests
npm test

# Linting and formatting
npm run lint
npm run format
```

Copy the build output from `dist/` (`main.js`, `manifest.json`, `styles.css`) to your vault's plugin directory.

### Project Structure

```
simple-reminder/
├── dist/                    # Build output (copy to your Obsidian vault)
│   ├── main.js
│   ├── manifest.json
│   └── styles.css
├── src/
│   ├── main.ts              # Entry point, check loop, notification dispatcher
│   ├── types.ts             # TypeScript interfaces and defaults
│   ├── utils.ts             # Pure functions: scheduling, migration, pruning, parsing
│   ├── api.ts               # Public API for third-party plugins
│   ├── i18n.ts              # Localization dictionaries and language resolver
│   ├── ReminderWidget.ts    # Reusable interactive reminder list UI
│   ├── ReminderCodeBlock.ts # Markdown code block processor (MarkdownRenderChild)
│   ├── ReminderView.ts      # Obsidian ItemView (sidebar panel)
│   ├── AddReminderModal.ts  # Modal for creating/editing reminders
│   └── SettingsTab.ts       # Plugin settings page
├── tests/
│   ├── utils.test.ts        # Unit tests for scheduling, parsing, and migration
│   └── i18n.test.ts         # Unit tests for translation dictionaries
├── styles.css               # Plugin stylesheet
├── manifest.json            # Obsidian plugin manifest
├── package.json
├── tsconfig.json
└── esbuild.config.mjs
```

---

## Usage

### Opening the Sidebar Panel

Click the **bell icon** in the left ribbon or run the command **Simple Reminder: Open reminder panel** from the command palette (`Ctrl/Cmd + P`).

### Embedding Widgets in Notes (Code Block)

You can render an interactive reminder list in any markdown file using the `simple-reminder` code block:

````markdown
```simple-reminder
```
````

> **Tip:** Use the command **Simple Reminder: Insert reminder widget** (`Ctrl/Cmd + P`) to insert the snippet at your current cursor position.

The widget supports interactive checkboxes, adding and editing reminders, viewing details, and opening the calendar. All actions instantly sync across all open notes and the sidebar panel.

#### Code Block Parameters:

| Parameter | Options | Default | Description |
|---|---|---|---|
| `tab` | `all`, `active`, `done` | `all` | Filter reminders by completion status |
| `group` / `groupBy` | `none`, `minute`, `hour`, `day`, `week`, `month`, `year` | From settings | Group reminders by timeframe |
| `header` | `true`, `false` | `true` | Show or hide the top header |
| `tabs` | `true`, `false` | `true` | Show or hide status tabs |
| `title` | Text | `Simple Reminder` | Custom widget header title |

#### Examples:

Compact list of active reminders only:
````markdown
```simple-reminder
tab: active
header: false
tabs: false
```
````

Reminders grouped by day with a custom title:
````markdown
```simple-reminder
tab: all
group: day
title: Today's Tasks
```
````

### Adding a Reminder

Click **+ Add** in the panel or widget header and fill in the form:
- **Title**: text shown in the notification and list
- **Type**: One-shot or Recurring
- **Schedule**: set specific date/time, recurring frequency, or intra-day intervals
- **Remind before**: optional pre-alert before the main trigger
- **Nag Mode**: keep notifying until manually completed

---

## Settings

| Option | Default | Description |
|---|---|---|
| Open Reminder Panel | — | Quick button to open the sidebar panel |
| Check Interval | 30s | Frequency of checking due reminders (minimum 2s) |
| Group reminders by | No grouping | Grouping separators for panel reminders (`minute`, `hour`, `day`, `week`, `month`, `year`) |
| Auto-prune completed after | 3 days | How many days to retain completed reminders (set to `0` to keep forever) |
| Test Notification | — | Send a test system notification |
| Request Permission | — | Request notification permission from the OS |
| Delete All Reminders | — | Permanently delete all stored reminders |

---

## Public API

Other plugins can integrate with Simple Reminder using the exposed API:

```typescript
const api = app.plugins.plugins['simple-reminder'].api;

// Add a reminder
const id = api.addReminder({
  title: 'Meeting with team',
  type: 'once',
  date: new Date('2026-10-01T10:00:00'),
});

// Retrieve reminders
const reminders = api.getReminders();

// Subscribe to events
api.on('reminder-fired', (info) => {
  console.log('Reminder triggered:', info.title);
});
```

See [API.md](./API.md) for full API documentation.

---

# Obsidian Simple Reminder (на русском)

Плагин для Obsidian — список напоминаний с системными уведомлениями. Создавайте задачи, задавайте расписание и получайте уведомления вовремя.

---

## Возможности

- **Два типа напоминаний:**
  - **Разовое** — однократное уведомление в конкретную дату и время
  - **Повторяющееся** — регулярные напоминания (ежедневно, еженедельно, ежемесячно, ежегодно) с внутридневными режимами
- **Внутридневные режимы для повторяющихся:**
  - **Одиночный** — срабатывает в определённое время (ЧЧ:ММ) каждый подходящий день
  - **Интервальный** — срабатывает каждые N минут в заданном временном окне
- **Системные уведомления** через Web Notification API (десктоп); автоматический fallback на Obsidian Notice на мобильных или при отклонённых разрешениях
- **Настраиваемый интервал проверки** — любое значение >= 2 секунд
- **Автоматическое удаление выполненных** — разовые напоминания удаляются через 3 дня после выполнения
- **Предварительные уведомления (Напомнить за)** — получайте уведомления за X минут/часов/дней до наступления события (с указанием оставшегося времени в заголовке)
- **Переоткрытие напоминаний** — выполненные напоминания можно переоткрыть до их удаления
- **Чекбокс задачи** — отключает уведомления без удаления напоминания
- **Редактирование любого напоминания** — название, тип, даты, интервалы
- **Публичный API** для других плагинов — добавление/удаление/получение напоминаний, подписка на события
- **Два языка:** английский и русский (автоматическое определение по языку интерфейса Obsidian)
- **Настойчивые уведомления (Nag Mode)**:
  - **Для разовых напоминаний**: включите эту опцию, чтобы они повторялись каждые N минут, пока вы вручную не отметите их как выполненные. Если время напоминания уже наступило, цикл уведомлений продолжается, и даже при редактировании параметров напоминания плагин автоматически вычисляет ближайший следующий интервал повторов без прерывания и сброса расписания
  - **Для повторяющихся напоминаний**: уведомление будет повторяться каждые N минут до момента клика на него или до наступления следующего триггера. После клика "наг" останавливается до следующего срабатывания
  - Идеально для важных задач, которые нельзя пропустить!
- **Ссылки в напоминаниях**:
  - Добавьте URL в напоминание — внешнюю ссылку (http://, ftp://, ssh:// и т.д.) или ссылку на заметку ([[Название заметки]])
  - При нажатии на уведомление: внешние ссылки открываются в браузере, заметки — в новой вкладке Obsidian
  - Если ссылка не указана, показываются подробности напоминания
- **Встраивание в заметки через кодовый блок** (````simple-reminder````) — интерактивный виджет напоминаний прямо внутри заметок с гибкой настройкой фильтрации, группировки и внешнего вида
- **Полная совместимость** с любой темой Obsidian — все стили через CSS-переменные

---

## Мобильные устройства

> На **iOS и Android** уведомления работают **только пока Obsidian открыт и активен на экране**. Если приложение свёрнуто или экран заблокирован, уведомления не придут. Это ограничение ОС, а не плагина.

---

## Установка

### Через Community Plugins *(скоро)*

1. Откройте **Settings → Community plugins → Browse**
2. Найдите **Obsidian Simple Reminder**
3. Нажмите **Install**, затем **Enable**

### Ручная установка

1. Скачайте последний релиз из [Releases](../../releases)
2. Распакуйте архив — он должен содержать `main.js`, `manifest.json` и `styles.css`
3. Скопируйте папку в `<vault-path>/.obsidian/plugins/simple-reminder/`
4. В Obsidian: **Settings → Community plugins** → включите **Obsidian Simple Reminder**

### Через BRAT (Beta Reviewer Auto-update Tool)

1. Установите плагин [BRAT](https://github.com/TfTHacker/obsidian42-brat) из Community Plugins
2. Включите BRAT в настройках
3. Откройте команду **BRAT: Add a beta plugin for testing**
4. Вставьте URL репозитория: `https://github.com/dimanchello/obsidian-simple-reminder`
5. Нажмите **Add Plugin**
6. Перезагрузите Obsidian и включите **Obsidian Simple Reminder** в настройках

---

## Сборка из исходников

**Требования:** Node.js >= 18, npm >= 9

```bash
git clone https://github.com/dimanchello/obsidian-simple-reminder.git
cd obsidian-simple-reminder
npm install

# Режим разработки (watch + source maps)
npm run dev

# Продакшен-сборка (минифицированная, без source maps)
npm run build

# Запуск тестов
npm test

# Проверка качества кода
npm run lint
npm run format
```

После `npm run build` скопируйте содержимое `dist/` (`main.js`, `manifest.json` и `styles.css`) в папку плагина в вашем хранилище.

### Структура проекта

```
simple-reminder/
├── dist/                    # Результат сборки (установить в хранилище Obsidian)
│   ├── main.js
│   ├── manifest.json
│   └── styles.css
├── src/
│   ├── main.ts              # Точка входа, цикл проверки, уведомления
│   ├── types.ts             # Интерфейсы Reminder, PluginSettings, LegacyReminder
│   ├── utils.ts             # Чистые функции: calcNextTrigger, advanceTrigger, pruneOldCompleted
│   ├── api.ts               # Публичный API для других плагинов
│   ├── i18n.ts              # Переводы EN/RU + определение языка
│   ├── ReminderWidget.ts    # Общий интерактивный UI виджета напоминаний
│   ├── ReminderCodeBlock.ts # Интеграция Markdown кодовых блоков (MarkdownRenderChild)
│   ├── ReminderView.ts      # Боковая панель (ItemView)
│   ├── AddReminderModal.ts  # Модальное окно создания/редактирования
│   └── SettingsTab.ts       # Страница настроек плагина
├── tests/
│   ├── utils.test.ts        # Юнит-тесты логики расписаний
│   └── i18n.test.ts         # Юнит-тесты строк i18n
├── styles.css               # Исходные стили (копируются в dist/ при сборке)
├── manifest.json            # Манифест плагина (копируется в dist/ при сборке)
├── package.json
├── tsconfig.json
└── esbuild.config.mjs
```

---

## Использование

### Открыть панель

Нажмите на **значок колокольчика** на боковой панели или выполните команду **Obsidian Simple Reminder: Open reminder panel**.

### Встраивание в заметки (Code Block)

Вы можете отобразить список напоминаний прямо внутри любой заметки с помощью кодового блока `simple-reminder`:

````markdown
```simple-reminder
```
````

> **Совет:** Чтобы не писать название блока вручную, используйте команду **Simple Reminder: Insert reminder widget** в палитре команд (`Ctrl/Cmd + P`), и блок автоматически вставится в текущее место заметки.

Виджет полностью интерактивен: позволяет отмечать задачи чекбоксами, добавлять и редактировать напоминания, открывать календарь и детали. Все действия мгновенно синхронизируются с боковой панелью и другими открытыми заметками.

#### Доступные параметры конфигурации:

| Параметр | Возможные значения | По умолчанию | Описание |
|---|---|---|---|
| `tab` | `all`, `active`, `done` | `all` | Фильтрация по статусу напоминаний |
| `group` / `groupBy` | `none`, `minute`, `hour`, `day`, `week`, `month`, `year` | Из настроек | Группировка напоминаний |
| `header` | `true`, `false` | `true` | Отображение шапки (заголовок, календарь, кнопка добавления) |
| `tabs` | `true`, `false` | `true` | Отображение переключателя вкладок |
| `title` | Текст | `Simple Reminder` | Пользовательский заголовок в шапке |

#### Примеры использования:

Только активные задачи в виде компактного списка:
````markdown
```simple-reminder
tab: active
header: false
tabs: false
```
````

Задачи с группировкой по дням:
````markdown
```simple-reminder
tab: all
group: day
title: Мои напоминания
```
````

### Добавить напоминание

Нажмите **+ Добавить** в заголовке панели и заполните форму:

| Поле | Описание |
|---|---|
| Название задачи | Текст, который появится в уведомлении |
| Тип | Разовое или Повтор |
| Единица повтора | День, Неделя, Месяц, Год |
| Интервал | Повторять каждые N единиц |
| Время | Для одиночного режима — конкретное ЧЧ:ММ; для интервального — шаг и временное окно |

### Редактировать напоминание

Нажмите на **значок карандаша** у любого напоминания — форма откроется с предзаполненными данными. Через редактирование можно переоткрыть выполненное напоминание, сняв галочку «Выполнено». При редактировании активных разовых напоминаний с настойчивыми уведомлениями (Nag Mode), время которых уже наступило, расписание и цикл повторов сохраняются — плагин автоматически рассчитывает ближайший будущий интервал.

### Выполнить напоминание

Разовые напоминания автоматически помечаются как выполненные после срабатывания (если не включён Nag Mode — при активном режиме они продолжают повторяться до ручной отметки). Выполненные напоминания удаляются через 3 дня.

### Удалить напоминание

Нажмите на **кнопку ✕** справа от напоминания.

---

## Настройки

| Параметр | По умолчанию | Описание |
|---|---|---|
| Открыть панель | — | Кнопка для открытия боковой панели |
| Интервал проверки | 30с | Как часто плагин проверяет наступившие напоминания. Минимум: 2с |
| Группировать напоминания по | Без группировки | Разделители между группами в панели (`минута`, `час`, `день`, `неделя`, `месяц`, `год`) |
| Авто-удаление завершенных через (дней) | 3 | Сколько дней хранить завершенные напоминания (установите `0`, чтобы хранить вечно) |
| Тестовое уведомление | — | Отправляет тестовое системное уведомление |
| Запросить разрешение | — | Повторный запрос разрешения ОС на уведомления |
| Удалить все | — | Безвозвратно удаляет все напоминания |

---

## Как работают уведомления

1. Плагин запускает таймер (настраиваемый интервал, по умолчанию 30с), который проходит по всем активным напоминаниям
2. Если `now >= nextTrigger` — срабатывает уведомление
3. `nextTrigger` сдвигается на один период, пропуская прошедшие интервалы — длительный простой Obsidian не вызывает спам уведомлениями
4. Разовые напоминания (`once`) после срабатывания помечаются как выполненные (`checked = true`, `completedAt = now`) и `nextTrigger` становится null (если включён Nag Mode — `nextTrigger` сдвигается на заданный интервал и продолжает повторяться до ручной отметки выполнения, в том числе при редактировании прошедшей задачи)
5. Выполненные напоминания автоматически удаляются через 3 дня
6. Предварительные уведомления ("Напомнить за") срабатывают до основного события и отображают оставшееся время прямо в заголовке уведомления (например, "Скоро (через 1 неделю):")
7. При нажатии на предварительное уведомление (текущее время раньше основного срабатывания) — открывается модалка с подробностями **без** пометки напоминания как выполненного. Напоминание помечается выполненным только при нажатии на основное уведомление (когда время наступило)
8. Все надписи расписания корректно склоняются на обоих языках: "Каждый день", "Каждую неделю", "Каждые 2 дня", "Каждые 21 день", "Every day", "Every 3 weeks" и т.д.
9. Всё состояние сохраняется в хранилище плагина Obsidian (`data.json`)

---

## Публичный API

Другие плагины могут взаимодействовать с Simple Reminder через:

```typescript
const api = app.plugins.plugins['simple-reminder'].api;

// Добавить напоминание
const id = api.addReminder({
  title: 'Встреча',
  type: 'once',
  date: new Date('2025-12-01T10:00:00'),
});

// Получить все напоминания
const reminders = api.getReminders();

// Подписаться на события
api.on('reminder-fired', (info) => {
  console.log('Сработало:', info.title);
});
```

Полная документация в [API.md](./API.md).

---

## Лицензия

MIT © 2026 Dimon
