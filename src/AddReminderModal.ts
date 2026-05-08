import { App, Modal, Notice } from 'obsidian';
import type SimpleReminderPlugin from './main';
import { CalendarUnit, PeriodicUnit, Reminder } from './types';
import { generateId, calcNextTrigger, calcNextCalendarTrigger, calcNextPeriodicTrigger, isoWeekNumber, mondayOf } from './utils';
import { Strings } from './i18n';

type ReminderMode = 'once' | 'repeat' | 'calendar' | 'periodic';

interface FormData {
  title:         string;
  mode:          ReminderMode;
  // once
  specificDate:  string;
  // repeat
  interval:      number;
  useStartDate:  boolean;
  useEndDate:    boolean;
  useTimeWindow: boolean;
  useDaysOfWeek: boolean;
  startDate:     string;
  endDate:       string;
  timeFrom:      string;
  timeTo:        string;
  daysOfWeek:    boolean[];    // 0=Sun…6=Sat
  // calendar
  calUnit:       CalendarUnit;
  calTime:       string;
  calDaysOfWeek: boolean[];    // multi-select
  calDayOfMonth: number;
  calMonth:      number;
  // periodic
  perUnit:       PeriodicUnit;
  perN:          number;
  perTime:       string;
  perStart:      string;       // date string for input[type=date]
}

