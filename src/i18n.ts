import { Language } from './types';

export interface Strings {
  pluginName: string;
  addBtn: string;
  tabAll: string;
  tabActive: string;
  tabDone: string;
  statActiveLabel: string;
  statDoneLabel: string;
  noReminders: string;
  noRemindersHint: string;
  tagOnce: string;
  tagRepeat: string;
  nextLabel: string;
  alreadyFired: string;
  endsLabel: string;
  daysShort: string[];
  monthsShort: string[];
  deleteAriaLabel: string;
  editAriaLabel: string;

  modalTitle: string;
  modalEditTitle: string;
  fieldName: string;
  fieldNamePlaceholder: string;
  sectionType: string;
  typeOnce: string;
  typeRepeat: string;

  calDayOfWeek: string;
  calDayOfMonth: string;
  calMonthLabel: string;
  monthsFull: string[];

  periodicEvery: string;
  periodicEverySingular: string;
  periodicUnitFew: string[];
  periodicUnitLabels: string[];
  periodicUnitSingular: string[];
  periodicUnitShort: string[];
  periodicTimeLabel: string;

  advSettings: string;
  toggleStartDate: string;
  toggleEndDate: string;
  toggleIntraDay: string;
  fieldDateTime: string;
  fieldStartDate: string;
  fieldEndDate: string;
  fieldIntervalUnit: string;
  fieldTimeFrom: string;
  fieldTimeTo: string;

  fieldEmoji: string;
  fieldEmojiPlaceholder: string;
  remindBeforeLabel: string;
  remindBeforeUnitLabels: string[];

  saveBtn: string;
  updateBtn: string;
  cancelBtn: string;

  errNoTitle: string;
  errNoDate: string;
  errBadDate: string;
  errNoStartDate: string;
  errBadInterval: string;
  errNoTimeFrom: string;
  errNoTimeTo: string;
  errNoDays: string;
  errBadDayNum: string;
  errNoTime: string;
  errPeriodNMin: string;
  okAdded: string;
  okUpdated: string;

  // Описание правила
  ruleEvery: (n: number, unit: string) => string;
  ruleAt: (time: string) => string;
  ruleInterval: (mins: number, from: string, to: string) => string;

  // Настройки
  settingsH2: string;
  mobileH3: string;
  mobileBody: string;
  secManagement: string;
  openPanelName: string;
  openPanelDesc: string;
  openPanelBtn: string;
  checkIntervalName: string;
  checkIntervalDesc: string;
  languageName: string;
  languageDesc: string;
  langAuto: string;
  langEn: string;
  langRu: string;
  testName: string;
  testDesc: string;
  testBtn: string;
  reqPermName: string;
  reqPermDesc: string;
  reqPermBtn: string;
  deleteAllName: string;
  deleteAllDesc: string;
  deleteAllBtn: string;
  secStats: string;
  statTotal: string;
  statActive: string;
  statDone: string;
  secAbout: string;
  aboutText: (s: number) => string;
  okAllDeleted: string;
  testBody: string;
  testFallback: string;
  okPermGranted: string;
  warnPermDenied: string;
  warnPermBlocked: string;
  okPermAlready: string;
  remindBeforePrefix: string;
  deleteConfirm: string;
  confirmYes: string;
  confirmNo: string;

  // Calendar modal
  calendarBtn: string;
  calendarBack: string;
  calendarRemindersFor: string;
  calendarNoReminders: string;
}

