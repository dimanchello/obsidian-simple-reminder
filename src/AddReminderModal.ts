import { App, Modal, Notice } from 'obsidian';
import type SimpleReminderPlugin from './main';
import { RepeatUnit, Reminder, RemindBeforeUnit } from './types';
import { generateId, calcNextTrigger, calcRemindBeforeTriggers } from './utils';
import { Strings } from './i18n';

type ReminderMode = 'once' | 'repeat';
type BoolFormDataKey = 'useStart' | 'useEnd' | 'isIntraDay';

interface RemindBeforeFormItem {
  value: number;
  unit: RemindBeforeUnit;
}

interface FormData {
  title: string;
  mode: ReminderMode;
  specificDate: string;

  repUnit: RepeatUnit;
  repStep: number;
  repDaysOfWeek: boolean[];
  repDayOfMonth: number;
  repMonth: number;

  useStart: boolean;
  startDate: string;
  useEnd: boolean;
  endDate: string;

  isIntraDay: boolean;
  intraTime: string;
  intraStepMin: number;
  timeFrom: string;
  timeTo: string;

  emoji: string;
  remindBeforeEnabled: boolean;
  remindBeforeList: RemindBeforeFormItem[];
}

function tsToLocal(ts: number): string {
  const d = new Date(ts),
    pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function tsToDateLocal(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function reminderToFD(r: Reminder): FormData {
  const isRepeat = r.type === 'repeat';
  const rb = r.remindBefore.filter((e) => e.value > 0);
  return {
    title: r.title,
    mode: isRepeat ? 'repeat' : 'once',
    specificDate: r.specificTs ? tsToLocal(r.specificTs) : '',
    repUnit: r.repUnit || 'day',
    repStep: r.repStep || 1,
    repDaysOfWeek: Array.from({ length: 7 }, (_, i) =>
      Array.isArray(r.repDaysOfWeek) ? r.repDaysOfWeek.includes(i) : false,
    ),
    repDayOfMonth: r.repDayOfMonth || 1,
    repMonth: r.repMonth || 0,
    useStart: !!r.startDate,
    startDate: r.startDate ? tsToDateLocal(r.startDate) : '',
    useEnd: !!r.endDate,
    endDate: r.endDate ? tsToDateLocal(r.endDate) : '',
    isIntraDay: r.intraDayMode != null,
    intraTime: r.intraDayTime || '09:00',
    intraStepMin: r.intraDayStepMin || 30,
    timeFrom: r.timeWindowStart || '09:00',
    timeTo: r.timeWindowEnd || '18:00',
    emoji: r.emoji || '⏰',
    remindBeforeEnabled: rb.length > 0,
    remindBeforeList:
      rb.length > 0 ? rb.map((e) => ({ value: e.value, unit: e.unit })) : [{ value: 30, unit: 'minute' }],
  };
}

function defaultFD(): FormData {
  return {
    title: '',
    mode: 'once',
    specificDate: '',
    repUnit: 'day',
    repStep: 1,
    repDaysOfWeek: [false, false, false, false, false, false, false],
    repDayOfMonth: 1,
    repMonth: 0,
    useStart: false,
    startDate: '',
    useEnd: false,
    endDate: '',
    isIntraDay: false,
    intraTime: '09:00',
    intraStepMin: 30,
    timeFrom: '09:00',
    timeTo: '18:00',
    emoji: '⏰',
    remindBeforeEnabled: false,
    remindBeforeList: [{ value: 30, unit: 'minute' }],
  };
}

export class AddReminderModal extends Modal {
  private plugin: SimpleReminderPlugin;
  private onSave: () => void;
  private existing: Reminder | null;
  private fd: FormData;
  private bodyEl!: HTMLElement;
  private _intraInitSingle = false;

  constructor(app: App, plugin: SimpleReminderPlugin, onSave: () => void, existing?: Reminder | null) {
    super(app);
    this.plugin = plugin;
    this.onSave = onSave;
    this.existing = existing ?? null;
    this.fd = existing ? reminderToFD(existing) : defaultFD();
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass('sr-modal');
    const t = this.plugin.t,
      isEdit = this.existing !== null;
    const hdr = contentEl.createDiv('sr-modal-header');
    hdr.createSpan({ cls: 'sr-modal-icon', text: isEdit ? '✏️' : '➕' });
    hdr.createEl('h3', { cls: 'sr-modal-title', text: isEdit ? t.modalEditTitle : t.modalTitle });
    this.buildForm(contentEl.createDiv('sr-modal-form'), t, isEdit);
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private buildForm(form: HTMLElement, t: Strings, isEdit: boolean): void {
    const g1 = form.createDiv('sr-field-group');
    g1.createEl('label', { cls: 'sr-label', text: t.fieldName });
    const ti = g1.createEl('input', { cls: 'sr-input', type: 'text', placeholder: t.fieldNamePlaceholder });
    ti.value = this.fd.title;
    ti.addEventListener('input', (e) => {
      this.fd.title = (e.target as HTMLInputElement).value;
    });
    ti.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submit(isEdit);
    });
    setTimeout(() => ti.focus(), 50);

    const g2 = form.createDiv('sr-field-group');
    g2.createEl('label', { cls: 'sr-label', text: t.sectionType });
    const typeRow = g2.createDiv('sr-type-row');
    const modes: [ReminderMode, string][] = [
      ['once', t.typeOnce],
      ['repeat', t.typeRepeat],
    ];

    modes.forEach(([mode, label], idx) => {
      const lbl = typeRow.createEl('label', {
        cls: 'sr-type-btn' + (this.fd.mode === mode ? ' sr-type-btn--active' : ''),
      });
      const radio = lbl.createEl('input', { type: 'radio' });
      radio.name = 'sr-mode';
      radio.value = mode;
      radio.checked = this.fd.mode === mode;
      lbl.createSpan({ text: label });
      radio.addEventListener('change', () => {
        this.fd.mode = mode;
        typeRow
          .querySelectorAll<HTMLElement>('.sr-type-btn')
          .forEach((el, i) => el.classList.toggle('sr-type-btn--active', i === idx));
        this.buildBody(t);
      });
    });

    this.bodyEl = form.createDiv('sr-modal-body');
    this.buildBody(t);

    const btnRow = form.createDiv('sr-btn-row');
    btnRow
      .createEl('button', { cls: 'sr-save-btn', text: isEdit ? t.updateBtn : t.saveBtn })
      .addEventListener('click', () => this.submit(isEdit));
    btnRow
      .createEl('button', { cls: 'sr-cancel-btn', text: t.cancelBtn })
      .addEventListener('click', () => this.close());
  }

  private buildBody(t: Strings): void {
    this.bodyEl.empty();
    if (this.fd.mode === 'once') this.buildOnceBody(this.bodyEl, t);
    else this.buildRepeatBody(this.bodyEl, t);
  }

  private buildOnceBody(body: HTMLElement, t: Strings): void {
    const g = body.createDiv('sr-field-group');
    g.createEl('label', { cls: 'sr-label', text: t.fieldDateTime });
    const inp = g.createEl('input', { cls: 'sr-input', type: 'datetime-local' });
    if (this.fd.specificDate) inp.value = this.fd.specificDate;
    inp.addEventListener('change', (e) => {
      this.fd.specificDate = (e.target as HTMLInputElement).value;
    });
    this.buildEmojiField(body, t);
    this.buildRemindBeforeField(body, t);
  }

  private buildRepeatBody(body: HTMLElement, t: Strings): void {
    const card = body.createDiv('sr-cal-card');

    // Базовый шаг: Каждые 1 День/Неделя/Месяц
    const ug = card.createDiv('sr-field-group');
    ug.createEl('label', { cls: 'sr-label', text: t.periodicEvery });
    const unitRow = ug.createDiv('sr-cal-unit-row');
    const dynArea = card.createDiv('sr-cal-dynamic');

    const units: RepeatUnit[] = ['day', 'week', 'month', 'year'];
    units.forEach((unit, idx) => {
      const btn = unitRow.createEl('button', {
        cls: 'sr-unit-btn' + (this.fd.repUnit === unit ? ' sr-unit-btn--active' : ''),
        text: t.periodicUnitShort[idx],
        type: 'button',
      });
      btn.addEventListener('click', () => {
        this.fd.repUnit = unit;
        unitRow
          .querySelectorAll<HTMLElement>('.sr-unit-btn')
          .forEach((el, i) => el.classList.toggle('sr-unit-btn--active', i === idx));
        this.buildRepeatDynamic(dynArea, t);
      });
    });

    this.buildRepeatDynamic(dynArea, t);

    // Дополнительные настройки (Спойлер)
    const advWrap = body.createDiv('sr-adv-wrap');
    this.addAdvToggle(advWrap, t.advSettings, 'isOpen', (content) => {
      this.buildAdvSettings(content, t);
    });

    this.buildEmojiField(body, t);
    this.buildRemindBeforeField(body, t);
  }

  private buildRepeatDynamic(area: HTMLElement, t: Strings): void {
    area.empty();
    const unit = this.fd.repUnit;
    const unitIdx = ['day', 'week', 'month', 'year'].indexOf(unit);

    const nRow = area.createDiv('sr-interval-row');
    nRow.createEl('label', { cls: 'sr-label sr-label--inline', text: t.periodicEvery });
    const nInp = nRow.createEl('input', { cls: 'sr-input sr-input--short', type: 'number' });
    nInp.min = '1';
    nInp.value = String(this.fd.repStep);
    nInp.addEventListener('input', (e) => {
      const v = parseInt((e.target as HTMLInputElement).value, 10);
      this.fd.repStep = Math.max(1, isNaN(v) ? 1 : v);
    });
    nRow.createEl('span', { cls: 'sr-interval-unit', text: t.periodicUnitLabels[unitIdx] });

    if (unit === 'week') {
      const g = area.createDiv('sr-field-group');
      g.createEl('label', { cls: 'sr-label', text: t.calDayOfWeek });
      const wrap = g.createDiv('sr-days-wrap');
      // Порядок: Пн, Вт, Ср, Чт, Пт, Сб, Вс
      const monFirstOrder = [1, 2, 3, 4, 5, 6, 0];
      monFirstOrder.forEach((jsDay) => {
        const btn = wrap.createEl('button', {
          cls: 'sr-day-btn' + (this.fd.repDaysOfWeek[jsDay] ? ' sr-day-btn--active' : ''),
          text: t.daysShort[jsDay],
          type: 'button',
        });
        btn.addEventListener('click', () => {
          this.fd.repDaysOfWeek[jsDay] = !this.fd.repDaysOfWeek[jsDay];
          btn.classList.toggle('sr-day-btn--active', this.fd.repDaysOfWeek[jsDay]);
        });
      });
    }

    if (unit === 'month' || unit === 'year') {
      if (unit === 'year') {
        const row = area.createDiv('sr-grid-2');
        const dg = row.createDiv('sr-field-group');
        dg.createEl('label', { cls: 'sr-label', text: t.calDayOfMonth });
        const inp = dg.createEl('input', { cls: 'sr-input', type: 'number' });
        inp.min = '1';
        inp.max = '31';
        inp.value = String(this.fd.repDayOfMonth);
        inp.addEventListener('input', (e) => {
          const v = parseInt((e.target as HTMLInputElement).value, 10);
          this.fd.repDayOfMonth = Math.min(31, Math.max(1, isNaN(v) ? 1 : v));
        });

        const mg = row.createDiv('sr-field-group');
        mg.createEl('label', { cls: 'sr-label', text: t.calMonthLabel });
        const sel = mg.createEl('select', { cls: 'sr-select' });
        t.monthsFull.forEach((name, idx) => {
          const opt = sel.createEl('option', { text: name });
          opt.value = String(idx);
          if (idx === this.fd.repMonth) opt.selected = true;
        });
        sel.addEventListener('change', (e) => {
          this.fd.repMonth = parseInt((e.target as HTMLSelectElement).value, 10);
        });
      } else {
        const g = area.createDiv('sr-field-group');
        g.createEl('label', { cls: 'sr-label', text: t.calDayOfMonth });
        const inp = g.createEl('input', { cls: 'sr-input sr-input--short', type: 'number' });
        inp.min = '1';
        inp.max = '31';
        inp.value = String(this.fd.repDayOfMonth);
        inp.addEventListener('input', (e) => {
          const v = parseInt((e.target as HTMLInputElement).value, 10);
          this.fd.repDayOfMonth = Math.min(31, Math.max(1, isNaN(v) ? 1 : v));
        });
      }
    }
  }

  private buildAdvSettings(container: HTMLElement, t: Strings): void {
    container.empty();

    // Старт / Стоп даты
    this.addToggle(container, t.toggleStartDate, 'useStart', (c) => {
      c.createEl('span', { cls: 'sr-hint', text: t.hintStartDate });
      const inp = c.createEl('input', { cls: 'sr-input', type: 'date' });
      if (this.fd.startDate) inp.value = this.fd.startDate;
      inp.addEventListener('change', (e) => {
        this.fd.startDate = (e.target as HTMLInputElement).value;
      });
    });

    this.addToggle(container, t.toggleEndDate, 'useEnd', (c) => {
      c.createEl('span', { cls: 'sr-hint', text: t.hintEndDate });
      const inp = c.createEl('input', { cls: 'sr-input', type: 'date' });
      if (this.fd.endDate) inp.value = this.fd.endDate;
      inp.addEventListener('change', (e) => {
        this.fd.endDate = (e.target as HTMLInputElement).value;
      });
    });

    // Внутри-дневные настройки
    this._intraInitSingle = this.existing?.intraDayMode === 'single';
    this.addToggle(
      container,
      t.toggleIntraDay,
      'isIntraDay',
      (c) => {
        c.createEl('span', { cls: 'sr-hint', text: t.hintIntraDay });
        if (this._intraInitSingle) {
          this._intraInitSingle = false;
          this.buildIntraSingle(c, t);
        } else {
          this.buildIntraInterval(c, t);
        }
      },
      (c) => {
        c.createEl('span', { cls: 'sr-hint', text: t.hintIntraDay });
        this.buildIntraSingle(c, t);
      },
    );
  }

  private buildIntraSingle(c: HTMLElement, t: Strings): void {
    const gTime = c.createDiv('sr-field-group');
    gTime.createEl('label', { cls: 'sr-label', text: t.periodicTimeLabel });
    const timeInp = gTime.createEl('input', { cls: 'sr-input sr-input--time', type: 'time' });
    timeInp.value = this.fd.intraTime;
    timeInp.addEventListener('change', (e) => {
      this.fd.intraTime = (e.target as HTMLInputElement).value;
    });
  }

  private buildIntraInterval(c: HTMLElement, t: Strings): void {
    const nRow = c.createDiv('sr-interval-row');
    nRow.createEl('label', { cls: 'sr-label sr-label--inline', text: t.periodicEvery });
    const nInp = nRow.createEl('input', { cls: 'sr-input sr-input--short', type: 'number' });
    nInp.min = '1';
    nInp.value = String(this.fd.intraStepMin);
    nInp.addEventListener('input', (e) => {
      const v = parseInt((e.target as HTMLInputElement).value, 10);
      this.fd.intraStepMin = Math.max(1, isNaN(v) ? 1 : v);
    });
    nRow.createEl('span', { cls: 'sr-interval-unit', text: t.fieldIntervalUnit });

    const tw = c.createDiv('sr-time-row');
    const gF = tw.createDiv('sr-field-group');
    gF.createEl('label', { cls: 'sr-label', text: t.fieldTimeFrom });
    const from = gF.createEl('input', { cls: 'sr-input sr-input--time', type: 'time' });
    from.value = this.fd.timeFrom;
    from.addEventListener('change', (e) => {
      this.fd.timeFrom = (e.target as HTMLInputElement).value;
    });

    const gT = tw.createDiv('sr-field-group');
    gT.createEl('label', { cls: 'sr-label', text: t.fieldTimeTo });
    const to = gT.createEl('input', { cls: 'sr-input sr-input--time', type: 'time' });
    to.value = this.fd.timeTo;
    to.addEventListener('change', (e) => {
      this.fd.timeTo = (e.target as HTMLInputElement).value;
    });
  }

  private buildEmojiField(parent: HTMLElement, t: Strings): void {
    const g = parent.createDiv('sr-field-group');
    g.createEl('label', { cls: 'sr-label', text: t.fieldEmoji });
    const header = g.createDiv('sr-emoji-header');
    const preview = header.createEl('button', {
      cls: 'sr-emoji-preview',
      text: this.fd.emoji,
      type: 'button',
    });
    const wrap = g.createDiv('sr-emoji-wrap');
    const grid = wrap.createDiv('sr-emoji-grid');
    const emojis = [
      '⏰',
      '🔔',
      '📌',
      '📅',
      '💡',
      '📝',
      '💊',
      '🏋️',
      '📚',
      '🎯',
      '⭐',
      '❤️',
      '✅',
      '🔄',
      '☕',
      '🍎',
      '💧',
      '🧠',
      '💪',
      '🏃',
      '🧘',
      '🎵',
      '🎮',
      '✍️',
      '📖',
      '🛒',
      '🏠',
      '🚗',
      '✈️',
      '📞',
      '💼',
      '🖥️',
      '🔑',
      '🎁',
      '🏆',
      '🎉',
      '🔥',
      '💎',
      '🌈',
      '🌙',
      '😀',
      '😂',
      '😊',
      '🥰',
      '😎',
      '🤔',
      '😴',
      '🥳',
      '😇',
      '🤩',
      '🐶',
      '🐱',
      '🐼',
      '🦊',
      '🐸',
      '🐝',
      '🦋',
      '🐞',
      '🌸',
      '🌺',
      '🌻',
      '🌷',
      '🌿',
      '🍀',
      '🌵',
      '🌊',
      '☀️',
      '❄️',
      '🌪️',
      '🌈',
      '🍕',
      '🍔',
      '🌮',
      '🥗',
      '🍣',
      '🍩',
      '🍪',
      '🧁',
      '🥑',
      '🥦',
      '⚽',
      '🏀',
      '🎾',
      '🏈',
      '🎱',
      '🚴',
      '🏄',
      '🧗',
      '⛷️',
      '🥊',
      '🎸',
      '🎹',
      '🎧',
      '🎤',
      '🎬',
      '📸',
      '🎨',
      '🖌️',
      '🎭',
      '🎪',
      '💻',
      '📱',
      '🖨️',
      '💾',
      '📀',
      '🎥',
      '📡',
      '🔋',
      '💳',
      '🛠️',
      '✉️',
      '📫',
      '📦',
      '📎',
      '📁',
      '📊',
      '📈',
      '🗂️',
      '🔍',
      '🔒',
      '🚀',
      '🛸',
      '🌍',
      '🌕',
      '☄️',
      '⭐',
      '🔭',
      '🔬',
      '⚗️',
      '🧪',
      '💉',
      '🩺',
      '🦷',
      '🧬',
      '📋',
      '📃',
      '📄',
      '🗒️',
      '📕',
      '📗',
      '🛌',
      '🛁',
      '🚿',
      '🧹',
      '🧺',
      '🔧',
      '🧰',
      '🪴',
      '🖼️',
      '🕯️',
      '💰',
      '💵',
      '💸',
      '📉',
      '📦',
      '🏷️',
      '📌',
      '📍',
      '🎀',
      '🧧',
      '🗓️',
      '⏳',
      '⌛',
      '🔋',
      '⚡',
      '🛡️',
      '🧲',
      '🎈',
      '🎊',
      '🎄',
      '🕐',
      '🕑',
      '🕒',
      '🕓',
      '🕔',
      '🕕',
      '🕖',
      '🕗',
      '🕘',
      '🕙',
      '🕚',
      '🕛',
      '⏱️',
      '⏲️',
      '🛎️',
      '📯',
      '📻',
      '📺',
      '🔦',
      '💡',
    ];
    emojis.forEach((e) => {
      const btn = grid.createEl('button', {
        cls: 'sr-emoji-btn' + (this.fd.emoji === e ? ' sr-emoji-btn--active' : ''),
        text: e,
        type: 'button',
      });
      btn.addEventListener('click', () => {
        this.fd.emoji = e;
        preview.textContent = e;
        grid.querySelectorAll('.sr-emoji-btn').forEach((b) => b.classList.remove('sr-emoji-btn--active'));
        btn.classList.add('sr-emoji-btn--active');
      });
    });
    let open = false;
    const toggle = () => {
      open = !open;
      wrap.classList.toggle('sr-emoji-wrap--open', open);
    };
    preview.addEventListener('click', toggle);
  }

  private buildRemindBeforeField(parent: HTMLElement, t: Strings): void {
    const wrap = parent.createDiv('sr-toggle-block' + (this.fd.remindBeforeEnabled ? ' sr-toggle-block--open' : ''));
    const header = wrap.createDiv('sr-toggle-header');
    const cb = header.createEl('input', { type: 'checkbox', cls: 'sr-toggle-check' });
    cb.checked = this.fd.remindBeforeEnabled;
    header.createSpan({ cls: 'sr-toggle-label', text: t.remindBeforeLabel });
    const content = wrap.createDiv('sr-toggle-content');

    const renderList = () => {
      content.empty();
      const list = content.createDiv('sr-rb-list');

      const renderEntry = (idx: number) => {
        const entry = this.fd.remindBeforeList[idx];
        const row = list.createDiv('sr-rb-row');
        row.dataset.idx = String(idx);

        const nInp = row.createEl('input', { cls: 'sr-input sr-input--short', type: 'number' });
        nInp.min = '1';
        nInp.value = String(entry.value);
        nInp.addEventListener('input', (e) => {
          const v = parseInt((e.target as HTMLInputElement).value, 10);
          this.fd.remindBeforeList[idx].value = Math.max(1, isNaN(v) ? 1 : v);
        });

        const sel = row.createEl('select', { cls: 'sr-select' });
        t.remindBeforeUnitLabels.forEach((name) => {
          const opt = sel.createEl('option', { text: name });
          opt.value = name;
          if (entry.unit === name) opt.selected = true;
        });
        sel.addEventListener('change', (e) => {
          this.fd.remindBeforeList[idx].unit = (e.target as HTMLSelectElement).value as RemindBeforeUnit;
        });

        const delBtn = row.createEl('button', { cls: 'sr-rb-del-btn', text: '✕' });
        delBtn.addEventListener('click', () => {
          this.fd.remindBeforeList.splice(idx, 1);
          renderList();
        });
      };

      for (let i = 0; i < this.fd.remindBeforeList.length; i++) {
        renderEntry(i);
      }

      const addBtn = content.createEl('button', { cls: 'sr-rb-add-btn', text: t.remindBeforeAddBtn });
      addBtn.addEventListener('click', () => {
        this.fd.remindBeforeList.push({ value: 30, unit: 'minute' });
        renderList();
      });
    };

    if (this.fd.remindBeforeEnabled) renderList();

    cb.addEventListener('change', () => {
      this.fd.remindBeforeEnabled = cb.checked;
      wrap.classList.toggle('sr-toggle-block--open', cb.checked);
      if (cb.checked) {
        if (this.fd.remindBeforeList.length === 0) {
          this.fd.remindBeforeList.push({ value: 30, unit: 'minute' });
        }
        renderList();
      } else {
        content.empty();
      }
    });
  }

  private addAdvToggle(parent: HTMLElement, label: string, dummy: string, buildContent: (c: HTMLElement) => void) {
    let isOpen =
      this.fd.useStart ||
      this.fd.useEnd ||
      this.fd.isIntraDay ||
      (this.existing?.type === 'repeat' && this.existing.intraDayMode === 'single') ||
      false;
    const block = parent.createDiv('sr-toggle-block sr-toggle-adv' + (isOpen ? ' sr-toggle-block--open' : ''));
    const header = block.createDiv('sr-toggle-header');
    header.createSpan({ cls: 'sr-toggle-label', text: label });
    const content = block.createDiv('sr-toggle-content');
    if (isOpen) buildContent(content);

    header.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      isOpen = !isOpen;
      block.classList.toggle('sr-toggle-block--open', isOpen);
      content.empty();
      if (isOpen) buildContent(content);
    });
  }

  private addToggle(
    parent: HTMLElement,
    label: string,
    fdKey: BoolFormDataKey,
    buildOn: (c: HTMLElement) => void,
    buildOff?: (c: HTMLElement) => void,
  ) {
    const isActive = this.fd[fdKey];
    const block = parent.createDiv('sr-toggle-block' + (isActive ? ' sr-toggle-block--open' : ''));
    const header = block.createDiv('sr-toggle-header');
    const cb = header.createEl('input', { type: 'checkbox', cls: 'sr-toggle-check' });
    cb.checked = isActive;
    header.createSpan({ cls: 'sr-toggle-label', text: label });
    const content = block.createDiv('sr-toggle-content');

    if (isActive) buildOn(content);
    else if (buildOff) buildOff(content);

    cb.addEventListener('change', () => {
      this.fd[fdKey] = cb.checked;
      block.classList.toggle('sr-toggle-block--open', cb.checked);
      content.empty();
      if (cb.checked) buildOn(content);
      else if (buildOff) buildOff(content);
    });
  }

  private submit(isEdit: boolean): void {
    const d = this.fd,
      t = this.plugin.t,
      now = Date.now();
    if (!d.title.trim()) {
      new Notice(t.errNoTitle);
      return;
    }

    const r: Reminder =
      isEdit && this.existing
        ? this.existing
        : {
            id: generateId(),
            title: '',
            type: 'once',
            checked: false,
            specificTs: null,
            repUnit: null,
            repStep: null,
            repDaysOfWeek: null,
            repDayOfMonth: null,
            repMonth: null,
            startDate: null,
            endDate: null,
            intraDayMode: null,
            intraDayTime: null,
            intraDayStepMin: null,
            timeWindowStart: null,
            timeWindowEnd: null,
            remindBefore: [],
            emoji: '⏰',
            nextTrigger: null,
            completedAt: null,
          };

    r.title = d.title.trim();
    r.specificTs = null;
    r.repUnit = null;
    r.repStep = null;
    r.repDaysOfWeek = null;
    r.repDayOfMonth = null;
    r.repMonth = null;
    r.startDate = null;
    r.endDate = null;
    r.intraDayMode = null;
    r.intraDayTime = null;
    r.intraDayStepMin = null;
    r.timeWindowStart = null;
    r.timeWindowEnd = null;
    r.remindBefore = [];
    r.emoji = d.emoji || '⏰';

    if (d.mode === 'once') {
      if (!d.specificDate) {
        new Notice(t.errNoDate);
        return;
      }
      const ts = new Date(d.specificDate).getTime();
      if (isNaN(ts)) {
        new Notice(t.errBadDate);
        return;
      }
      r.type = 'once';
      r.specificTs = ts;
    } else {
      if (d.repStep < 1) {
        new Notice(t.errPeriodNMin);
        return;
      }
      if (d.repUnit === 'week') {
        const days = d.repDaysOfWeek.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
        if (days.length === 0) {
          new Notice(t.errNoDays);
          return;
        }
        r.repDaysOfWeek = days;
      }

      r.type = 'repeat';
      r.repUnit = d.repUnit;
      r.repStep = d.repStep;
      r.repDayOfMonth = d.repUnit === 'month' || d.repUnit === 'year' ? d.repDayOfMonth : null;
      r.repMonth = d.repUnit === 'year' ? d.repMonth : null;

      if (d.useStart && d.startDate) {
        const parts = d.startDate.split('-').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) {
          new Notice(t.errBadDate);
          return;
        }
        r.startDate = new Date(parts[0], parts[1] - 1, parts[2]).getTime();
      }
      if (d.useEnd && d.endDate) {
        const parts = d.endDate.split('-').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) {
          new Notice(t.errBadDate);
          return;
        }
        r.endDate = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999).getTime();
      }

      if (d.isIntraDay) {
        if (d.intraStepMin < 1) {
          new Notice(t.errBadInterval);
          return;
        }
        r.intraDayMode = 'interval';
        r.intraDayStepMin = d.intraStepMin;
        r.timeWindowStart = d.timeFrom || '00:00';
        r.timeWindowEnd = d.timeTo || '23:59';
      } else {
        if (!d.intraTime) {
          new Notice(t.errNoTime);
          return;
        }
        r.intraDayMode = 'single';
        r.intraDayTime = d.intraTime;
      }
    }

    r.nextTrigger = calcNextTrigger(r, now);

    if (d.remindBeforeEnabled && d.remindBeforeList.some((e) => e.value > 0)) {
      r.remindBefore = calcRemindBeforeTriggers(
        r.nextTrigger,
        d.remindBeforeList.filter((e) => e.value > 0),
      );
    } else {
      r.remindBefore = [];
    }

    if (isEdit && r.nextTrigger != null && r.nextTrigger > now) {
      r.checked = false;
      r.completedAt = null;
    }

    if (!isEdit) this.plugin.reminders.push(r);
    this.plugin.saveSettings();
    new Notice(isEdit ? t.okUpdated : t.okAdded);
    this.onSave();
    this.close();
  }
}
