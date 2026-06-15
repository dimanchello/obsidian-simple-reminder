# Simple Reminder — API для разработчиков плагинов

Плагин **Simple Reminder** предоставляет публичный API, который позволяет другим плагинам добавлять, читать, изменять и удалять напоминания, а также подписываться на события жизненного цикла.

---

## Доступ к API

```typescript
const sr = (app as any).plugins.plugins['simple-reminder'];
if (!sr?.api) {
  new Notice('Simple Reminder не установлен или отключён');
  return;
}
const api = sr.api; // SimpleReminderAPI
```

Рекомендуется проверять наличие API перед каждым использованием — плагин может быть отключён.

Для типов подключи `api.ts` как **type-only импорт** (файл не нужен в рантайме):

```typescript
import type { SimpleReminderAPI, AddReminderOptions, ReminderInfo } from 'путь/к/simple-reminder/src/api';
```

---

## Версия API

```typescript
api.version // → "1.1.0"
```

Следуй [semver](https://semver.org/lang/ru/): мажорная версия меняется при ломающих изменениях. Всегда проверяй мажорную версию перед вызовом методов:

```typescript
const [major] = api.version.split('.').map(Number);
if (major !== 1) { new Notice('Несовместимая версия Simple Reminder API'); return; }
```

---

## Методы

### `addReminder(options)` → `string`

Создаёт новое напоминание. Возвращает **ID** созданного напоминания.

```typescript
// Разовое — один раз в конкретный момент
const id = api.addReminder({
  title: 'Позвонить клиенту',
  type:  'once',
  date:  new Date('2026-06-15T10:30:00'),
  // date принимает: Date | number (ms timestamp) | string (ISO)
});

// Повтор — каждый день в определённое время
const id = api.addReminder({
  title:        'Утренняя зарядка',
  type:         'repeat',
  unit:         'day',
  step:         1,
  intraDayMode: 'single',
  intraDayTime: '08:30',
});

// Повтор — каждую неделю, в понедельник в 09:00
const id = api.addReminder({
  title:        'Еженедельное ревью',
  type:         'repeat',
  unit:         'week',
  step:         1,
  daysOfWeek:   [1],
  intraDayMode: 'single',
  intraDayTime: '09:00',
});

// Повтор — каждый месяц, 1-го числа в 10:00
const id = api.addReminder({
  title:        'Оплата аренды',
  type:         'repeat',
  unit:         'month',
  step:         1,
  dayOfMonth:   1,
  intraDayMode: 'single',
  intraDayTime: '10:00',
});

// Повтор — каждый год, 25 декабря в 12:00
const id = api.addReminder({
  title:        'С Рождеством!',
  type:         'repeat',
  unit:         'year',
  step:         1,
  dayOfMonth:   25,
  month:        11,
  intraDayMode: 'single',
  intraDayTime: '12:00',
});

// Интервальный режим — каждые 30 минут с 9 до 18
const id = api.addReminder({
  title:          'Пить воду',
  type:           'repeat',
  unit:           'day',
  step:           1,
  intraDayMode:   'interval',
  intraDayStepMin: 30,
  timeWindowStart: '09:00',
  timeWindowEnd:   '18:00',
});
```

---

### `removeReminder(id)` → `boolean`

Удаляет напоминание по ID. Возвращает `true` если найдено и удалено, `false` если не найдено.

```typescript
const removed = api.removeReminder(id);
```

---

### `setChecked(id, checked)` → `boolean`

Отмечает напоминание как выполненное или активирует снова. Выполненное напоминание не присылает уведомления. Возвращает `true` если найдено.

```typescript
api.setChecked(id, true);   // заглушить уведомления
api.setChecked(id, false);  // снова активировать
```

---

### `getReminders()` → `ReminderInfo[]`

Возвращает снимок всех напоминаний (копию — мутировать не нужно).

```typescript
const all    = api.getReminders();
const active = all.filter(r => !r.checked);
const next   = active.sort((a, b) => (a.nextTrigger ?? Infinity) - (b.nextTrigger ?? Infinity))[0];
```

---

### `getReminder(id)` → `ReminderInfo | null`

Возвращает снимок одного напоминания или `null` если не найдено.

```typescript
const info = api.getReminder(id);
if (info) console.log(info.title, info.nextTrigger);
```

---

## Тип `ReminderInfo`

```typescript
interface ReminderInfo {
  readonly id:          string;         // уникальный ID
  readonly title:       string;
  readonly emoji:       string;
  readonly checked:     boolean;        // выполнено?
  readonly type:        string;         // 'once' | 'repeat'
  readonly nextTrigger: number | null;  // следующий тайм-стамп (ms) или null
  readonly raw:         Readonly<Reminder>; // полная внутренняя структура
}
```

---

## События

Подпишись на события через `on()`. Метод возвращает функцию отписки — **обязательно вызывай её при выгрузке своего плагина**, иначе слушатели останутся в памяти.

| Событие | Аргумент callback | Когда |
|---|---|---|
| `reminder-fired` | `ReminderInfo` | Напоминание сработало и уведомление отправлено |
| `reminder-added` | `ReminderInfo` | Напоминание создано (из UI или через API) |
| `reminder-removed` | `string` (id) | Напоминание удалено |
| `reminder-updated` | `ReminderInfo` | Напоминание обновлено или отмечено |

```typescript
export default class MyPlugin extends Plugin {
  private unsubs: Array<() => void> = [];

  async onload() {
    const sr = (app as any).plugins.plugins['simple-reminder'];
    if (!sr?.api) return;

    this.unsubs.push(
      sr.api.on('reminder-fired', (info) => {
        console.log('Сработало:', info.title, 'следующее:', info.nextTrigger);
      }),

      sr.api.on('reminder-added', (info) => {
        console.log('Добавлено:', info.id);
      }),

      sr.api.on('reminder-removed', (id) => {
        console.log('Удалено:', id);
      }),

      sr.api.on('reminder-updated', (info) => {
        console.log('Обновлено:', info.title, 'checked:', info.checked);
      }),
    );
  }

  onunload() {
    // Обязательно отписываемся!
    this.unsubs.forEach(fn => fn());
    this.unsubs = [];
  }
}
```

---

## Полный пример: плагин-интеграция

```typescript
import { Plugin, Notice } from 'obsidian';
import type { SimpleReminderAPI } from 'путь/к/api';

export default class MyIntegrationPlugin extends Plugin {
  private api: SimpleReminderAPI | null = null;
  private unsubs: Array<() => void> = [];

  async onload() {
    // Ждём загрузки всех плагинов перед подключением
    this.app.workspace.onLayoutReady(() => this.connectAPI());
  }

  private connectAPI() {
    const sr = (app as any).plugins.plugins['simple-reminder'];
    if (!sr?.api) {
      console.warn('Simple Reminder не найден');
      return;
    }

    const [major] = (sr.api.version as string).split('.').map(Number);
    if (major !== 1) {
      new Notice('Несовместимая версия Simple Reminder');
      return;
    }

    this.api = sr.api;

    // Создать ежедневное утреннее напоминание
    const id = this.api.addReminder({
      title: 'Ежедневная синхронизация с My Plugin',
      type: 'repeat',
      unit: 'day',
      step: 1,
      intraDayMode: 'single',
      intraDayTime: '09:00',
    });

    // Слушать срабатывания
    this.unsubs.push(
      this.api.on('reminder-fired', info => {
        if (info.id === id) this.handleSync();
      })
    );
  }

  private handleSync() {
    new Notice('My Plugin: выполняем синхронизацию...');
    // ... логика плагина
  }

  onunload() {
    this.unsubs.forEach(fn => fn());
    this.unsubs = [];

    // Опционально: удалить напоминания, созданные этим плагином
    // this.api?.removeReminder(id);
  }
}
```

---

## Совместимость

| Simple Reminder | API версия | Изменения |
|---|---|---|
| 1.0.0 | 1.0.0 | Первый релиз |
| 1.1.0 | 1.1.0 | Добавлены remindBefore, emoji, события |

При ломающих изменениях мажорная версия будет увеличена. Патч-версия (1.1.**x**) — только баги, обратно совместимо.