const en: Strings = {
  pluginName: 'Simple Reminder',
  addBtn: '+ Add',
  tabAll: 'All',
  tabActive: 'Active',
  tabDone: 'Done',
  statActiveLabel: 'Active',
  statDoneLabel: 'Done',
  noReminders: 'No reminders',
  noRemindersHint: 'Click «+ Add» to create your first reminder',
  tagOnce: '📅 Once',
  tagRepeat: '🔁 Repeat',
  nextLabel: 'Next:',
  alreadyFired: '✅ Already fired',
  endsLabel: 'Until:',
  daysShort: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  deleteAriaLabel: 'Delete',
  editAriaLabel: 'Edit',

  modalTitle: 'New Reminder',
  modalEditTitle: 'Edit Reminder',
  fieldName: 'Task name',
  fieldNamePlaceholder: 'e.g. Drink water',
  sectionType: 'Type',
  typeOnce: '📅  Once — specific date & time',
  typeRepeat: '🔁  Repeat — regularly (daily, weekly, etc.)',

  calDayOfWeek: 'Day of week',
  calDayOfMonth: 'Day of month',
  calMonthLabel: 'Month',
  monthsFull: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],

  periodicEvery: 'Every',
  periodicEverySingular: 'Every',
  periodicUnitFew: ['days', 'weeks', 'months', 'years'],
  periodicUnitLabels: ['days', 'weeks', 'months', 'years'],
  periodicUnitSingular: ['day', 'week', 'month', 'year'],
  periodicUnitShort: ['Day', 'Week', 'Month', 'Year'],
  periodicTimeLabel: 'At time',

  advSettings: '⚙️ Advanced settings',
  toggleStartDate: '▶️ Starts on date',
  toggleEndDate: '⏹️ Ends on date',
  toggleIntraDay: '🔄 Multiple times a day',
  fieldDateTime: 'Date and time',
  fieldStartDate: 'Start date and time',
  fieldEndDate: 'End date and time',
  fieldIntervalUnit: 'mins.',
  fieldTimeFrom: 'Active from',
  fieldTimeTo: 'to',

  fieldEmoji: 'Icon',
  fieldEmojiPlaceholder: 'e.g. ⏰ 🔔 📌',
  remindBeforeLabel: 'Remind before',
  remindBeforeUnitLabels: ['minutes', 'hours', 'days', 'weeks', 'months', 'years'],

  saveBtn: 'Save',
  updateBtn: 'Update',
  cancelBtn: 'Cancel',

  errNoTitle: '⚠️ Enter a reminder title',
  errNoDate: '⚠️ Select date and time',
  errBadDate: '⚠️ Invalid date',
  errNoStartDate: '⚠️ Select a start date',
  errBadInterval: '⚠️ Interval must be at least 1 minute',
  errNoTimeFrom: '⚠️ Enter start time',
  errNoTimeTo: '⚠️ Enter end time',
  errNoDays: '⚠️ Select at least one day',
  errBadDayNum: '⚠️ Enter a day of the month (1–31)',
  errNoTime: '⚠️ Enter notification time',
  errPeriodNMin: '⚠️ Interval must be at least 1',
  okAdded: '✅ Reminder added',
  okUpdated: '✅ Reminder updated',

  ruleEvery: (n, unit) => `Every ${n} ${unit}`,
  ruleAt: (time) => `at ${time}`,
  ruleInterval: (mins, f, t) => `every ${mins}m (${f}-${t})`,

  settingsH2: '⏰ Simple Reminder',
  mobileH3: '📱 Mobile devices (iOS / Android)',
  mobileBody:
    '⚠️ On mobile devices, system notifications work ONLY while the Obsidian app is open and active on screen.',
  secManagement: 'Management',
  openPanelName: 'Open reminder panel',
  openPanelDesc: 'Opens the side panel with the reminder list',
  openPanelBtn: 'Open',
  checkIntervalName: 'Check interval (seconds)',
  checkIntervalDesc: 'How often the plugin checks for due reminders. Minimum: 2 seconds.',
  languageName: 'Language',
  languageDesc: '"Auto" detects the language from your system settings.',
  langAuto: 'Auto (system)',
  langEn: 'English',
  langRu: 'Русский',
  testName: 'Test notification',
  testDesc: 'Send a test system notification',
  testBtn: 'Test',
  reqPermName: 'Request notification permission',
  reqPermDesc: 'Re-request system permission to display notifications',
  reqPermBtn: 'Request',
  deleteAllName: 'Delete all reminders',
  deleteAllDesc: 'Permanently delete the entire reminder list',
  deleteAllBtn: 'Delete all',
  secStats: 'Statistics',
  statTotal: 'Total',
  statActive: 'Active',
  statDone: 'Done (✓)',
  secAbout: 'About',
  aboutText: (s) => `Simple Reminder v1.1.0 — checked every ${s}s.`,
  okAllDeleted: '🗑️ All reminders deleted',
  testBody: '⏰ Test notification works! 🎉',
  testFallback: '⏰ Test (Notification API unavailable — showing Notice)',
  okPermGranted: '✅ Notification permission granted',
  warnPermDenied: '⚠️ Permission denied. Check system settings.',
  warnPermBlocked: '⚠️ Notifications blocked. Check system / browser settings.',
  okPermAlready: '✅ Notifications already allowed',
  remindBeforePrefix: '⏰ Reminder soon:',
  deleteConfirm: 'Delete this reminder?',
  confirmYes: 'Yes',
  confirmNo: 'No',

  calendarBtn: '📅 Calendar',
  calendarBack: 'Back',
  calendarRemindersFor: 'Reminders for',
  calendarNoReminders: 'No reminders on this day',
};

