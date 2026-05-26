import { ItemView, WorkspaceLeaf } from 'obsidian';
import type SimpleReminderPlugin from './main';
import { AddReminderModal } from './AddReminderModal';
import { CalendarModal } from './CalendarModal';
import { fmtDate, fmtDateShort } from './utils';
import { Reminder } from './types';
import { Strings } from './i18n';

export const VIEW_TYPE_REMINDER = 'simple-reminder-view';

export class ReminderView extends ItemView {
  private plugin: SimpleReminderPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: SimpleReminderPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_REMINDER;
  }
  getDisplayText(): string {
    return this.plugin.t.pluginName;
  }
  getIcon(): string {
    return 'bell';
  }

  async onOpen(): Promise<void> {
    this.render();
  }
  async onClose(): Promise<void> {}
  refresh(): void {
    this.render();
  }

  private render(): void {
    const t = this.plugin.t;
    const root = this.contentEl;
    root.empty();
    root.addClass('sr-root');
    this.renderHeader(root, t);
    this.renderStats(root, t);
    this.renderList(root, t);
  }

  private renderHeader(root: HTMLElement, t: Strings): void {
    const header = root.createDiv('sr-header');
    const title = header.createDiv('sr-header-title');
    title.createSpan({ cls: 'sr-header-icon', text: '⏰' });
    title.createSpan({ cls: 'sr-header-text', text: t.pluginName });
    const btnGroup = header.createDiv('sr-header-btns');
    const calBtn = btnGroup.createEl('button', { cls: 'sr-cal-btn', text: '📅' });
    calBtn.addEventListener('click', () => this.openCalendarModal());
    const addBtn = btnGroup.createEl('button', { cls: 'sr-cal-btn', text: '➕' });
    addBtn.addEventListener('click', () => this.openAddModal());
  }

  private renderStats(root: HTMLElement, t: Strings): void {
    const active = this.plugin.reminders.filter((r) => !r.checked).length;
    const done = this.plugin.reminders.length - active;
    const bar = root.createDiv('sr-stats');
    bar.createSpan({ cls: 'sr-stat sr-stat--active', text: `${t.statActiveLabel}: ${active}` });
    bar.createSpan({ cls: 'sr-stat-sep', text: '·' });
    bar.createSpan({ cls: 'sr-stat sr-stat--done', text: `${t.statDoneLabel}: ${done}` });
  }

  private renderList(root: HTMLElement, t: Strings): void {
    const list = root.createDiv('sr-list');
    if (this.plugin.reminders.length === 0) {
      const empty = list.createDiv('sr-empty');
      empty.createDiv({ cls: 'sr-empty-icon', text: '🔔' });
      empty.createDiv({ cls: 'sr-empty-text', text: t.noReminders });
      empty.createDiv({ cls: 'sr-empty-hint', text: t.noRemindersHint });
      return;
    }
    const sorted = [...this.plugin.reminders].sort((a, b) => {
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      return (a.nextTrigger ?? Infinity) - (b.nextTrigger ?? Infinity);
    });
    for (const r of sorted) this.renderItem(list, r, t);
  }

  private renderItem(container: HTMLElement, r: Reminder, t: Strings): void {
    const isDone = r.checked;
    const item = container.createDiv('sr-item' + (isDone ? ' sr-item--done' : ''));

    const cb = item.createDiv('sr-cb-wrap').createEl('input', { type: 'checkbox', cls: 'sr-checkbox' });
    cb.checked = r.checked;
    cb.addEventListener('change', async () => {
      r.checked = cb.checked;
      await this.plugin.saveSettings();
      this.refresh();
    });

    const body = item.createDiv('sr-body');
    body.createDiv({ cls: 'sr-title', text: `${r.emoji || '⏰'} ${r.title}` });

    const sched = body.createDiv('sr-sched');
    this.renderSchedule(sched, r, t);

    if (!isDone && r.type === 'repeat') this.renderMeta(body, r, t);

    const acts = item.createDiv('sr-actions');
    const editBtn = acts.createEl('button', { cls: 'sr-edit-btn', text: '✏️' });
    editBtn.setAttribute('aria-label', t.editAriaLabel);
    editBtn.addEventListener('click', () =>
      new AddReminderModal(
        this.app,
        this.plugin,
        () => {
          this.refresh();
          this.plugin.checkReminders();
        },
        r,
      ).open(),
    );

    const delBtn = acts.createEl('button', { cls: 'sr-del-btn', text: '✕' });
    delBtn.setAttribute('aria-label', t.deleteAriaLabel);
    delBtn.addEventListener('click', async () => {
      if (!confirm(t.deleteConfirm)) return;
      this.plugin.reminders = this.plugin.reminders.filter((x) => x.id !== r.id);
      await this.plugin.saveSettings();
      this.refresh();
    });
  }

  private renderSchedule(el: HTMLElement, r: Reminder, t: Strings): void {
    if (r.type === 'once') {
      el.createSpan({ cls: 'sr-tag sr-tag--once', text: t.tagOnce });
      el.createSpan({ cls: 'sr-sched-text', text: fmtDate(r.specificTs) });
      return;
    }

    el.createSpan({ cls: 'sr-tag sr-tag--repeat', text: t.tagRepeat });

    // Формируем красивое описание правила
    const parts = [];
    const n = r.repStep ?? 1;
    const unitIdx = ['day', 'week', 'month', 'year'].indexOf(r.repUnit ?? 'day');
    const unitLabel = n === 1 ? t.periodicUnitSingular[unitIdx] : t.periodicUnitLabels[unitIdx];
    parts.push(`${t.periodicEvery} ${n} ${unitLabel}`);

    if (r.repUnit === 'week' && r.repDaysOfWeek) {
      parts.push(`(${r.repDaysOfWeek.map((d) => t.daysShort[d]).join(', ')})`);
    }

    if (r.intraDayMode === 'interval') {
      parts.push(t.ruleInterval(r.intraDayStepMin ?? 15, r.timeWindowStart || '00:00', r.timeWindowEnd || '23:59'));
    } else {
      parts.push(t.ruleAt(r.intraDayTime || '09:00'));
    }

    el.createSpan({ cls: 'sr-sched-text', text: parts.join(' ') });

    if (r.endDate) el.createSpan({ cls: 'sr-badge sr-badge--end', text: `${t.endsLabel} ${fmtDateShort(r.endDate)}` });
  }

  private renderMeta(body: HTMLElement, r: Reminder, t: Strings): void {
    const meta = body.createDiv('sr-next');
    if (r.nextTrigger != null) {
      meta.createSpan({ cls: 'sr-next-label', text: t.nextLabel });
      meta.createSpan({ cls: 'sr-next-val', text: fmtDate(r.nextTrigger) });
    } else {
      meta.createSpan({ cls: 'sr-next-fired', text: t.alreadyFired });
    }
  }

  private openAddModal(): void {
    new AddReminderModal(this.app, this.plugin, () => {
      this.refresh();
      this.plugin.checkReminders();
    }).open();
  }

  private openCalendarModal(): void {
    new CalendarModal(this.app, this.plugin).open();
  }
}
