import { ItemView, WorkspaceLeaf } from 'obsidian';
import type SimpleReminderPlugin from './main';
import { AddReminderModal } from './AddReminderModal';
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
    const addBtn = header.createEl('button', { cls: 'sr-add-btn', text: t.addBtn });
    addBtn.addEventListener('click', () => this.openAddModal());
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
      const nt = (r: Reminder) => r.nextTrigger ?? Infinity;
      return nt(a) - nt(b);
    });

    for (const r of sorted) this.renderItem(list, r, t);
  }

  // ── Item ───────────────────────────────────────────────────────────────────

  private renderItem(container: HTMLElement, r: Reminder, t: Strings): void {
    const isDone = r.checked;
    const item   = container.createDiv('sr-item' + (isDone ? ' sr-item--done' : ''));

    // Checkbox
    const cbWrap = item.createDiv('sr-cb-wrap');
    const cb     = cbWrap.createEl('input', { type: 'checkbox', cls: 'sr-checkbox' });
    cb.checked   = r.checked;
    cb.addEventListener('change', async () => {
      r.checked = cb.checked;
      await this.plugin.saveSettings();
      this.refresh();
    });

    // Body
    const body = item.createDiv('sr-body');
    body.createDiv({ cls: 'sr-title', text: r.title });

    // Tags + schedule info
    const sched = body.createDiv('sr-sched');
    this.renderSchedule(sched, r, t);

    // Meta row: next trigger + constraints summary
    if (!isDone) this.renderMeta(body, r, t);

    // Action buttons
    const acts   = item.createDiv('sr-actions');
    const editBtn = acts.createEl('button', { cls: 'sr-edit-btn', text: '✏️' });
    editBtn.setAttribute('aria-label', t.editAriaLabel);
    editBtn.addEventListener('click', () => {
      new AddReminderModal(this.app, this.plugin, () => {
        this.refresh();
        this.plugin.checkReminders();
      }, r).open();
    });

    const delBtn = acts.createEl('button', { cls: 'sr-del-btn', text: '✕' });
    delBtn.setAttribute('aria-label', t.deleteAriaLabel);
    delBtn.addEventListener('click', async () => {
      this.plugin.reminders = this.plugin.reminders.filter(x => x.id !== r.id);
      await this.plugin.saveSettings();
      this.refresh();
    });
  }

  // ── Schedule tags ──────────────────────────────────────────────────────────

  private renderSchedule(sched: HTMLElement, r: Reminder, t: Strings): void {
    if (r.type === 'specific') {
      sched.createSpan({ cls: 'sr-tag sr-tag--once', text: t.tagOnce });
      sched.createSpan({ cls: 'sr-sched-text', text: fmtDate(r.specificTs) });
      return;
    }

    // Repeat types
    sched.createSpan({ cls: 'sr-tag sr-tag--repeat', text: t.tagRepeat });
    sched.createSpan({ cls: 'sr-sched-text', text: `${r.interval} ${t.fieldIntervalUnit}` });

    // Constraint badges
    if (r.timeWindowStart && r.timeWindowEnd) {
      sched.createSpan({ cls: 'sr-badge sr-badge--time', text: `${r.timeWindowStart}–${r.timeWindowEnd}` });
    }

    if (r.daysOfWeek && r.daysOfWeek.length > 0) {
      const dayStr = r.daysOfWeek.map(d => t.daysShort[d]).join(' ');
      sched.createSpan({ cls: 'sr-badge sr-badge--days', text: dayStr });
    }

    if (r.endTs) {
      sched.createSpan({ cls: 'sr-badge sr-badge--end', text: `${t.endsLabel} ${fmtDateShort(r.endTs)}` });
    }
  }

  // ── Meta row ───────────────────────────────────────────────────────────────

  private renderMeta(body: HTMLElement, r: Reminder, t: Strings): void {
    const meta = body.createDiv('sr-next');

    if (r.nextTrigger !== null && r.nextTrigger !== undefined) {
      meta.createSpan({ cls: 'sr-next-label', text: t.nextLabel });
      meta.createSpan({ cls: 'sr-next-val',   text: fmtDate(r.nextTrigger) });
    } else if (r.type === 'specific') {
      meta.createSpan({ cls: 'sr-next-fired', text: t.alreadyFired });
    } else {
      meta.createSpan({ cls: 'sr-next-fired', text: t.alreadyFired });
    }

    if (r.startTs && r.startTs > Date.now()) {
      meta.createSpan({ cls: 'sr-next-start', text: `▶ ${fmtDate(r.startTs)}` });
    }
  }

  private openAddModal(): void {
    new AddReminderModal(this.app, this.plugin, () => {
      this.refresh();
      this.plugin.checkReminders();
    }).open();
  }
}