const ru: Strings = {
  pluginName: 'Simple Reminder',
  addBtn: '+ Добавить',
  tabAll: 'Все',
  tabActive: 'Активные',
  tabDone: 'Выполнены',
  statActiveLabel: 'Активных',
  statDoneLabel: 'Выполнено',
  noReminders: 'Нет напоминаний',
  noRemindersHint: 'Нажмите «+ Добавить» чтобы создать первое',
  tagOnce: '📅 Разово',
  tagRepeat: '🔁 Повтор',
  nextLabel: 'Следующее:',
  alreadyFired: '✅ Уже сработало',
  endsLabel: 'До:',
  daysShort: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  monthsShort: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
  deleteAriaLabel: 'Удалить',
  editAriaLabel: 'Редактировать',

  modalTitle: 'Новое напоминание',
  modalEditTitle: 'Редактировать напоминание',
  fieldName: 'Название задачи',
  fieldNamePlaceholder: 'Например: Выпить воды',
  sectionType: 'Тип',
  typeOnce: '📅  Разово — конкретная дата и время',
  typeRepeat: '🔁  Повтор — регулярно (дни, недели и т.д.)',

  calDayOfWeek: 'День недели',
  calDayOfMonth: 'День месяца',
  calMonthLabel: 'Месяц',
  monthsFull: [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ],

  periodicEvery: 'Каждые',
  periodicEverySingular: 'Каждый',
  periodicUnitFew: ['дня', 'недели', 'месяца', 'года'],
  periodicUnitLabels: ['дней', 'недель', 'месяцев', 'лет'],
  periodicUnitSingular: ['день', 'неделю', 'месяц', 'год'],
  periodicUnitShort: ['День', 'Неделю', 'Месяц', 'Год'],
  periodicTimeLabel: 'Время',

  advSettings: '⚙️ Дополнительные настройки',
  toggleStartDate: '▶️ Начинать с даты',
  toggleEndDate: '⏹️ Заканчивать в дату',
  toggleIntraDay: '🔄 Несколько раз в день',
  fieldDateTime: 'Дата и время',
  fieldStartDate: 'Дата и время начала',
  fieldEndDate: 'Дата и время окончания',
  fieldIntervalUnit: 'мин.',
  fieldTimeFrom: 'С',
  fieldTimeTo: 'до',

  fieldEmoji: 'Иконка',
  fieldEmojiPlaceholder: 'например ⏰ 🔔 📌',
  remindBeforeLabel: 'Напомнить за',
  remindBeforeUnitLabels: ['минут', 'часов', 'дней', 'недель', 'месяцев', 'лет'],

  saveBtn: 'Сохранить',
  updateBtn: 'Обновить',
  cancelBtn: 'Отмена',

  errNoTitle: '⚠️ Введите название напоминания',
  errNoDate: '⚠️ Выберите дату и время',
  errBadDate: '⚠️ Некорректная дата',
  errNoStartDate: '⚠️ Выберите дату начала',
  errBadInterval: '⚠️ Интервал должен быть не менее 1 минуты',
  errNoTimeFrom: '⚠️ Укажите время начала',
  errNoTimeTo: '⚠️ Укажите время окончания',
  errNoDays: '⚠️ Выберите хотя бы один день',
  errBadDayNum: '⚠️ Укажите день месяца (1–31)',
  errNoTime: '⚠️ Укажите время уведомления',
  errPeriodNMin: '⚠️ Интервал должен быть не менее 1',
  okAdded: '✅ Напоминание добавлено',
  okUpdated: '✅ Напоминание обновлено',

  ruleEvery: (n, unit) => `${n === 1 ? 'Каждый' : 'Каждые'} ${n} ${unit}`,
  ruleAt: (time) => `в ${time}`,
  ruleInterval: (mins, f, t) => `каждые ${mins} мин (${f}-${t})`,

  settingsH2: '⏰ Simple Reminder',
  mobileH3: '📱 Мобильные устройства (iOS / Android)',
  mobileBody:
    '⚠️ На мобильных устройствах системные уведомления работают ТОЛЬКО пока приложение Obsidian открыто и активно на экране.',
  secManagement: 'Управление',
  openPanelName: 'Открыть панель напоминаний',
  openPanelDesc: 'Открывает боковую панель со списком напоминаний',
  openPanelBtn: 'Открыть',
  checkIntervalName: 'Интервал проверки (секунды)',
  checkIntervalDesc: 'Как часто плагин проверяет наступившие напоминания. Минимум: 2 секунды.',
  languageName: 'Язык',
  languageDesc: '«Авто» определяет язык по системным настройкам.',
  langAuto: 'Авто (системный)',
  langEn: 'English',
  langRu: 'Русский',
  testName: 'Тестовое уведомление',
  testDesc: 'Отправить тестовое системное уведомление',
  testBtn: 'Проверить',
  reqPermName: 'Запросить разрешение на уведомления',
  reqPermDesc: 'Повторно запросить разрешение на показ уведомлений',
  reqPermBtn: 'Запросить',
  deleteAllName: 'Удалить все напоминания',
  deleteAllDesc: 'Безвозвратно удалить весь список',
  deleteAllBtn: 'Удалить все',
  secStats: 'Статистика',
  statTotal: 'Всего',
  statActive: 'Активных',
  statDone: 'Выполнено (✓)',
  secAbout: 'О плагине',
  aboutText: (s) => `Simple Reminder v1.1.0 — проверка каждые ${s} сек.`,
  okAllDeleted: '🗑️ Все напоминания удалены',
  testBody: '⏰ Тестовое уведомление работает! 🎉',
  testFallback: '⏰ Тест (Notification API недоступен)',
  okPermGranted: '✅ Разрешение на уведомления получено',
  warnPermDenied: '⚠️ Разрешение отклонено. Проверьте настройки системы.',
  warnPermBlocked: '⚠️ Уведомления заблокированы. Проверьте настройки.',
  okPermAlready: '✅ Уведомления уже разрешены',
  remindBeforePrefix: '⏰ Скоро напоминание:',
  deleteConfirm: 'Удалить это напоминание?',
  confirmYes: 'Да',
  confirmNo: 'Нет',

  calendarBtn: '📅 Календарь',
  calendarBack: 'Назад',
  calendarRemindersFor: 'Напоминания на',
  calendarNoReminders: 'На этот день нет напоминаний',
};

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
