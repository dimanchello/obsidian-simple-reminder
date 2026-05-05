import {ItemView, WorkspaceLeaf} from 'obsidian';
import type SimpleReminderPlugin from './main';
import {AddReminderModal} from './AddReminderModal';
import {fmtDate} from './utils';
import {Reminder} from './types';
import {Strings} from './i18n';

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

    async onClose(): Promise<void> {
    }

    refresh(): void {
        this.render();
    }

    // ── Main render ────────────────────────────────────────────────────────────

    private render(): void {
        const t = this.plugin.t;
        const root = this.containerEl.children[1] as HTMLElement;
        root.empty();
        root.addClass('sr-root');

        this.renderHeader(root, t);
        this.renderStats(root, t);
        this.renderList(root, t);
    }

    // ── Header ─────────────────────────────────────────────────────────────────

    private renderHeader(root: HTMLElement, t: Strings): void {
        const header = root.createDiv('sr-header');

        const title = header.createDiv('sr-header-title');
        title.createSpan({cls: 'sr-header-icon', text: '⏰'});
        title.createSpan({cls: 'sr-header-text', text: t.pluginName});

        const addBtn = header.createEl('button', {cls: 'sr-add-btn', text: t.addBtn});
        addBtn.addEventListener('click', () => this.openAddModal());
    }

    // ── Stats bar ──────────────────────────────────────────────────────────────

    private renderStats(root: HTMLElement, t: Strings): void {
        const reminders = this.plugin.reminders;
        const active = reminders.filter(r => !r.checked).length;
        const done = reminders.length - active;

        const bar = root.createDiv('sr-stats');
        bar.createSpan({cls: 'sr-stat sr-stat--active', text: `${t.statActiveLabel}: ${active}`});
        bar.createSpan({cls: 'sr-stat-sep', text: '·'});
        bar.createSpan({cls: 'sr-stat sr-stat--done', text: `${t.statDoneLabel}: ${done}`});
    }

    // ── List ───────────────────────────────────────────────────────────────────

    private renderList(root: HTMLElement, t: Strings): void {
        const list = root.createDiv('sr-list');

        if (this.plugin.reminders.length === 0) {
            const empty = list.createDiv('sr-empty');
            empty.createDiv({cls: 'sr-empty-icon', text: '🔔'});
            empty.createDiv({cls: 'sr-empty-text', text: t.noReminders});
            empty.createDiv({cls: 'sr-empty-hint', text: t.noRemindersHint});
            return;
        }

        // Active first, sorted by nextTrigger; done items go to the bottom
        const sorted = [...this.plugin.reminders].sort((a, b) => {
            if (a.checked !== b.checked) return a.checked ? 1 : -1;
            const nt = (r: Reminder) => r.nextTrigger ?? Infinity;
            return nt(a) - nt(b);
        });

        for (const r of sorted) this.renderItem(list, r, t);
    }

    // ── Single item ────────────────────────────────────────────────────────────

    private renderItem(container: HTMLElement, reminder: Reminder, t: Strings): void {
        const isDone = reminder.checked;
        const item = container.createDiv('sr-item' + (isDone ? ' sr-item--done' : ''));

        // Checkbox
        const cbWrap = item.createDiv('sr-cb-wrap');
        const cb = cbWrap.createEl('input', {type: 'checkbox', cls: 'sr-checkbox'});
        cb.checked = reminder.checked;
        cb.addEventListener('change', async () => {
            reminder.checked = cb.checked;
            await this.plugin.saveSettings();
            this.refresh();
        });

        // Body
        const body = item.createDiv('sr-body');
        body.createDiv({cls: 'sr-title', text: reminder.title});

        // Schedule row
        const sched = body.createDiv('sr-sched');
        if (reminder.type === 'interval') {
            sched.createSpan({cls: 'sr-tag sr-tag--interval', text: t.tagInterval});
            sched.createSpan({cls: 'sr-sched-text', text: t.everyNMin(reminder.interval)});
        } else if (reminder.type === 'specific') {
            sched.createSpan({cls: 'sr-tag sr-tag--specific', text: t.tagOnce});
            sched.createSpan({cls: 'sr-sched-text', text: fmtDate(reminder.specificTs)});
        } else if (reminder.type === 'scheduled') {
            sched.createSpan({cls: 'sr-tag sr-tag--scheduled', text: t.tagScheduled});
            sched.createSpan({
                cls: 'sr-sched-text',
                text: t.withDateEvery(fmtDate(reminder.startTs), reminder.interval),
            });
        }

        // Next trigger row
        if (!isDone) {
            const nextWrap = body.createDiv('sr-next');
            if (reminder.nextTrigger !== null && reminder.nextTrigger !== undefined) {
                nextWrap.createSpan({cls: 'sr-next-label', text: t.nextLabel});
                nextWrap.createSpan({cls: 'sr-next-val', text: fmtDate(reminder.nextTrigger)});
            } else if (reminder.type === 'specific') {
                nextWrap.createSpan({cls: 'sr-next-fired', text: t.alreadyFired});
            }
        }

        // Action buttons
        const acts = item.createDiv('sr-actions');

        // Edit button
        const editBtn = acts.createEl('button', {cls: 'sr-edit-btn', text: '✏️'});
        editBtn.setAttribute('aria-label', t.editAriaLabel);
        editBtn.addEventListener('click', () => {
            new AddReminderModal(this.app, this.plugin, () => {
                this.refresh();
                this.plugin.checkReminders();
            }, reminder).open();
        });

        // Delete button
        const delBtn = acts.createEl('button', {cls: 'sr-del-btn', text: '✕'});
        delBtn.setAttribute('aria-label', t.deleteAriaLabel);
        delBtn.addEventListener('click', async () => {
            this.plugin.reminders = this.plugin.reminders.filter(r => r.id !== reminder.id);
            await this.plugin.saveSettings();
            this.refresh();
        });
    }

    // ── Open modal ─────────────────────────────────────────────────────────────

    private openAddModal(): void {
        new AddReminderModal(this.app, this.plugin, () => {
            this.refresh();
            this.plugin.checkReminders();
        }).open();
    }
}
