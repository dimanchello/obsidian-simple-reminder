import { ItemView, WorkspaceLeaf } from 'obsidian';
import type SimpleReminderPlugin from './main';
import { AddReminderModal } from './AddReminderModal';
import { fmtDate, fmtDateShort, isoWeekNumber } from './utils';
import { Reminder } from './types';
import { Strings } from './i18n';

export const VIEW_TYPE_REMINDER = 'simple-reminder-view';

export class ReminderView extends ItemView {
  private plugin: SimpleReminderPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: SimpleReminderPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType():    string { return VIEW_TYPE_REMINDER; }
  getDisplayText(): string { return this.plugin.t.pluginName; }
  getIcon():        string { return 'bell'; }

  async onOpen():  Promise<void> { this.render(); }
  async onClose(): Promise<void> {}
  refresh(): void { this.render(); }

  // ── Render ─────────────────────────────────────────────────────────────────

  private render(): void {
    const t    = this.plugin.t;
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass('sr-root');
    this.renderHeader(root, t);
    this.renderStats(root, t);
    this.renderList(root, t);
  }

  private renderHeader(root: HTMLElement, t: Strings): void {
    const header = root.createDiv('sr-header');
    const title  = header.createDiv('sr-header-title');
    title.createSpan({ cls: 'sr-header-icon', text: '⏰' });
    title.createSpan({ cls: 'sr-header-text', text: t.pluginName });
    header.createEl('button', { cls: 'sr-add-btn', text: t.addBtn })
          .addEventListener('click', () => this.openAddModal());
  }

