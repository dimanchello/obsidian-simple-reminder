import { App, Modal, Notice } from 'obsidian';
import type SimpleReminderPlugin from './main';
import { Reminder } from './types';
import { generateId, calcNextTrigger } from './utils';
import { Strings } from './i18n';

type ReminderMode = 'once' | 'repeat';

interface FormData {
  title:         string;
  mode:          ReminderMode;
  interval:      number;
  specificDate:  string;
  useStartDate:  boolean;
  useEndDate:    boolean;
  useTimeWindow: boolean;
  useDaysOfWeek: boolean;
  startDate:     string;
  endDate:       string;
  timeFrom:      string;
  timeTo:        string;
  daysOfWeek:    boolean[]; // 0=Sun … 6=Sat
}

function tsToLocal(ts: number): string {
  const d   = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function reminderToFD(r: Reminder): FormData {
  return {
    title:         r.title,
    mode:          r.type === 'specific' ? 'once' : 'repeat',
    interval:      r.interval || 15,
    specificDate:  r.specificTs        ? tsToLocal(r.specificTs) : '',
    useStartDate:  !!r.startTs,
    useEndDate:    !!r.endTs,
    useTimeWindow: !!(r.timeWindowStart && r.timeWindowEnd),
    useDaysOfWeek: !!(r.daysOfWeek && r.daysOfWeek.length > 0),
    startDate:     r.startTs           ? tsToLocal(r.startTs) : '',
    endDate:       r.endTs             ? tsToLocal(r.endTs)   : '',
    timeFrom:      r.timeWindowStart   ?? '09:00',
    timeTo:        r.timeWindowEnd     ?? '18:00',
    daysOfWeek:    Array.from({ length: 7 }, (_, i) =>
                     r.daysOfWeek ? r.daysOfWeek.includes(i) : false),
  };
}

function defaultFD(): FormData {
  return {
    title: '', mode: 'repeat', interval: 15, specificDate: '',
    useStartDate: false, useEndDate: false, useTimeWindow: false, useDaysOfWeek: false,
    startDate: '', endDate: '', timeFrom: '09:00', timeTo: '18:00',
    daysOfWeek: [false, true, true, true, true, true, false],
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
    const t      = this.plugin.t;
    const isEdit = this.existing !== null;

    const hdr = contentEl.createDiv('sr-modal-header');
    hdr.createSpan({ cls: 'sr-modal-icon', text: isEdit ? '✏️' : '➕' });
    hdr.createEl('h3', { cls: 'sr-modal-title', text: isEdit ? t.modalEditTitle : t.modalTitle });

    this.buildForm(contentEl.createDiv('sr-modal-form'), t, isEdit);
  }

  onClose(): void { this.contentEl.empty(); }

  // ── Form shell ─────────────────────────────────────────────────────────────

  private buildForm(form: HTMLElement, t: Strings, isEdit: boolean): void {
    // Title
    const g1 = form.createDiv('sr-field-group');
    g1.createEl('label', { cls: 'sr-label', text: t.fieldName });
    const titleInput = g1.createEl('input', {
      cls: 'sr-input', type: 'text', placeholder: t.fieldNamePlaceholder,
    });
    titleInput.value = this.fd.title;
    titleInput.addEventListener('input',   e => { this.fd.title = (e.target as HTMLInputElement).value; });
    titleInput.addEventListener('keydown', e => { if (e.key === 'Enter') this.submit(isEdit); });
    setTimeout(() => titleInput.focus(), 50);

    // Mode selector
    const g2 = form.createDiv('sr-field-group');
    g2.createEl('label', { cls: 'sr-label', text: t.sectionType });
    const typeRow = g2.createDiv('sr-type-row');

    for (const mode of ['once', 'repeat'] as const) {
      const lbl   = typeRow.createEl('label', {
        cls: 'sr-type-btn' + (this.fd.mode === mode ? ' sr-type-btn--active' : ''),
      });
      const radio = lbl.createEl('input', { type: 'radio' });
      radio.name    = 'sr-mode';
      radio.value   = mode;
      radio.checked = this.fd.mode === mode;
      lbl.createSpan({ text: mode === 'once' ? t.typeOnce : t.typeRepeat });

      radio.addEventListener('change', () => {
        this.fd.mode = mode;
        typeRow.querySelectorAll<HTMLElement>('.sr-type-btn').forEach((el, i) =>
          el.classList.toggle('sr-type-btn--active', i === (mode === 'once' ? 0 : 1)));
        this.buildBody(t);
      });
    }

    // Body (swaps on mode change)
    this.bodyEl = form.createDiv('sr-modal-body');
    this.buildBody(t);

    // Buttons
    const btnRow = form.createDiv('sr-btn-row');
    btnRow.createEl('button', { cls: 'sr-save-btn',   text: isEdit ? t.updateBtn : t.saveBtn })
          .addEventListener('click', () => this.submit(isEdit));
    btnRow.createEl('button', { cls: 'sr-cancel-btn', text: t.cancelBtn })
          .addEventListener('click', () => this.close());
  }

  // ── Body (once / repeat) ───────────────────────────────────────────────────

  private buildBody(t: Strings): void {
    this.bodyEl.empty();
    if (this.fd.mode === 'once') {
      this.buildOnceBody(this.bodyEl, t);
    } else {
      this.buildRepeatBody(this.bodyEl, t);
    }
  }

  private buildOnceBody(body: HTMLElement, t: Strings): void {
    const g = body.createDiv('sr-field-group');
    g.createEl('label', { cls: 'sr-label', text: t.fieldDateTime });
    const inp = g.createEl('input', { cls: 'sr-input', type: 'datetime-local' });
    if (this.fd.specificDate) inp.value = this.fd.specificDate;
    inp.addEventListener('change', e => { this.fd.specificDate = (e.target as HTMLInputElement).value; });
  }

  private buildRepeatBody(body: HTMLElement, t: Strings): void {
    // Interval row
    const row = body.createDiv('sr-interval-row');
    row.createEl('label', { cls: 'sr-label sr-label--inline', text: t.sectionRepeat });
    const inp = row.createEl('input', { cls: 'sr-input sr-input--short', type: 'number' });
    inp.min   = '1';
    inp.value = String(this.fd.interval);
    inp.addEventListener('input', e => {
      const v = parseInt((e.target as HTMLInputElement).value, 10);
      this.fd.interval = Math.max(1, isNaN(v) ? 1 : v);
    });
    row.createEl('span', { cls: 'sr-interval-unit', text: t.fieldIntervalUnit });

    // Constraints
    const section = body.createDiv('sr-constraints-section');
    section.createEl('div', { cls: 'sr-constraints-title', text: t.sectionConstraints });
    const list = section.createDiv('sr-constraints-list');

    // Each toggle block passes its own content container to the builder
    this.addToggle(list, t.toggleStartDate,   'useStartDate',   (c) => this.buildStartDate(c, t));
    this.addToggle(list, t.toggleEndDate,     'useEndDate',     (c) => this.buildEndDate(c, t));
    this.addToggle(list, t.toggleTimeWindow,  'useTimeWindow',  (c) => this.buildTimeWindow(c, t));
    this.addToggle(list, t.toggleDaysOfWeek,  'useDaysOfWeek',  (c) => this.buildDaysOfWeek(c, t));
  }

  // ── Toggle block ───────────────────────────────────────────────────────────

  /**
   * Each block manages its own content container.
   * `buildContent(container)` receives the exact div to append fields into.
   * Unchecking calls container.empty() + hides via class — no stale DOM.
   */
  private addToggle(
    parent:       HTMLElement,
    label:        string,
    fdKey:        keyof Pick<FormData, 'useStartDate' | 'useEndDate' | 'useTimeWindow' | 'useDaysOfWeek'>,
    buildContent: (container: HTMLElement) => void,
  ): void {
    const isActive = this.fd[fdKey] as boolean;

    const block   = parent.createDiv('sr-toggle-block' + (isActive ? ' sr-toggle-block--open' : ''));
    const header  = block.createDiv('sr-toggle-header');
    const cb      = header.createEl('input', { type: 'checkbox', cls: 'sr-toggle-check' });
    cb.checked    = isActive;
    header.createSpan({ cls: 'sr-toggle-label', text: label });

    const content = block.createDiv('sr-toggle-content');

    // Render initial state
    if (isActive) buildContent(content);

    cb.addEventListener('change', () => {
      const checked  = cb.checked;
      // Update form data
      (this.fd as unknown as Record<string, boolean>)[fdKey] = checked;
      // Toggle visual state
      block.classList.toggle('sr-toggle-block--open', checked);
      // Clear content always first
      content.empty();
      // Re-populate only if checked
      if (checked) buildContent(content);
    });
  }

  // ── Constraint field builders — each receives its own container ────────────

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

    const gFrom = row.createDiv('sr-field-group');
    gFrom.createEl('label', { cls: 'sr-label', text: t.fieldTimeFrom });
    const from = gFrom.createEl('input', { cls: 'sr-input sr-input--time', type: 'time' });
    from.value = this.fd.timeFrom;
    from.addEventListener('change', e => { this.fd.timeFrom = (e.target as HTMLInputElement).value; });

    const gTo = row.createDiv('sr-field-group');
    gTo.createEl('label', { cls: 'sr-label', text: t.fieldTimeTo });
    const to = gTo.createEl('input', { cls: 'sr-input sr-input--time', type: 'time' });
    to.value = this.fd.timeTo;
    to.addEventListener('change', e => { this.fd.timeTo = (e.target as HTMLInputElement).value; });
  }

  private buildDaysOfWeek(c: HTMLElement, t: Strings): void {
    const wrap = c.createDiv('sr-days-wrap');
    this.fd.daysOfWeek.forEach((active, idx) => {
      const btn = wrap.createEl('button', {
        cls:  'sr-day-btn' + (active ? ' sr-day-btn--active' : ''),
        text: t.daysShort[idx],
        type: 'button',
      });
      btn.addEventListener('click', () => {
        this.fd.daysOfWeek[idx] = !this.fd.daysOfWeek[idx];
        btn.classList.toggle('sr-day-btn--active', this.fd.daysOfWeek[idx]);
      });
    });
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  private submit(isEdit: boolean): void {
    const d   = this.fd;
    const t   = this.plugin.t;
    const now = Date.now();

    if (!d.title.trim()) { new Notice(t.errNoTitle); return; }

    // Base reminder object — mutate existing or create new
    const r: Reminder = isEdit && this.existing
      ? this.existing
      : {
          id: generateId(), title: '', type: 'specific', checked: false,
          interval: 0, specificTs: null, startTs: null, endTs: null,
          timeWindowStart: null, timeWindowEnd: null, daysOfWeek: null,
          nextTrigger: null,
        };

    r.title = d.title.trim();

    // ── Once ──────────────────────────────────────────────────────────────
    if (d.mode === 'once') {
      if (!d.specificDate)                 { new Notice(t.errNoDate);  return; }
      const ts = new Date(d.specificDate).getTime();
      if (isNaN(ts))                       { new Notice(t.errBadDate); return; }

      r.type           = 'specific';
      r.specificTs     = ts;
      r.interval       = 0;
      r.startTs        = null;
      r.endTs          = null;
      r.timeWindowStart = null;
      r.timeWindowEnd  = null;
      r.daysOfWeek     = null;
      r.nextTrigger    = ts;

    // ── Repeat ────────────────────────────────────────────────────────────
    } else {
      if (d.interval < 1) { new Notice(t.errBadInterval); return; }

      // start date
      let startTs: number | null = null;
      if (d.useStartDate) {
        if (!d.startDate)                  { new Notice(t.errNoStartDate); return; }
        startTs = new Date(d.startDate).getTime();
        if (isNaN(startTs))               { new Notice(t.errBadDate);     return; }
      }

      // end date
      let endTs: number | null = null;
      if (d.useEndDate) {
        if (!d.endDate)                    { new Notice(t.errNoDate);  return; }
        endTs = new Date(d.endDate).getTime();
        if (isNaN(endTs))                 { new Notice(t.errBadDate); return; }
      }

      // time window
      let timeFrom: string | null = null;
      let timeTo:   string | null = null;
      if (d.useTimeWindow) {
        if (!d.timeFrom) { new Notice(t.errNoTimeFrom); return; }
        if (!d.timeTo)   { new Notice(t.errNoTimeTo);   return; }
        timeFrom = d.timeFrom;
        timeTo   = d.timeTo;
      }

      // days of week
      let days: number[] | null = null;
      if (d.useDaysOfWeek) {
        days = d.daysOfWeek.map((v, i) => v ? i : -1).filter(i => i >= 0);
        if (days.length === 0) { new Notice(t.errNoDays); return; }
      }

      r.type            = 'flexible';
      r.interval        = d.interval;
      r.specificTs      = null;
      r.startTs         = startTs;
      r.endTs           = endTs;
      r.timeWindowStart = timeFrom;
      r.timeWindowEnd   = timeTo;
      r.daysOfWeek      = days;
      r.nextTrigger     = calcNextTrigger(r, now);
    }

    if (!isEdit) this.plugin.reminders.push(r);
    this.plugin.saveSettings();
    new Notice(isEdit ? t.okUpdated : t.okAdded);
    this.onSave();
    this.close();
  }
}
