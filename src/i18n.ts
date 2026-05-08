import { Language } from './types';

export interface Strings {
  // ── view ──────────────────────────────────────────────────────────
  pluginName:      string;
  addBtn:          string;
  statActiveLabel: string;
  statDoneLabel:   string;
  noReminders:     string;
  noRemindersHint: string;
  tagOnce:         string;
  tagRepeat:       string;
  tagCalendar:     string;
  tagPeriodic:     string;
  nextLabel:       string;
  alreadyFired:    string;
  endsLabel:       string;
  daysShort:       string[];   // [Sun…Sat]
  monthsShort:     string[];   // [Jan…Dec]
  deleteAriaLabel: string;
  editAriaLabel:   string;
  // calendar summaries
  calSummaryDay(time: string): string;
  calSummaryWeek(days: string, time: string): string;
  calSummaryMonth(dayNum: number, time: string): string;
  calSummaryYear(dayNum: number, month: string, time: string): string;
  // periodic summaries
  sumPeriodicDay(n: number, date: string, time: string): string;
  sumPeriodicWeek(n: number, week: number, year: number, time: string): string;
  sumPeriodicMonth(n: number, month: string, year: number, time: string): string;
  sumPeriodicYear(n: number, year: number, time: string): string;
  // ── modal ─────────────────────────────────────────────────────────
  modalTitle:           string;
  modalEditTitle:       string;
  fieldName:            string;
  fieldNamePlaceholder: string;
  sectionType:          string;
  typeOnce:             string;
  typeRepeat:           string;
  typeCalendar:         string;
  typePeriodic:         string;
  // repeat
  sectionRepeat:        string;
  fieldIntervalUnit:    string;
  sectionConstraints:   string;
  toggleStartDate:      string;
  toggleEndDate:        string;
  toggleTimeWindow:     string;
  toggleDaysOfWeek:     string;
  fieldDateTime:        string;
  fieldStartDate:       string;
  fieldEndDate:         string;
  fieldTimeFrom:        string;
  fieldTimeTo:          string;
  daysOfWeekFull:       string[];
  // calendar
  calUnit:              string;
  calUnitDay:           string;
  calUnitWeek:          string;
  calUnitMonth:         string;
  calUnitYear:          string;
  calTime:              string;
  calDayOfWeek:         string;
  calDayOfMonth:        string;
  calMonthLabel:        string;
  monthsFull:           string[];
  // periodic
  periodicEvery:        string;
  periodicUnitLabels:   string[];   // ["дней","недель","месяцев","лет"] / ["days","weeks","months","years"]
  periodicUnitShort:    string[];   // for pills: ["день","неделю","месяц","год"]
  periodicFrom:         string;
  periodicTimeLabel:    string;
  periodicWeekHint(week: number, year: number): string;
  periodicMonthHint(month: string, year: number): string;
  // buttons
  saveBtn:    string;
  updateBtn:  string;
  cancelBtn:  string;
  // ── notices ───────────────────────────────────────────────────────
  errNoTitle:       string;
  errNoDate:        string;
  errBadDate:       string;
  errNoStartDate:   string;
  errBadInterval:   string;
  errNoTimeFrom:    string;
  errNoTimeTo:      string;
  errNoDays:        string;
  errNoCalTime:     string;
  errNoCalDay:      string;
  errNoCalDayNum:   string;
  errNoCalMonth:    string;
  errNoPeriodN:     string;
  errPeriodNMin:    string;
  errNoPeriodStart: string;
  okAdded:          string;
  okUpdated:        string;
  okAllDeleted:     string;
  okPermGranted:    string;
  warnPermDenied:   string;
  okPermAlready:    string;
  testBody:         string;
  testFallback:     string;
  warnPermBlocked:  string;
  // ── settings ──────────────────────────────────────────────────────
  settingsH2:        string;
  mobileH3:          string;
  mobileBody:        string;
  secManagement:     string;
  openPanelName:     string;
  openPanelDesc:     string;
  openPanelBtn:      string;
  checkIntervalName: string;
  checkIntervalDesc: string;
  languageName:      string;
  languageDesc:      string;
  langAuto:          string;
  langEn:            string;
  langRu:            string;
  testName:          string;
  testDesc:          string;
  testBtn:           string;
  reqPermName:       string;
  reqPermDesc:       string;
  reqPermBtn:        string;
  deleteAllName:     string;
  deleteAllDesc:     string;
  deleteAllBtn:      string;
  secStats:          string;
  statTotal:         string;
  statActive:        string;
  statDone:          string;
  secAbout:          string;
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
  tagCalendar:     '🗓 Calendar',
  tagPeriodic:     '📆 Periodic',
  nextLabel:       'Next:',
  alreadyFired:    '✅ Already fired',
  endsLabel:       'Until:',
  daysShort:       ['Su','Mo','Tu','We','Th','Fr','Sa'],
  monthsShort:     ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  deleteAriaLabel: 'Delete',
  editAriaLabel:   'Edit',
  calSummaryDay:   t               => `Every day at ${t}`,
  calSummaryWeek:  (days, t)       => `Every week: ${days} at ${t}`,
  calSummaryMonth: (d, t)          => `Every month on the ${d}th at ${t}`,
  calSummaryYear:  (d, m, t)       => `Every year on ${m} ${d} at ${t}`,
  sumPeriodicDay:   (n, d, t)      => `Every ${n} day${n>1?'s':''} from ${d} at ${t}`,
  sumPeriodicWeek:  (n, w, y, t)   => `Every ${n} week${n>1?'s':''} from week ${w}, ${y} at ${t}`,
  sumPeriodicMonth: (n, m, y, t)   => `Every ${n} month${n>1?'s':''} from ${m} ${y} at ${t}`,
  sumPeriodicYear:  (n, y, t)      => `Every ${n} year${n>1?'s':''} from ${y} at ${t}`,