  private renderStats(root: HTMLElement, t: Strings): void {
    const active = this.plugin.reminders.filter(r => !r.checked).length;
    const done   = this.plugin.reminders.length - active;
    const bar    = root.createDiv('sr-stats');
    bar.createSpan({ cls: 'sr-stat sr-stat--active', text: `${t.statActiveLabel}: ${active}` });
    bar.createSpan({ cls: 'sr-stat-sep', text: '·' });
    bar.createSpan({ cls: 'sr-stat sr-stat--done',   text: `${t.statDoneLabel}: ${done}` });
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

  // ── Item ───────────────────────────────────────────────────────────────────

  private renderItem(container: HTMLElement, r: Reminder, t: Strings): void {
    const isDone = r.checked;
    const item   = container.createDiv('sr-item' + (isDone ? ' sr-item--done' : ''));

    // Checkbox
    const cb = item.createDiv('sr-cb-wrap').createEl('input', { type: 'checkbox', cls: 'sr-checkbox' });
    cb.checked = r.checked;
    cb.addEventListener('change', async () => {
      r.checked = cb.checked;
      await this.plugin.saveSettings();
      this.refresh();
    });

    // Body
    const body  = item.createDiv('sr-body');
    body.createDiv({ cls: 'sr-title', text: r.title });

    // Schedule row
    const sched = body.createDiv('sr-sched');
    this.renderSchedule(sched, r, t);

    // Next trigger / meta
    if (!isDone) this.renderMeta(body, r, t);

    // Actions
    const acts = item.createDiv('sr-actions');

    const editBtn = acts.createEl('button', { cls: 'sr-edit-btn', text: '✏️' });
    editBtn.setAttribute('aria-label', t.editAriaLabel);
    editBtn.addEventListener('click', () =>
      new AddReminderModal(this.app, this.plugin, () => { this.refresh(); this.plugin.checkReminders(); }, r).open());

    const delBtn = acts.createEl('button', { cls: 'sr-del-btn', text: '✕' });
    delBtn.setAttribute('aria-label', t.deleteAriaLabel);
    delBtn.addEventListener('click', async () => {
      this.plugin.reminders = this.plugin.reminders.filter(x => x.id !== r.id);
      await this.plugin.saveSettings();
      this.refresh();
    });
  }

  // ── Schedule description ───────────────────────────────────────────────────

  private renderSchedule(el: HTMLElement, r: Reminder, t: Strings): void {
    if (r.type === 'specific') {
      el.createSpan({ cls: 'sr-tag sr-tag--once',     text: t.tagOnce });
      el.createSpan({ cls: 'sr-sched-text', text: fmtDate(r.specificTs) });
      return;
    }
    if (r.type === 'calendar') {
      el.createSpan({ cls: 'sr-tag sr-tag--calendar', text: t.tagCalendar });
      el.createSpan({ cls: 'sr-sched-text', text: this.calendarSummary(r, t) });
      return;
    }
    if (r.type === 'periodic') {
      el.createSpan({ cls: 'sr-tag sr-tag--periodic', text: t.tagPeriodic });
      el.createSpan({ cls: 'sr-sched-text', text: this.periodicSummary(r, t) });
      return;
    }
    // flexible / interval
    el.createSpan({ cls: 'sr-tag sr-tag--repeat', text: t.tagRepeat });
    el.createSpan({ cls: 'sr-sched-text', text: `${r.interval} ${t.fieldIntervalUnit}` });
    if (r.timeWindowStart && r.timeWindowEnd)
      el.createSpan({ cls: 'sr-badge sr-badge--time', text: `${r.timeWindowStart}–${r.timeWindowEnd}` });
    if (r.daysOfWeek && r.daysOfWeek.length > 0)
      el.createSpan({ cls: 'sr-badge sr-badge--days', text: r.daysOfWeek.map(d => t.daysShort[d]).join(' ') });
    if (r.endTs)
      el.createSpan({ cls: 'sr-badge sr-badge--end', text: `${t.endsLabel} ${fmtDateShort(r.endTs)}` });
  }

  private calendarSummary(r: Reminder, t: Strings): string {
    const time = r.calendarTime ?? '—';
    switch (r.calendarUnit) {
      case 'day':   return t.calSummaryDay(time);
      case 'week':  return t.calSummaryWeek(
        (r.calendarDayOfWeek ?? []).map(d => t.daysShort[d]).join(' '), time);
      case 'month': return t.calSummaryMonth(r.calendarDayOfMonth ?? 1, time);
      case 'year':  return t.calSummaryYear(
        r.calendarDayOfMonth ?? 1, t.monthsShort[r.calendarMonth ?? 0], time);
      default: return time;
    }
  }

  private periodicSummary(r: Reminder, t: Strings): string {
    const n     = r.periodicN    ?? 1;
    const time  = r.periodicTime ?? '—';
    const start = r.periodicStart != null ? new Date(r.periodicStart) : new Date();
    switch (r.periodicUnit) {
      case 'day':   return t.sumPeriodicDay(n, fmtDateShort(r.periodicStart), time);
      case 'week':  return t.sumPeriodicWeek(n, isoWeekNumber(start), start.getFullYear(), time);
      case 'month': return t.sumPeriodicMonth(n, t.monthsShort[start.getMonth()], start.getFullYear(), time);
      case 'year':  return t.sumPeriodicYear(n, start.getFullYear(), time);
      default:      return `${n} × ${r.periodicUnit ?? '?'}`;
    }
  }

  // ── Meta row ───────────────────────────────────────────────────────────────

  private renderMeta(body: HTMLElement, r: Reminder, t: Strings): void {
    const meta = body.createDiv('sr-next');
    if (r.nextTrigger != null) {
      meta.createSpan({ cls: 'sr-next-label', text: t.nextLabel });
      meta.createSpan({ cls: 'sr-next-val',   text: fmtDate(r.nextTrigger) });
    } else {
      meta.createSpan({ cls: 'sr-next-fired', text: t.alreadyFired });
    }
    if (r.startTs && r.startTs > Date.now())
      meta.createSpan({ cls: 'sr-next-start', text: `▶ ${fmtDate(r.startTs)}` });
  }

  private openAddModal(): void {
    new AddReminderModal(this.app, this.plugin, () => { this.refresh(); this.plugin.checkReminders(); }).open();
  }
}
