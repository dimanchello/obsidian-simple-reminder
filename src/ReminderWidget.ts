import { Modal } from 'obsidian';
import type SimpleReminderPlugin from './main';
import { AddReminderModal } from './AddReminderModal';
import { CalendarModal } from './CalendarModal';
import { ReminderViewModal } from './ReminderViewModal';
import { fmtDate, formatScheduleSummary, groupReminders } from './utils';
import { Reminder, GroupBy, DEFAULT_EMOJI } from './types';
import { Strings } from './i18n';

export type TabId = 'all' | 'active' | 'done';

export function confirmModal(app: import('obsidian').App, message: string, t: Strings, onConfirm: () => void): void {
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

export interface ReminderWidgetOptions {
  containerEl: HTMLElement;
  plugin: SimpleReminderPlugin;
  initialTab?: TabId;
  groupBy?: GroupBy;
  showHeader?: boolean;
  showTabs?: boolean;
  title?: string;
  isEmbedded?: boolean;
  onTabChange?: (tab: TabId) => void;
}

export class ReminderWidget {
  private containerEl: HTMLElement;
  private plugin: SimpleReminderPlugin;
  private currentTab: TabId;
  private groupBy?: GroupBy;
  private showHeader: boolean;
  private showTabs: boolean;
  private title?: string;
  private isEmbedded: boolean;
  private onTabChange?: (tab: TabId) => void;

  constructor(options: ReminderWidgetOptions) {
    this.containerEl = options.containerEl;
    this.plugin = options.plugin;
    this.currentTab = options.initialTab ?? this.plugin.settings.activeTab ?? 'all';
    this.groupBy = options.groupBy;
    this.showHeader = options.showHeader ?? true;
    this.showTabs = options.showTabs ?? true;
    this.title = options.title;
    this.isEmbedded = options.isEmbedded ?? false;
    this.onTabChange = options.onTabChange;
  }

  setTab(tab: TabId): void {
    this.currentTab = tab;
    if (this.onTabChange) {
      this.onTabChange(tab);
    }
  }

  render(): void {
    const t = this.plugin.t;
    const root = this.containerEl;
    root.empty();
    root.addClass('sr-root');
    if (this.isEmbedded) {
      root.addClass('sr-embedded');
    }

    if (this.showHeader) {
      this.renderHeader(root, t);
    }
    if (this.showTabs) {
      this.renderTabs(root, t);
    }
    this.renderList(root, t);
  }

  private renderHeader(root: HTMLElement, t: Strings): void {
    const header = root.createDiv('sr-header');
    const title = header.createDiv('sr-header-title');
    title.createSpan({ cls: 'sr-header-icon', text: DEFAULT_EMOJI });
    title.createSpan({ cls: 'sr-header-text', text: this.title || t.pluginName });
    const btnGroup = header.createDiv('sr-header-btns');
    const calBtn = btnGroup.createEl('button', { cls: 'sr-cal-btn', text: '📅' });
    calBtn.setAttribute('aria-label', t.calendarBtn);
    calBtn.addEventListener('click', () => this.openCalendarModal());
    const addBtn = btnGroup.createEl('button', { cls: 'sr-cal-btn', text: '➕' });
    addBtn.setAttribute('aria-label', t.addBtn);
    addBtn.addEventListener('click', () => this.openAddModal());
  }

  private renderTabs(root: HTMLElement, t: Strings): void {
    const all = this.plugin.allReminders.length;
    const active = this.plugin.allReminders.filter((r) => !r.checked).length;
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
      el.addEventListener('click', () => {
        if (this.currentTab !== tab.id) {
          this.setTab(tab.id);
          this.render();
        }
      });
    }
  }

  private renderList(root: HTMLElement, t: Strings): void {
    const list = root.createDiv('sr-list');
    const items = this.plugin.allReminders.filter((r) => {
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

    const groupBy = this.groupBy ?? this.plugin.settings.groupBy;
    const groups = groupReminders(sorted, groupBy, t);

    for (const group of groups) {
      if (groupBy !== 'none' && group.label) {
        const divider = list.createDiv('sr-group-divider');
        divider.createSpan({ cls: 'sr-group-divider-text', text: group.label });
      }
      for (const r of group.items) this.renderItem(list, r, t);
    }
  }

  private renderItem(container: HTMLElement, r: Reminder, t: Strings): void {
    const isDone = r.checked;
    const item = container.createDiv('sr-item' + (isDone ? ' sr-item--done' : ''));

    const cb = item.createDiv('sr-cb-wrap').createEl('input', { type: 'checkbox', cls: 'sr-checkbox' });
    cb.checked = r.checked;
    cb.addEventListener('change', () => {
      this.plugin.api.setChecked(r.id, cb.checked);
    });

    const body = item.createDiv('sr-body');
    body.createDiv({ cls: 'sr-title', text: `${r.emoji || DEFAULT_EMOJI} ${r.title}` });

    body.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.sr-cb-wrap, .sr-actions')) {
        return;
      }
      new ReminderViewModal(this.plugin.app, r, t).open();
    });

    const sched = body.createDiv('sr-sched');
    this.renderSchedule(sched, r, t);

    if (!isDone && r.type === 'repeat') {
      this.renderMeta(body, r, t);
    }

    const acts = item.createDiv('sr-actions');

    const editBtn = acts.createEl('button', { cls: 'sr-edit-btn', text: '✏️' });
    editBtn.setAttribute('aria-label', t.editAriaLabel);
    editBtn.addEventListener('click', () =>
      new AddReminderModal(
        this.plugin.app,
        this.plugin,
        () => {
          this.plugin.refreshView();
          this.plugin.checkReminders();
        },
        r,
      ).open(),
    );

    const delBtn = acts.createEl('button', { cls: 'sr-del-btn', text: '✕' });
    delBtn.setAttribute('aria-label', t.deleteAriaLabel);
    delBtn.addEventListener('click', () => {
      confirmModal(this.plugin.app, t.deleteConfirm, t, () => {
        this.plugin.api.removeReminder(r.id);
      });
    });
  }

  private renderSchedule(el: HTMLElement, r: Reminder, t: Strings): void {
    const summary = formatScheduleSummary(r, t);
    el.createSpan({ cls: summary.tagCls, text: summary.tagText });
    el.createSpan({ cls: 'sr-sched-text', text: summary.mainText });
    if (summary.endBadgeText) {
      el.createSpan({ cls: 'sr-badge sr-badge--end', text: summary.endBadgeText });
    }
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
    new AddReminderModal(this.plugin.app, this.plugin, () => {
      this.plugin.refreshView();
      this.plugin.checkReminders();
    }).open();
  }

  private openCalendarModal(): void {
    new CalendarModal(this.plugin.app, this.plugin).open();
  }
}