function tsToLocal(ts: number): string {
  const d = new Date(ts), pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function tsToDate(ts: number): string {
  const d = new Date(ts), pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function todayStr(): string { return tsToDate(Date.now()); }

function reminderToFD(r: Reminder): FormData {
  return {
    title:         r.title,
    mode:          r.type === 'specific' ? 'once'
                 : r.type === 'calendar' ? 'calendar'
                 : r.type === 'periodic' ? 'periodic'
                 : 'repeat',
    specificDate:  r.specificTs  ? tsToLocal(r.specificTs) : '',
    interval:      r.interval || 15,
    useStartDate:  !!r.startTs,
    useEndDate:    !!r.endTs,
    useTimeWindow: !!(r.timeWindowStart && r.timeWindowEnd),
    useDaysOfWeek: !!(r.daysOfWeek && r.daysOfWeek.length > 0),
    startDate:     r.startTs ? tsToLocal(r.startTs) : '',
    endDate:       r.endTs   ? tsToLocal(r.endTs)   : '',
    timeFrom:      r.timeWindowStart ?? '09:00',
    timeTo:        r.timeWindowEnd   ?? '18:00',
    daysOfWeek:    Array.from({ length: 7 }, (_, i) =>
                     Array.isArray(r.daysOfWeek) ? r.daysOfWeek.includes(i) : false),
    calUnit:       r.calendarUnit       ?? 'day',
    calTime:       r.calendarTime       ?? '09:00',
    calDaysOfWeek: Array.from({ length: 7 }, (_, i) =>
                     Array.isArray(r.calendarDayOfWeek) ? r.calendarDayOfWeek.includes(i) : false),
    calDayOfMonth: r.calendarDayOfMonth ?? 1,
    calMonth:      r.calendarMonth      ?? 0,
    perUnit:       r.periodicUnit  ?? 'day',
    perN:          r.periodicN     ?? 1,
    perTime:       r.periodicTime  ?? '09:00',
    perStart:      r.periodicStart ? tsToDate(r.periodicStart) : todayStr(),
  };
}

function defaultFD(): FormData {
  const now = new Date();
  return {
    title: '', mode: 'repeat', specificDate: '',
    interval: 15,
    useStartDate: false, useEndDate: false, useTimeWindow: false, useDaysOfWeek: false,
    startDate: '', endDate: '', timeFrom: '09:00', timeTo: '18:00',
    daysOfWeek: [false, true, true, true, true, true, false],
    calUnit: 'day', calTime: '09:00',
    calDaysOfWeek: [false, true, false, false, false, false, false],
    calDayOfMonth: 1, calMonth: 0,
    perUnit: 'day', perN: 1, perTime: '09:00',
    perStart: todayStr(),
  };
}

export class AddReminderModal extends Modal {
  private plugin:   SimpleReminderPlugin;
  private onSave:   () => void;
  private existing: Reminder | null;
  private fd:       FormData;
  private bodyEl!:  HTMLElement;

  constructor(app: App, plugin: SimpleReminderPlugin, onSave: () => void, existing?: Reminder | null) {
    super(app);
    this.plugin   = plugin;
    this.onSave   = onSave;
    this.existing = existing ?? null;
    this.fd       = existing ? reminderToFD(existing) : defaultFD();
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass('sr-modal');
    const t = this.plugin.t, isEdit = this.existing !== null;
    const hdr = contentEl.createDiv('sr-modal-header');
    hdr.createSpan({ cls: 'sr-modal-icon', text: isEdit ? '✏️' : '➕' });
    hdr.createEl('h3', { cls: 'sr-modal-title', text: isEdit ? t.modalEditTitle : t.modalTitle });
    this.buildForm(contentEl.createDiv('sr-modal-form'), t, isEdit);
  }

  onClose(): void { this.contentEl.empty(); }

  // ── Form ───────────────────────────────────────────────────────────────────

  private buildForm(form: HTMLElement, t: Strings, isEdit: boolean): void {
    // Title
    const g1 = form.createDiv('sr-field-group');
    g1.createEl('label', { cls: 'sr-label', text: t.fieldName });
    const ti = g1.createEl('input', { cls: 'sr-input', type: 'text', placeholder: t.fieldNamePlaceholder });
    ti.value = this.fd.title;
    ti.addEventListener('input',   e => { this.fd.title = (e.target as HTMLInputElement).value; });
    ti.addEventListener('keydown', e => { if (e.key === 'Enter') this.submit(isEdit); });
    setTimeout(() => ti.focus(), 50);

    // Mode selector — 4 cards
    const g2 = form.createDiv('sr-field-group');
    g2.createEl('label', { cls: 'sr-label', text: t.sectionType });
    const typeRow = g2.createDiv('sr-type-row');
    const modes: [ReminderMode, string][] = [
      ['once',     t.typeOnce],
      ['repeat',   t.typeRepeat],
      ['calendar', t.typeCalendar],
      ['periodic', t.typePeriodic],
    ];
    modes.forEach(([mode, label], idx) => {
      const lbl = typeRow.createEl('label', {
        cls: 'sr-type-btn' + (this.fd.mode === mode ? ' sr-type-btn--active' : ''),
      });
      const radio = lbl.createEl('input', { type: 'radio' });
      radio.name = 'sr-mode'; radio.value = mode; radio.checked = this.fd.mode === mode;
      lbl.createSpan({ text: label });
      radio.addEventListener('change', () => {
        this.fd.mode = mode;
        typeRow.querySelectorAll<HTMLElement>('.sr-type-btn').forEach((el, i) =>
          el.classList.toggle('sr-type-btn--active', i === idx));
        this.buildBody(t);
      });
    });

    this.bodyEl = form.createDiv('sr-modal-body');
    this.buildBody(t);

    const btnRow = form.createDiv('sr-btn-row');
    btnRow.createEl('button', { cls: 'sr-save-btn',   text: isEdit ? t.updateBtn : t.saveBtn })
          .addEventListener('click', () => this.submit(isEdit));
    btnRow.createEl('button', { cls: 'sr-cancel-btn', text: t.cancelBtn })
          .addEventListener('click', () => this.close());
  }

  private buildBody(t: Strings): void {
    this.bodyEl.empty();
    if      (this.fd.mode === 'once')     this.buildOnceBody(this.bodyEl, t);
    else if (this.fd.mode === 'repeat')   this.buildRepeatBody(this.bodyEl, t);
    else if (this.fd.mode === 'calendar') this.buildCalendarBody(this.bodyEl, t);
    else                                  this.buildPeriodicBody(this.bodyEl, t);
  }

  // ── Once ───────────────────────────────────────────────────────────────────

  private buildOnceBody(body: HTMLElement, t: Strings): void {
    const g = body.createDiv('sr-field-group');
    g.createEl('label', { cls: 'sr-label', text: t.fieldDateTime });
    const inp = g.createEl('input', { cls: 'sr-input', type: 'datetime-local' });
    if (this.fd.specificDate) inp.value = this.fd.specificDate;
    inp.addEventListener('change', e => { this.fd.specificDate = (e.target as HTMLInputElement).value; });
  }

  // ── Repeat ─────────────────────────────────────────────────────────────────

  private buildRepeatBody(body: HTMLElement, t: Strings): void {
    const row = body.createDiv('sr-interval-row');
    row.createEl('label', { cls: 'sr-label sr-label--inline', text: t.sectionRepeat });
    const inp = row.createEl('input', { cls: 'sr-input sr-input--short', type: 'number' });
    inp.min = '1'; inp.value = String(this.fd.interval);
    inp.addEventListener('input', e => {
      const v = parseInt((e.target as HTMLInputElement).value, 10);
      this.fd.interval = Math.max(1, isNaN(v) ? 1 : v);
    });
    row.createEl('span', { cls: 'sr-interval-unit', text: t.fieldIntervalUnit });

    const section = body.createDiv('sr-constraints-section');
    section.createEl('div', { cls: 'sr-constraints-title', text: t.sectionConstraints });
    const list = section.createDiv('sr-constraints-list');
    this.addToggle(list, t.toggleStartDate,   'useStartDate',   c => this.buildStartDate(c, t));
    this.addToggle(list, t.toggleEndDate,     'useEndDate',     c => this.buildEndDate(c, t));
    this.addToggle(list, t.toggleTimeWindow,  'useTimeWindow',  c => this.buildTimeWindow(c, t));
    this.addToggle(list, t.toggleDaysOfWeek,  'useDaysOfWeek',  c => this.buildDaysOfWeek(c, t));
  }

  // ── Calendar ───────────────────────────────────────────────────────────────

  private buildCalendarBody(body: HTMLElement, t: Strings): void {
    const card = body.createDiv('sr-cal-card');
    const ug = card.createDiv('sr-field-group');
    ug.createEl('label', { cls: 'sr-label', text: t.calUnit });
    const unitRow = ug.createDiv('sr-cal-unit-row');
    const dynArea = card.createDiv('sr-cal-dynamic');
    const units: [CalendarUnit, string][] = [
      ['day', t.calUnitDay], ['week', t.calUnitWeek],
      ['month', t.calUnitMonth], ['year', t.calUnitYear],
    ];
    units.forEach(([unit, label], idx) => {
      const btn = unitRow.createEl('button', {
        cls: 'sr-unit-btn' + (this.fd.calUnit === unit ? ' sr-unit-btn--active' : ''),
        text: label, type: 'button',
      });
      btn.addEventListener('click', () => {
        this.fd.calUnit = unit;
        unitRow.querySelectorAll<HTMLElement>('.sr-unit-btn').forEach((el, i) =>
          el.classList.toggle('sr-unit-btn--active', i === idx));
        this.buildCalendarDynamic(dynArea, t);
      });
    });
    this.buildCalendarDynamic(dynArea, t);
  }

  private buildCalendarDynamic(area: HTMLElement, t: Strings): void {
    area.empty();
    const unit = this.fd.calUnit;

    if (unit === 'week') {
      const g = area.createDiv('sr-field-group');
      g.createEl('label', { cls: 'sr-label', text: t.calDayOfWeek });
      const wrap = g.createDiv('sr-days-wrap');
      t.daysShort.forEach((name, idx) => {
        const btn = wrap.createEl('button', {
          cls: 'sr-day-btn' + (this.fd.calDaysOfWeek[idx] ? ' sr-day-btn--active' : ''),
          text: name, type: 'button',
        });
        btn.addEventListener('click', () => {
          this.fd.calDaysOfWeek[idx] = !this.fd.calDaysOfWeek[idx];
          btn.classList.toggle('sr-day-btn--active', this.fd.calDaysOfWeek[idx]);
        });
      });
    }

    if (unit === 'month' || unit === 'year') {
      const g = area.createDiv('sr-field-group');
      g.createEl('label', { cls: 'sr-label', text: t.calDayOfMonth });
      const inp = g.createEl('input', { cls: 'sr-input sr-input--short', type: 'number' });
      inp.min = '1'; inp.max = '31'; inp.value = String(this.fd.calDayOfMonth);
      inp.addEventListener('input', e => {
        const v = parseInt((e.target as HTMLInputElement).value, 10);
        this.fd.calDayOfMonth = Math.min(31, Math.max(1, isNaN(v) ? 1 : v));
      });
    }

    if (unit === 'year') {
      const g = area.createDiv('sr-field-group');
      g.createEl('label', { cls: 'sr-label', text: t.calMonthLabel });
      const sel = g.createEl('select', { cls: 'sr-select' });
      t.monthsFull.forEach((name, idx) => {
        const opt = sel.createEl('option', { text: name });
        opt.value = String(idx);
        if (idx === this.fd.calMonth) opt.selected = true;
      });
      sel.addEventListener('change', e => { this.fd.calMonth = parseInt((e.target as HTMLSelectElement).value, 10); });
    }

    const gTime = area.createDiv('sr-field-group');
    gTime.createEl('label', { cls: 'sr-label', text: t.calTime });
    const timeInp = gTime.createEl('input', { cls: 'sr-input sr-input--time', type: 'time' });
    timeInp.value = this.fd.calTime;
    timeInp.addEventListener('change', e => { this.fd.calTime = (e.target as HTMLInputElement).value; });
  }

  // ── Periodic ───────────────────────────────────────────────────────────────

  private buildPeriodicBody(body: HTMLElement, t: Strings): void {
    const card = body.createDiv('sr-cal-card');

    // Unit pills
    const ug = card.createDiv('sr-field-group');
    ug.createEl('label', { cls: 'sr-label', text: t.periodicEvery });
    const unitRow = ug.createDiv('sr-cal-unit-row');
    const dynArea = card.createDiv('sr-cal-dynamic');

    const units: PeriodicUnit[] = ['day', 'week', 'month', 'year'];
    units.forEach((unit, idx) => {
      const btn = unitRow.createEl('button', {
        cls:  'sr-unit-btn' + (this.fd.perUnit === unit ? ' sr-unit-btn--active' : ''),
        text: t.periodicUnitShort[idx],
        type: 'button',
      });
      btn.addEventListener('click', () => {
        this.fd.perUnit = unit;
        unitRow.querySelectorAll<HTMLElement>('.sr-unit-btn').forEach((el, i) =>
          el.classList.toggle('sr-unit-btn--active', i === idx));
        this.buildPeriodicDynamic(dynArea, t);
      });
    });

    this.buildPeriodicDynamic(dynArea, t);
  }

  private buildPeriodicDynamic(area: HTMLElement, t: Strings): void {
    area.empty();
    const unit   = this.fd.perUnit;
    const unitIdx = ['day','week','month','year'].indexOf(unit);

    // N input
    const nRow = area.createDiv('sr-interval-row');
    nRow.createEl('label', { cls: 'sr-label sr-label--inline', text: t.periodicEvery });
    const nInp = nRow.createEl('input', { cls: 'sr-input sr-input--short', type: 'number' });
    nInp.min = '1'; nInp.value = String(this.fd.perN);
    nInp.addEventListener('input', e => {
      const v = parseInt((e.target as HTMLInputElement).value, 10);
      this.fd.perN = Math.max(1, isNaN(v) ? 1 : v);
    });
    nRow.createEl('span', { cls: 'sr-interval-unit', text: t.periodicUnitLabels[unitIdx] });

    // Start date
    const gStart = area.createDiv('sr-field-group');
    gStart.createEl('label', { cls: 'sr-label', text: t.periodicFrom });

    const startInp = gStart.createEl('input', { cls: 'sr-input', type: 'date' });
    startInp.value = this.fd.perStart;

    // Helper label (week number or month name)
    const hint = gStart.createEl('div', { cls: 'sr-per-hint' });
    this.updatePeriodicHint(hint, this.fd.perStart, unit, t);

    startInp.addEventListener('change', e => {
      this.fd.perStart = (e.target as HTMLInputElement).value;
      this.updatePeriodicHint(hint, this.fd.perStart, unit, t);
    });

    // Time
    const gTime = area.createDiv('sr-field-group');
    gTime.createEl('label', { cls: 'sr-label', text: t.periodicTimeLabel });
    const timeInp = gTime.createEl('input', { cls: 'sr-input sr-input--time', type: 'time' });
    timeInp.value = this.fd.perTime;
    timeInp.addEventListener('change', e => { this.fd.perTime = (e.target as HTMLInputElement).value; });
  }

  private updatePeriodicHint(el: HTMLElement, dateStr: string, unit: PeriodicUnit, t: Strings): void {
    el.empty();
    if (!dateStr) return;
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return;

    if (unit === 'week') {
      el.setText(t.periodicWeekHint(isoWeekNumber(d), d.getFullYear()));
    } else if (unit === 'month') {
      el.setText(t.periodicMonthHint(t.monthsFull[d.getMonth()], d.getFullYear()));
    } else if (unit === 'year') {
      el.setText(String(d.getFullYear()));
    }
    // 'day' — no extra hint needed, the date itself is clear
  }

  // ── Toggle blocks ──────────────────────────────────────────────────────────

  private addToggle(
    parent: HTMLElement, label: string,
    fdKey: keyof Pick<FormData, 'useStartDate'|'useEndDate'|'useTimeWindow'|'useDaysOfWeek'>,
    buildContent: (c: HTMLElement) => void,
  ): void {
    const isActive = this.fd[fdKey] as boolean;
    const block    = parent.createDiv('sr-toggle-block' + (isActive ? ' sr-toggle-block--open' : ''));
    const header   = block.createDiv('sr-toggle-header');
    const cb       = header.createEl('input', { type: 'checkbox', cls: 'sr-toggle-check' });
    cb.checked = isActive;
    header.createSpan({ cls: 'sr-toggle-label', text: label });
    const content = block.createDiv('sr-toggle-content');
    if (isActive) buildContent(content);
    cb.addEventListener('change', () => {
      (this.fd as unknown as Record<string, boolean>)[fdKey] = cb.checked;
      block.classList.toggle('sr-toggle-block--open', cb.checked);
      content.empty();
      if (cb.checked) buildContent(content);
    });
  }

  private buildStartDate(c: HTMLElement, t: Strings): void {
    const g = c.createDiv('sr-field-group');
    g.createEl('label', { cls: 'sr-label', text: t.fieldStartDate });
    const inp = g.createEl('input', { cls: 'sr-input', type: 'datetime-local' });
    if (this.fd.startDate) inp.value = this.fd.startDate;
    inp.addEventListener('change', e => { this.fd.startDate = (e.target as HTMLInputElement).value; });
  }

  private buildEndDate(c: HTMLElement, t: Strings): void {
    const g = c.createDiv('sr-field-group');
    g.createEl('label', { cls: 'sr-label', text: t.fieldEndDate });
    const inp = g.createEl('input', { cls: 'sr-input', type: 'datetime-local' });
    if (this.fd.endDate) inp.value = this.fd.endDate;
    inp.addEventListener('change', e => { this.fd.endDate = (e.target as HTMLInputElement).value; });
  }

  private buildTimeWindow(c: HTMLElement, t: Strings): void {
    const row = c.createDiv('sr-time-row');
    const gF = row.createDiv('sr-field-group');
    gF.createEl('label', { cls: 'sr-label', text: t.fieldTimeFrom });
    const from = gF.createEl('input', { cls: 'sr-input sr-input--time', type: 'time' });
    from.value = this.fd.timeFrom;
    from.addEventListener('change', e => { this.fd.timeFrom = (e.target as HTMLInputElement).value; });
    const gT = row.createDiv('sr-field-group');
    gT.createEl('label', { cls: 'sr-label', text: t.fieldTimeTo });
    const to = gT.createEl('input', { cls: 'sr-input sr-input--time', type: 'time' });
    to.value = this.fd.timeTo;
    to.addEventListener('change', e => { this.fd.timeTo = (e.target as HTMLInputElement).value; });
  }

  private buildDaysOfWeek(c: HTMLElement, t: Strings): void {
    const wrap = c.createDiv('sr-days-wrap');
    this.fd.daysOfWeek.forEach((active, idx) => {
      const btn = wrap.createEl('button', {
        cls: 'sr-day-btn' + (active ? ' sr-day-btn--active' : ''),
        text: t.daysShort[idx], type: 'button',
      });
      btn.addEventListener('click', () => {
        this.fd.daysOfWeek[idx] = !this.fd.daysOfWeek[idx];
        btn.classList.toggle('sr-day-btn--active', this.fd.daysOfWeek[idx]);
      });
    });
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  private submit(isEdit: boolean): void {
    const d = this.fd, t = this.plugin.t, now = Date.now();
    if (!d.title.trim()) { new Notice(t.errNoTitle); return; }

    const r: Reminder = isEdit && this.existing ? this.existing : {
      id: generateId(), title: '', type: 'specific', checked: false,
      interval: 0, specificTs: null, startTs: null, endTs: null,
      timeWindowStart: null, timeWindowEnd: null, daysOfWeek: null,
      calendarUnit: null, calendarTime: null, calendarDayOfWeek: null,
      calendarDayOfMonth: null, calendarMonth: null,
      periodicUnit: null, periodicN: null, periodicTime: null, periodicStart: null,
      nextTrigger: null,
    };

    r.title = d.title.trim();

    // Clear all mode-specific fields first, then populate only the active mode
    r.specificTs = null;
    r.interval = 0; r.startTs = null; r.endTs = null;
    r.timeWindowStart = null; r.timeWindowEnd = null; r.daysOfWeek = null;
    r.calendarUnit = null; r.calendarTime = null; r.calendarDayOfWeek = null;
    r.calendarDayOfMonth = null; r.calendarMonth = null;
    r.periodicUnit = null; r.periodicN = null; r.periodicTime = null; r.periodicStart = null;

    if (d.mode === 'once') {
      if (!d.specificDate)                { new Notice(t.errNoDate);  return; }
      const ts = new Date(d.specificDate).getTime();
      if (isNaN(ts))                      { new Notice(t.errBadDate); return; }
      r.type = 'specific'; r.specificTs = ts; r.nextTrigger = ts;

    } else if (d.mode === 'calendar') {
      if (!d.calTime)                     { new Notice(t.errNoCalTime); return; }
      if (d.calUnit === 'week') {
        const days = d.calDaysOfWeek.map((v, i) => v ? i : -1).filter(i => i >= 0);
        if (days.length === 0)            { new Notice(t.errNoCalDay); return; }
        r.calendarDayOfWeek = days;
      }
      if ((d.calUnit === 'month' || d.calUnit === 'year') && d.calDayOfMonth < 1)
                                          { new Notice(t.errNoCalDayNum); return; }
      r.type = 'calendar'; r.calendarUnit = d.calUnit; r.calendarTime = d.calTime;
      r.calendarDayOfMonth = (d.calUnit === 'month' || d.calUnit === 'year') ? d.calDayOfMonth : null;
      r.calendarMonth      = d.calUnit === 'year' ? d.calMonth : null;
      r.nextTrigger = calcNextCalendarTrigger(r, now);

    } else if (d.mode === 'periodic') {
      if (!d.perN || d.perN < 1)          { new Notice(t.errPeriodNMin);    return; }
      if (!d.perTime)                     { new Notice(t.errNoCalTime);      return; }
      if (!d.perStart)                    { new Notice(t.errNoPeriodStart);  return; }
      const startTs = new Date(d.perStart + 'T00:00:00').getTime();
      if (isNaN(startTs))                 { new Notice(t.errBadDate);        return; }
      r.type = 'periodic';
      r.periodicUnit = d.perUnit; r.periodicN = d.perN;
      r.periodicTime = d.perTime; r.periodicStart = startTs;
      r.nextTrigger  = calcNextPeriodicTrigger(r, now);

    } else {
      // repeat / flexible
      if (d.interval < 1)                 { new Notice(t.errBadInterval); return; }
      let startTs: number | null = null;
      if (d.useStartDate) {
        if (!d.startDate)                 { new Notice(t.errNoStartDate); return; }
        startTs = new Date(d.startDate).getTime();
        if (isNaN(startTs))               { new Notice(t.errBadDate);     return; }
      }
      let endTs: number | null = null;
      if (d.useEndDate) {
        if (!d.endDate)                   { new Notice(t.errNoDate);  return; }
        endTs = new Date(d.endDate).getTime();
        if (isNaN(endTs))                 { new Notice(t.errBadDate); return; }
      }
      let tw: [string, string] | null = null;
      if (d.useTimeWindow) {
        if (!d.timeFrom)                  { new Notice(t.errNoTimeFrom); return; }
        if (!d.timeTo)                    { new Notice(t.errNoTimeTo);   return; }
        tw = [d.timeFrom, d.timeTo];
      }
      let days: number[] | null = null;
      if (d.useDaysOfWeek) {
        days = d.daysOfWeek.map((v, i) => v ? i : -1).filter(i => i >= 0);
        if (days.length === 0)            { new Notice(t.errNoDays); return; }
      }
      r.type = 'flexible'; r.interval = d.interval;
      r.startTs = startTs; r.endTs = endTs;
      r.timeWindowStart = tw?.[0] ?? null; r.timeWindowEnd = tw?.[1] ?? null;
      r.daysOfWeek = days;
      r.nextTrigger = calcNextTrigger(r, now);
    }

    if (!isEdit) this.plugin.reminders.push(r);
    this.plugin.saveSettings();
    new Notice(isEdit ? t.okUpdated : t.okAdded);
    this.onSave();
    this.close();
  }
}
