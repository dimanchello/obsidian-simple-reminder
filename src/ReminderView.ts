import { ItemView, Modal, WorkspaceLeaf } from 'obsidian';
import type SimpleReminderPlugin from './main';
import { AddReminderModal } from './AddReminderModal';
import { CalendarModal } from './CalendarModal';
import { fmtDate, fmtDateShort } from './utils';
import { Reminder, DEFAULT_EMOJI } from './types';
import { Strings } from './i18n';

export const VIEW_TYPE_REMINDER = 'simple-reminder-view';

function confirmModal(app: import('obsidian').App, message: string, t: Strings, onConfirm: () => void): void {
  const modal = new Modal(app);
  modal.contentEl.addClass('sr-confirm-modal');
  modal.contentEl.createEl('p', { text: message });
  const btnRow = modal.contentEl.createDiv('sr-btn-row');
  btnRow.createEl('button', { cls: 'sr-confirm-yes', text: t.confirmYes }).addEventListener('click', () => {
    onConfirm();
    modal.close();
  });
  btnRow.createEl('button', { cls: 'sr-confirm-no', text: t.confirmNo }).addEventListener('click', () => {
    modal.close();
  });
  modal.open();
}

type TabId = 'all' | 'active' | 'done';

export class ReminderView extends ItemView {
  private plugin: SimpleReminderPlugin;
  private currentTab: TabId;

  constructor(leaf: WorkspaceLeaf, plugin: SimpleReminderPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.currentTab = plugin.settings.activeTab || 'all';
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
    this.renderTabs(root, t);
    this.renderList(root, t);
  }

  private renderHeader(root: HTMLElement, t: Strings): void {
    const header = root.createDiv('sr-header');
    const title = header.createDiv('sr-header-title');
    title.createSpan({ cls: 'sr-header-icon', text: DEFAULT_EMOJI });
    title.createSpan({ cls: 'sr-header-text', text: t.pluginName });
    const btnGroup = header.createDiv('sr-header-btns');
    const calBtn = btnGroup.createEl('button', { cls: 'sr-cal-btn', text: '📅' });
    calBtn.setAttribute('aria-label', t.calendarBtn);
    calBtn.addEventListener('click', () => this.openCalendarModal());
    const addBtn = btnGroup.createEl('button', { cls: 'sr-cal-btn', text: '➕' });
    addBtn.setAttribute('aria-label', t.addBtn);
    addBtn.addEventListener('click', () => this.openAddModal());
  }

  private renderTabs(root: HTMLElement, t: Strings): void {
    const all = this.plugin.reminders.length;
    const active = this.plugin.reminders.filter((r) => !r.checked).length;
    const done = all - active;
    const tabs: { id: TabId; label: string; count: number }[] = [
      { id: 'all', label: t.tabAll, count: all },
      { id: 'active', label: t.tabActive, count: active },
      { id: 'done', label: t.tabDone, count: done },
    ];
    const bar = root.createDiv('sr-tabs');
    for (const tab of tabs) {
      const el = bar.createSpan({
        cls: 'sr-tab' + (this.currentTab === tab.id ? ' sr-tab--active' : ''),
        text: `${tab.label} (${tab.count})`,
      });
      el.addEventListener('click', async () => {
        if (this.currentTab !== tab.id) {
          this.currentTab = tab.id;
          this.plugin.settings.activeTab = tab.id;
          await this.plugin.saveSettings();
          this.render();
        }
      });
    }
  }

  private renderList(root: HTMLElement, t: Strings): void {
    const list = root.createDiv('sr-list');
    const items = this.plugin.reminders.filter((r) => {
      if (this.currentTab === 'active') return !r.checked;
      if (this.currentTab === 'done') return r.checked;
      return true;
    });
    if (items.length === 0) {
      const empty = list.createDiv('sr-empty');
      empty.createDiv({ cls: 'sr-empty-icon', text: '🔔' });
      empty.createDiv({ cls: 'sr-empty-text', text: t.noReminders });
      empty.createDiv({ cls: 'sr-empty-hint', text: t.noRemindersHint });
      return;
    }
    const sorted = [...items].sort((a, b) => {
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
      if (cb.checked) r.completedAt = Date.now();
      else r.completedAt = null;
      await this.plugin.saveSettings();
      this.refresh();
    });

    const body = item.createDiv('sr-body');
    body.createDiv({ cls: 'sr-title', text: `${r.emoji || DEFAULT_EMOJI} ${r.title}` });

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
      confirmModal(this.app, t.deleteConfirm, t, async () => {
        this.plugin.reminders = this.plugin.reminders.filter((x) => x.id !== r.id);
        await this.plugin.saveSettings();
        this.refresh();
      });
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
    const prefix = n === 1 ? t.periodicEverySingular : t.periodicEvery;
    let unitLabel: string;
    if (n === 1) {
      unitLabel = t.periodicUnitSingular[unitIdx];
    } else if (n >= 2 && n <= 4) {
      unitLabel = t.periodicUnitFew[unitIdx];
    } else {
      unitLabel = t.periodicUnitLabels[unitIdx];
    }
    parts.push(`${prefix} ${n} ${unitLabel}`);

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
