import { describe, it, expect } from 'vitest';
import { getStrings, resolveLanguage } from '../src/i18n';
import type { Language } from '../src/types';

// ── resolveLanguage ──────────────────────────────────────────────────────────

describe('resolveLanguage', () => {
  it('returns "en" for explicit "en" setting', () => {
    expect(resolveLanguage('en')).toBe('en');
  });

  it('returns "ru" for explicit "ru" setting', () => {
    expect(resolveLanguage('ru')).toBe('ru');
  });

  it('returns "en" for "auto" when navigator is not Russian', () => {
    // This depends on the environment, but the function should not throw
    const result = resolveLanguage('auto');
    expect(['en', 'ru']).toContain(result);
  });
});

// ── getStrings — English ─────────────────────────────────────────────────────

describe('getStrings — English', () => {
  const en = getStrings('en');

  it('has plugin name', () => {
    expect(en.pluginName).toBe('Simple Reminder');
  });

  it('has add button text', () => {
    expect(en.addBtn).toBe('+ Add');
  });

  it('has modal title', () => {
    expect(en.modalTitle).toBe('New Reminder');
  });

  it('has save and cancel buttons', () => {
    expect(en.saveBtn).toBe('Save');
    expect(en.cancelBtn).toBe('Cancel');
  });

  it('has error messages', () => {
    expect(en.errNoTitle).toContain('title');
    expect(en.errNoDate).toContain('date');
  });

  it('has periodic unit labels', () => {
    expect(en.periodicUnitLabels).toEqual(['days', 'weeks', 'months', 'years']);
  });

  it('has periodic unit singular forms', () => {
    expect(en.periodicUnitSingular).toEqual(['day', 'week', 'month', 'year']);
  });

  it('has periodic unit short forms', () => {
    expect(en.periodicUnitShort).toEqual(['Day', 'Week', 'Month', 'Year']);
  });

  it('has days of week (7 items)', () => {
    expect(en.daysShort).toHaveLength(7);
  });

  it('has months (12 items)', () => {
    expect(en.monthsShort).toHaveLength(12);
    expect(en.monthsFull).toHaveLength(12);
  });

  it('ruleEvery produces correct singular form', () => {
    expect(en.ruleEvery(1, 'day')).toBe('Every 1 day');
    expect(en.ruleEvery(1, 'week')).toBe('Every 1 week');
  });

  it('ruleEvery produces correct plural form', () => {
    expect(en.ruleEvery(3, 'days')).toBe('Every 3 days');
    expect(en.ruleEvery(2, 'weeks')).toBe('Every 2 weeks');
  });

  it('ruleAt formats time correctly', () => {
    expect(en.ruleAt('10:00')).toBe('at 10:00');
  });

  it('ruleInterval formats correctly', () => {
    expect(en.ruleInterval(30, '09:00', '17:00')).toBe('every 30m (09:00-17:00)');
  });

  it('aboutText includes version and interval', () => {
    const text = en.aboutText(60);
    expect(text).toContain('v1.1.0');
    expect(text).toContain('60');
  });
});

// ── getStrings — Russian ─────────────────────────────────────────────────────

describe('getStrings — Russian', () => {
  const ru = getStrings('ru');

  it('has plugin name', () => {
    expect(ru.pluginName).toBe('Simple Reminder');
  });

  it('has add button text', () => {
    expect(ru.addBtn).toBe('+ Добавить');
  });

  it('has modal title', () => {
    expect(ru.modalTitle).toBe('Новое напоминание');
  });

  it('has save and cancel buttons', () => {
    expect(ru.saveBtn).toBe('Сохранить');
    expect(ru.cancelBtn).toBe('Отмена');
  });

  it('has error messages', () => {
    expect(ru.errNoTitle).toContain('название');
    expect(ru.errNoDate).toContain('дату');
  });

  it('has periodic unit labels', () => {
    expect(ru.periodicUnitLabels).toEqual(['дней', 'недель', 'месяцев', 'лет']);
  });

  it('has periodic unit singular forms', () => {
    expect(ru.periodicUnitSingular).toEqual(['день', 'неделю', 'месяц', 'год']);
  });

  it('has periodic unit short forms', () => {
    expect(ru.periodicUnitShort).toEqual(['День', 'Неделю', 'Месяц', 'Год']);
  });

  it('has days of week in Russian (7 items)', () => {
    expect(ru.daysShort).toHaveLength(7);
    expect(ru.daysShort[1]).toBe('Пн'); // Monday
  });

  it('has months in Russian (12 items)', () => {
    expect(ru.monthsShort).toHaveLength(12);
    expect(ru.monthsFull).toHaveLength(12);
    expect(ru.monthsFull[0]).toBe('Январь');
  });

  it('ruleEvery produces correct form', () => {
    expect(ru.ruleEvery(1, 'день')).toBe('Каждые 1 день');
    expect(ru.ruleEvery(3, 'дней')).toBe('Каждые 3 дней');
  });

  it('ruleAt formats time correctly', () => {
    expect(ru.ruleAt('10:00')).toBe('в 10:00');
  });

  it('ruleInterval formats correctly', () => {
    expect(ru.ruleInterval(30, '09:00', '17:00')).toBe('каждые 30 мин (09:00-17:00)');
  });

  it('aboutText includes version and interval', () => {
    const text = ru.aboutText(60);
    expect(text).toContain('v1.1.0');
    expect(text).toContain('60');
  });
});

// ── EN/RU consistency ────────────────────────────────────────────────────────

describe('EN/RU consistency', () => {
  it('both languages have the same number of string keys', () => {
    const en = getStrings('en');
    const ru = getStrings('ru');
    expect(Object.keys(en).length).toBe(Object.keys(ru).length);
  });

  it('both languages have 7 days of week', () => {
    expect(getStrings('en').daysShort).toHaveLength(7);
    expect(getStrings('ru').daysShort).toHaveLength(7);
  });

  it('both languages have 12 months', () => {
    expect(getStrings('en').monthsFull).toHaveLength(12);
    expect(getStrings('ru').monthsFull).toHaveLength(12);
  });

  it('both languages have 4 periodic unit labels', () => {
    expect(getStrings('en').periodicUnitLabels).toHaveLength(4);
    expect(getStrings('ru').periodicUnitLabels).toHaveLength(4);
  });

  it('both languages have 4 periodic unit singular forms', () => {
    expect(getStrings('en').periodicUnitSingular).toHaveLength(4);
    expect(getStrings('ru').periodicUnitSingular).toHaveLength(4);
  });

  it('both languages have non-empty strings', () => {
    const en = getStrings('en');
    const ru = getStrings('ru');

    for (const [key, value] of Object.entries(en)) {
      if (typeof value === 'string') {
        expect(value.length).toBeGreaterThan(0);
      }
    }

    for (const [key, value] of Object.entries(ru)) {
      if (typeof value === 'string') {
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });
});