  modalTitle:           'New Reminder',
  modalEditTitle:       'Edit Reminder',
  fieldName:            'Task name',
  fieldNamePlaceholder: 'e.g. Drink water',
  sectionType:          'Type',
  typeOnce:             '📅  Once — specific date & time',
  typeRepeat:           '🔁  Repeat — flexible schedule',
  typeCalendar:         '🗓  Calendar — daily / weekly / monthly / yearly',
  typePeriodic:         '📆  Periodic — every N days / weeks / months / years',

  sectionRepeat:      'Repeat every',
  fieldIntervalUnit:  'min.',
  sectionConstraints: 'Constraints (optional)',
  toggleStartDate:    '📅 Start from a date',
  toggleEndDate:      '🔚 End on a date',
  toggleTimeWindow:   '🕐 Active time window',
  toggleDaysOfWeek:   '📆 Days of the week',
  fieldDateTime:      'Date and time',
  fieldStartDate:     'Start date and time',
  fieldEndDate:       'End date and time',
  fieldTimeFrom:      'From',
  fieldTimeTo:        'To',
  daysOfWeekFull:     ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],

  calUnit:        'Repeat',
  calUnitDay:     'Every day',
  calUnitWeek:    'Every week',
  calUnitMonth:   'Every month',
  calUnitYear:    'Every year',
  calTime:        'At time',
  calDayOfWeek:   'Day of week',
  calDayOfMonth:  'Day of month',
  calMonthLabel:  'Month',
  monthsFull:     ['January','February','March','April','May','June',
                   'July','August','September','October','November','December'],

  periodicEvery:      'Every',
  periodicUnitLabels: ['days','weeks','months','years'],
  periodicUnitShort:  ['Day','Week','Month','Year'],
  periodicFrom:       'Starting from',
  periodicTimeLabel:  'At time',
  periodicWeekHint:   (w, y) => `Week ${w}, ${y}`,
  periodicMonthHint:  (m, y) => `${m} ${y}`,

  saveBtn:   'Save',
  updateBtn: 'Update',
  cancelBtn: 'Cancel',

  errNoTitle:       '⚠️ Enter a reminder title',
  errNoDate:        '⚠️ Select date and time',
  errBadDate:       '⚠️ Invalid date',
  errNoStartDate:   '⚠️ Select a start date',
  errBadInterval:   '⚠️ Interval must be at least 1 minute',
  errNoTimeFrom:    '⚠️ Enter start time',
  errNoTimeTo:      '⚠️ Enter end time',
  errNoDays:        '⚠️ Select at least one day',
  errNoCalTime:     '⚠️ Enter notification time',
  errNoCalDay:      '⚠️ Select at least one day of the week',
  errNoCalDayNum:   '⚠️ Enter a day of the month (1–31)',
  errNoCalMonth:    '⚠️ Select a month',
  errNoPeriodN:     '⚠️ Enter interval value',
  errPeriodNMin:    '⚠️ Interval must be at least 1',
  errNoPeriodStart: '⚠️ Select a start date',
  okAdded:          '✅ Reminder added',
  okUpdated:        '✅ Reminder updated',
  okAllDeleted:     '🗑️ All reminders deleted',
  okPermGranted:    '✅ Notification permission granted',
  warnPermDenied:   '⚠️ Permission denied. Check system settings.',
  okPermAlready:    '✅ Notifications already allowed',
  testBody:         '⏰ Test notification works! 🎉',
  testFallback:     '⏰ Test (Notification API unavailable — showing Notice)',
  warnPermBlocked:  '⚠️ Notifications blocked. Check system / browser settings.',

  settingsH2:        '⏰ Simple Reminder',
  mobileH3:          '📱 Mobile devices (iOS / Android)',
  mobileBody:        '⚠️ On mobile devices, system notifications work ONLY while the Obsidian app is open and active on screen. If the app is minimised or the screen is locked — notifications will not appear.',
  secManagement:     'Management',
  openPanelName:     'Open reminder panel',
  openPanelDesc:     'Opens the side panel with the reminder list',
  openPanelBtn:      'Open',
  checkIntervalName: 'Check interval (seconds)',
  checkIntervalDesc: 'How often the plugin checks for due reminders. Minimum: 2 seconds.',
  languageName:      'Language',
  languageDesc:      '"Auto" detects the language from your system settings.',
  langAuto:          'Auto (system)',
  langEn:            'English',
  langRu:            'Русский',
  testName:          'Test notification',
  testDesc:          'Send a test system notification',
  testBtn:           'Test',
  reqPermName:       'Request notification permission',
  reqPermDesc:       'Re-request system permission to display notifications',
  reqPermBtn:        'Request',
  deleteAllName:     'Delete all reminders',
  deleteAllDesc:     'Permanently delete the entire reminder list',
  deleteAllBtn:      'Delete all',
  secStats:          'Statistics',
  statTotal:         'Total',
  statActive:        'Active',
  statDone:          'Done (✓)',
  secAbout:          'About',
  aboutText: s => `Simple Reminder v1.0.0 — checked every ${s}s.`,
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
  tagCalendar:     '🗓 Календарь',
  tagPeriodic:     '📆 Периодически',
  nextLabel:       'Следующее:',
  alreadyFired:    '✅ Уже сработало',
  endsLabel:       'До:',
  daysShort:       ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
  monthsShort:     ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'],
  deleteAriaLabel: 'Удалить',
  editAriaLabel:   'Редактировать',
  calSummaryDay:   t               => `Каждый день в ${t}`,
  calSummaryWeek:  (days, t)       => `Каждую неделю: ${days} в ${t}`,
  calSummaryMonth: (d, t)          => `Каждый месяц, ${d}-го в ${t}`,
  calSummaryYear:  (d, m, t)       => `Каждый год, ${d} ${m} в ${t}`,
  sumPeriodicDay:   (n, d, t)      => `Каждые ${n} дн. с ${d} в ${t}`,
  sumPeriodicWeek:  (n, w, y, t)   => `Каждые ${n} нед. с нед. ${w}, ${y} в ${t}`,
  sumPeriodicMonth: (n, m, y, t)   => `Каждые ${n} мес. с ${m} ${y} в ${t}`,
  sumPeriodicYear:  (n, y, t)      => `Каждые ${n} лет с ${y} г. в ${t}`,

  modalTitle:           'Новое напоминание',
  modalEditTitle:       'Редактировать напоминание',
  fieldName:            'Название задачи',
  fieldNamePlaceholder: 'Например: Выпить воды',
  sectionType:          'Тип',
  typeOnce:             '📅  Разово — конкретная дата и время',
  typeRepeat:           '🔁  Повторять — гибкое расписание',
  typeCalendar:         '🗓  Календарь — каждый день / неделю / месяц / год',
  typePeriodic:         '📆  Периодически — каждые N дней / недель / месяцев / лет',

  sectionRepeat:      'Повторять каждые',
  fieldIntervalUnit:  'мин.',
  sectionConstraints: 'Ограничения (необязательно)',
  toggleStartDate:    '📅 Начинать с даты',
  toggleEndDate:      '🔚 Заканчивать в дату',
  toggleTimeWindow:   '🕐 Активное время суток',
  toggleDaysOfWeek:   '📆 Дни недели',
  fieldDateTime:      'Дата и время',
  fieldStartDate:     'Дата и время начала',
  fieldEndDate:       'Дата и время окончания',
  fieldTimeFrom:      'С',
  fieldTimeTo:        'До',
  daysOfWeekFull:     ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'],

  calUnit:        'Повторять',
  calUnitDay:     'Каждый день',
  calUnitWeek:    'Каждую неделю',
  calUnitMonth:   'Каждый месяц',
  calUnitYear:    'Каждый год',
  calTime:        'Время уведомления',
  calDayOfWeek:   'День недели',
  calDayOfMonth:  'День месяца',
  calMonthLabel:  'Месяц',
  monthsFull:     ['Январь','Февраль','Март','Апрель','Май','Июнь',
                   'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],

  periodicEvery:      'Каждые',
  periodicUnitLabels: ['дней','недель','месяцев','лет'],
  periodicUnitShort:  ['День','Неделю','Месяц','Год'],
  periodicFrom:       'Начиная с',
  periodicTimeLabel:  'Время уведомления',
  periodicWeekHint:   (w, y) => `Неделя ${w}, ${y}`,
  periodicMonthHint:  (m, y) => `${m} ${y}`,

  saveBtn:   'Сохранить',
  updateBtn: 'Обновить',
  cancelBtn: 'Отмена',

  errNoTitle:       '⚠️ Введите название напоминания',
  errNoDate:        '⚠️ Выберите дату и время',
  errBadDate:       '⚠️ Некорректная дата',
  errNoStartDate:   '⚠️ Выберите дату начала',
  errBadInterval:   '⚠️ Интервал должен быть не менее 1 минуты',
  errNoTimeFrom:    '⚠️ Укажите время начала',
  errNoTimeTo:      '⚠️ Укажите время окончания',
  errNoDays:        '⚠️ Выберите хотя бы один день',
  errNoCalTime:     '⚠️ Укажите время уведомления',
  errNoCalDay:      '⚠️ Выберите хотя бы один день недели',
  errNoCalDayNum:   '⚠️ Укажите день месяца (1–31)',
  errNoCalMonth:    '⚠️ Выберите месяц',
  errNoPeriodN:     '⚠️ Укажите значение интервала',
  errPeriodNMin:    '⚠️ Интервал должен быть не менее 1',
  errNoPeriodStart: '⚠️ Выберите дату начала',
  okAdded:          '✅ Напоминание добавлено',
  okUpdated:        '✅ Напоминание обновлено',
  okAllDeleted:     '🗑️ Все напоминания удалены',
  okPermGranted:    '✅ Разрешение на уведомления получено',
  warnPermDenied:   '⚠️ Разрешение отклонено. Проверьте настройки системы.',
  okPermAlready:    '✅ Уведомления уже разрешены',
  testBody:         '⏰ Тестовое уведомление работает! 🎉',
  testFallback:     '⏰ Тест (Notification API недоступен)',
  warnPermBlocked:  '⚠️ Уведомления заблокированы. Проверьте настройки.',

  settingsH2:        '⏰ Simple Reminder',
  mobileH3:          '📱 Мобильные устройства (iOS / Android)',
  mobileBody:        '⚠️ На мобильных устройствах системные уведомления работают ТОЛЬКО пока приложение Obsidian открыто и активно на экране.',
  secManagement:     'Управление',
  openPanelName:     'Открыть панель напоминаний',
  openPanelDesc:     'Открывает боковую панель со списком напоминаний',
  openPanelBtn:      'Открыть',
  checkIntervalName: 'Интервал проверки (секунды)',
  checkIntervalDesc: 'Как часто плагин проверяет наступившие напоминания. Минимум: 2 секунды.',
  languageName:      'Язык',
  languageDesc:      '«Авто» определяет язык по системным настройкам.',
  langAuto:          'Авто (системный)',
  langEn:            'English',
  langRu:            'Русский',
  testName:          'Тестовое уведомление',
  testDesc:          'Отправить тестовое системное уведомление',
  testBtn:           'Проверить',
  reqPermName:       'Запросить разрешение на уведомления',
  reqPermDesc:       'Повторно запросить разрешение на показ уведомлений',
  reqPermBtn:        'Запросить',
  deleteAllName:     'Удалить все напоминания',
  deleteAllDesc:     'Безвозвратно удалить весь список',
  deleteAllBtn:      'Удалить все',
  secStats:          'Статистика',
  statTotal:         'Всего',
  statActive:        'Активных',
  statDone:          'Выполнено (✓)',
  secAbout:          'О плагине',
  aboutText: s => `Simple Reminder v1.0.0 — проверка каждые ${s} сек.`,
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
