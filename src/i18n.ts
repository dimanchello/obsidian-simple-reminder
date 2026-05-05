import { Language } from './types';

// ─── Translation shape ────────────────────────────────────────────────────────

export interface Strings {
  // ── view ──────────────────────────────────────────────────────────
  pluginName:     string;
  addBtn:         string;
  statActiveLabel: string;
  statDoneLabel:  string;
  noReminders:    string;
  noRemindersHint: string;
  tagOnce:        string;
  tagRepeat:      string;
  nextLabel:      string;
  alreadyFired:   string;
  endsLabel:      string;
  daysShort:      string[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  deleteAriaLabel: string;
  editAriaLabel:  string;
  // ── modal ─────────────────────────────────────────────────────────
  modalTitle:     string;
  modalEditTitle: string;
  fieldName:      string;
  fieldNamePlaceholder: string;
  sectionType:    string;
  typeOnce:       string;
  typeRepeat:     string;
  sectionRepeat:  string;
  fieldInterval:  string;
  fieldIntervalUnit: string;
  sectionConstraints: string;
  toggleStartDate:  string;
  toggleEndDate:    string;
  toggleTimeWindow: string;
  toggleDaysOfWeek: string;
  fieldDateTime:  string;
  fieldStartDate: string;
  fieldEndDate:   string;
  fieldTimeFrom:  string;
  fieldTimeTo:    string;
  daysOfWeekFull: string[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  saveBtn:        string;
  updateBtn:      string;
  cancelBtn:      string;
  // ── notices ───────────────────────────────────────────────────────
  errNoTitle:     string;
  errNoDate:      string;
  errBadDate:     string;
  errNoStartDate: string;
  errBadInterval: string;
  errNoTimeFrom:  string;
  errNoTimeTo:    string;
  errNoDays:      string;
  okAdded:        string;
  okUpdated:      string;
  okAllDeleted:   string;
  okPermGranted:  string;
  warnPermDenied: string;
  okPermAlready:  string;
  testBody:       string;
  testFallback:   string;
  warnPermBlocked: string;
  // ── settings ──────────────────────────────────────────────────────
  settingsH2:       string;
  mobileH3:         string;
  mobileBody:       string;
  secManagement:    string;
  openPanelName:    string;
  openPanelDesc:    string;
  openPanelBtn:     string;
  checkIntervalName: string;
  checkIntervalDesc: string;
  languageName:     string;
  languageDesc:     string;
  langAuto:         string;
  langEn:           string;
  langRu:           string;
  testName:         string;
  testDesc:         string;
  testBtn:          string;
  reqPermName:      string;
  reqPermDesc:      string;
  reqPermBtn:       string;
  deleteAllName:    string;
  deleteAllDesc:    string;
  deleteAllBtn:     string;
  secStats:         string;
  statTotal:        string;
  statActive:       string;
  statDone:         string;
  secAbout:         string;
  aboutText(sec: number): string;
}

// ─── English ──────────────────────────────────────────────────────────────────

const en: Strings = {
  pluginName:      'Simple Reminder',
  addBtn:          '+ Add',
  statActiveLabel: 'Active',
  statDoneLabel:   'Done',
  noReminders:     'No reminders',
  noRemindersHint: 'Click «+ Add» to create your first reminder',
  tagOnce:         '📅 Once',
  tagRepeat:       '🔁 Repeat',
  nextLabel:       'Next:',
  alreadyFired:    '✅ Already fired',
  endsLabel:       'Until:',
  daysShort:       ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  deleteAriaLabel: 'Delete',
  editAriaLabel:   'Edit',

  modalTitle:     'New Reminder',
  modalEditTitle: 'Edit Reminder',
  fieldName:      'Task name',
  fieldNamePlaceholder: 'e.g. Drink water',
  sectionType:    'Type',
  typeOnce:       '📅  Once — specific date & time',
  typeRepeat:     '🔁  Repeat — flexible schedule',
  sectionRepeat:  'Repeat every',
  fieldInterval:  'Interval',
  fieldIntervalUnit: 'min.',
  sectionConstraints: 'Constraints (optional)',
  toggleStartDate:  '📅 Start from a date',
  toggleEndDate:    '🔚 End on a date',
  toggleTimeWindow: '🕐 Active time window',
  toggleDaysOfWeek: '📆 Days of the week',
  fieldDateTime:  'Date and time',
  fieldStartDate: 'Start date and time',
  fieldEndDate:   'End date and time',
  fieldTimeFrom:  'From',
  fieldTimeTo:    'To',
  daysOfWeekFull: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  saveBtn:        'Save',
  updateBtn:      'Update',
  cancelBtn:      'Cancel',

  errNoTitle:     '⚠️ Enter a reminder title',
  errNoDate:      '⚠️ Select date and time',
  errBadDate:     '⚠️ Invalid date',
  errNoStartDate: '⚠️ Select a start date',
  errBadInterval: '⚠️ Interval must be at least 1 minute',
  errNoTimeFrom:  '⚠️ Enter start time',
  errNoTimeTo:    '⚠️ Enter end time',
  errNoDays:      '⚠️ Select at least one day of the week',
  okAdded:        '✅ Reminder added',
  okUpdated:      '✅ Reminder updated',
  okAllDeleted:   '🗑️ All reminders deleted',
  okPermGranted:  '✅ Notification permission granted',
  warnPermDenied: '⚠️ Permission denied. Check system settings.',
  okPermAlready:  '✅ Notifications already allowed',
  testBody:       '⏰ Test notification works! 🎉',
  testFallback:   '⏰ Test (Notification API unavailable — showing Notice)',
  warnPermBlocked: '⚠️ Notifications blocked. Check system / browser settings.',

  settingsH2:       '⏰ Simple Reminder',
  mobileH3:         '📱 Mobile devices (iOS / Android)',
  mobileBody:       '⚠️ On mobile devices, system notifications work ONLY while the Obsidian app is open and active on screen. If the app is minimised or the screen is locked — notifications will not appear. This is an OS limitation and does not depend on the plugin.',
  secManagement:    'Management',
  openPanelName:    'Open reminder panel',
  openPanelDesc:    'Opens the side panel with the reminder list',
  openPanelBtn:     'Open',
  checkIntervalName: 'Check interval (seconds)',
  checkIntervalDesc: 'How often the plugin checks for due reminders. Minimum: 2 seconds.',
  languageName:     'Language',
  languageDesc:     '"Auto" detects the language from your system settings.',
  langAuto:         'Auto (system)',
  langEn:           'English',
  langRu:           'Русский',
  testName:         'Test notification',
  testDesc:         'Send a test system notification to verify they work correctly',
  testBtn:          'Test',
  reqPermName:      'Request notification permission',
  reqPermDesc:      'Re-request system permission to display notifications',
  reqPermBtn:       'Request',
  deleteAllName:    'Delete all reminders',
  deleteAllDesc:    'Permanently delete the entire reminder list',
  deleteAllBtn:     'Delete all',
  secStats:         'Statistics',
  statTotal:        'Total',
  statActive:       'Active',
  statDone:         'Done (✓)',
  secAbout:         'About',
  aboutText: (sec) => `Simple Reminder v1.0.0 — reminders are checked every ${sec}s. Checking the box on a task fully disables notifications for it.`,
};

// ─── Russian ──────────────────────────────────────────────────────────────────

const ru: Strings = {
  pluginName:      'Simple Reminder',
  addBtn:          '+ Добавить',
  statActiveLabel: 'Активных',
  statDoneLabel:   'Выполнено',
  noReminders:     'Нет напоминаний',
  noRemindersHint: 'Нажмите «+ Добавить» чтобы создать первое',
  tagOnce:         '📅 Разово',
  tagRepeat:       '🔁 Повтор',
  nextLabel:       'Следующее:',
  alreadyFired:    '✅ Уже сработало',
  endsLabel:       'До:',
  daysShort:       ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  deleteAriaLabel: 'Удалить',
  editAriaLabel:   'Редактировать',

  modalTitle:     'Новое напоминание',
  modalEditTitle: 'Редактировать напоминание',
  fieldName:      'Название задачи',
  fieldNamePlaceholder: 'Например: Выпить воды',
  sectionType:    'Тип',
  typeOnce:       '📅  Разово — конкретная дата и время',
  typeRepeat:     '🔁  Повторять — гибкое расписание',
  sectionRepeat:  'Повторять каждые',
  fieldInterval:  'Интервал',
  fieldIntervalUnit: 'мин.',
  sectionConstraints: 'Ограничения (необязательно)',
  toggleStartDate:  '📅 Начинать с даты',
  toggleEndDate:    '🔚 Заканчивать в дату',
  toggleTimeWindow: '🕐 Активное время суток',
  toggleDaysOfWeek: '📆 Дни недели',
  fieldDateTime:  'Дата и время',
  fieldStartDate: 'Дата и время начала',
  fieldEndDate:   'Дата и время окончания',
  fieldTimeFrom:  'С',
  fieldTimeTo:    'До',
  daysOfWeekFull: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
  saveBtn:        'Сохранить',
  updateBtn:      'Обновить',
  cancelBtn:      'Отмена',

  errNoTitle:     '⚠️ Введите название напоминания',
  errNoDate:      '⚠️ Выберите дату и время',
  errBadDate:     '⚠️ Некорректная дата',
  errNoStartDate: '⚠️ Выберите дату начала',
  errBadInterval: '⚠️ Интервал должен быть не менее 1 минуты',
  errNoTimeFrom:  '⚠️ Укажите время начала',
  errNoTimeTo:    '⚠️ Укажите время окончания',
  errNoDays:      '⚠️ Выберите хотя бы один день недели',
  okAdded:        '✅ Напоминание добавлено',
  okUpdated:      '✅ Напоминание обновлено',
  okAllDeleted:   '🗑️ Все напоминания удалены',
  okPermGranted:  '✅ Разрешение на уведомления получено',
  warnPermDenied: '⚠️ Разрешение отклонено. Проверьте настройки системы.',
  okPermAlready:  '✅ Уведомления уже разрешены',
  testBody:       '⏰ Тестовое уведомление работает! 🎉',
  testFallback:   '⏰ Тест (Notification API недоступен — показываем Notice)',
  warnPermBlocked: '⚠️ Уведомления заблокированы. Проверьте настройки системы / браузера.',

  settingsH2:       '⏰ Simple Reminder',
  mobileH3:         '📱 Мобильные устройства (iOS / Android)',
  mobileBody:       '⚠️ На мобильных устройствах системные уведомления работают ТОЛЬКО пока приложение Obsidian открыто и активно на экране. Если приложение свёрнуто или экран заблокирован — уведомления не придут. Это ограничение ОС и не зависит от плагина.',
  secManagement:    'Управление',
  openPanelName:    'Открыть панель напоминаний',
  openPanelDesc:    'Открывает боковую панель со списком напоминаний',
  openPanelBtn:     'Открыть',
  checkIntervalName: 'Интервал проверки (секунды)',
  checkIntervalDesc: 'Как часто плагин проверяет наступившие напоминания. Минимум: 2 секунды.',
  languageName:     'Язык',
  languageDesc:     '«Авто» определяет язык по системным настройкам.',
  langAuto:         'Авто (системный)',
  langEn:           'English',
  langRu:           'Русский',
  testName:         'Тестовое уведомление',
  testDesc:         'Отправить тестовое системное уведомление для проверки',
  testBtn:          'Проверить',
  reqPermName:      'Запросить разрешение на уведомления',
  reqPermDesc:      'Повторно запросить у системы разрешение на показ уведомлений',
  reqPermBtn:       'Запросить',
  deleteAllName:    'Удалить все напоминания',
  deleteAllDesc:    'Безвозвратно удалить весь список напоминаний',
  deleteAllBtn:     'Удалить все',
  secStats:         'Статистика',
  statTotal:        'Всего',
  statActive:       'Активных',
  statDone:         'Выполнено (✓)',
  secAbout:         'О плагине',
  aboutText: (sec) => `Simple Reminder v1.0.0 — напоминания проверяются каждые ${sec} сек. Галочка на задаче полностью выключает уведомления для неё.`,
};

// ─── Resolver ─────────────────────────────────────────────────────────────────

const STRINGS: Record<'en' | 'ru', Strings> = { en, ru };

export function resolveLanguage(setting: Language): 'en' | 'ru' {
  if (setting === 'en') return 'en';
  if (setting === 'ru') return 'ru';
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en') ?? 'en';
  return nav.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export function getStrings(setting: Language): Strings {
  return STRINGS[resolveLanguage(setting)];
}
