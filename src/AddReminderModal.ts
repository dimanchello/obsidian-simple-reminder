import {App, Modal, Notice} from 'obsidian';
import type SimpleReminderPlugin from './main';
import {Reminder, ReminderType} from './types';
import {generateId, calcNextTrigger} from './utils';
import {Strings} from './i18n';

interface FormData {
    title: string;
    type: ReminderType;
    interval: number;
    specificDate: string;
    startDate: string;
}

/** Convert a UTC timestamp to the local datetime-local string (YYYY-MM-DDTHH:MM). */
function tsToDatetimeLocal(ts: number): string {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export class AddReminderModal extends Modal {
    private plugin: SimpleReminderPlugin;
    private onSaveCallback: () => void;
    private existing: Reminder | null;
    private fd: FormData;
    private dynEl!: HTMLElement;

    /**
     * @param existing  Pass an existing Reminder to open in edit mode,
     *                  or null / undefined to open in create mode.
     */
    constructor(
        app: App,
        plugin: SimpleReminderPlugin,
        onSave: () => void,
        existing?: Reminder | null,
    ) {
        super(app);
        this.plugin = plugin;
        this.onSaveCallback = onSave;
        this.existing = existing ?? null;

        if (existing) {
            this.fd = {
                title: existing.title,
                type: existing.type,
                interval: existing.interval,
                specificDate: existing.specificTs ? tsToDatetimeLocal(existing.specificTs) : '',
                startDate: existing.startTs ? tsToDatetimeLocal(existing.startTs) : '',
            };
        } else {
            this.fd = {title: '', type: 'interval', interval: 15, specificDate: '', startDate: ''};
        }
    }

    // ── Build ──────────────────────────────────────────────────────────────────

    onOpen(): void {
        const {contentEl} = this;
        contentEl.addClass('sr-modal');
        const t = this.plugin.t;
        const isEdit = this.existing !== null;

        const mHeader = contentEl.createDiv('sr-modal-header');
        mHeader.createSpan({cls: 'sr-modal-icon', text: isEdit ? '✏️' : '➕'});
        mHeader.createEl('h3', {cls: 'sr-modal-title', text: isEdit ? t.modalEditTitle : t.modalTitle});

        this.buildForm(contentEl.createDiv('sr-modal-form'), t, isEdit);
    }

    onClose(): void {
        this.contentEl.empty();
    }

    // ── Form ───────────────────────────────────────────────────────────────────

    private buildForm(form: HTMLElement, t: Strings, isEdit: boolean): void {
        form.empty();

        // 1. Title
        const g1 = form.createDiv('sr-field-group');
        g1.createEl('label', {cls: 'sr-label', text: t.fieldName});
        const titleInput = g1.createEl('input', {cls: 'sr-input', type: 'text', placeholder: t.fieldNamePlaceholder});
        titleInput.value = this.fd.title;
        titleInput.addEventListener('input', (e) => {
            this.fd.title = (e.target as HTMLInputElement).value;
        });
        titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.save(isEdit);
        });
        setTimeout(() => titleInput.focus(), 50);

        // 2. Type selector
        const g2 = form.createDiv('sr-field-group');
        g2.createEl('label', {cls: 'sr-label', text: t.fieldType});
        const typeSelect = g2.createEl('select', {cls: 'sr-select'});

        const types: [ReminderType, string][] = [
            ['interval', t.typeInterval],
            ['specific', t.typeSpecific],
            ['scheduled', t.typeScheduled],
        ];
        for (const [val, text] of types) {
            const opt = typeSelect.createEl('option', {text});
            opt.value = val;
            if (val === this.fd.type) opt.selected = true;
        }
        typeSelect.addEventListener('change', (e) => {
            this.fd.type = (e.target as HTMLSelectElement).value as ReminderType;
            this.buildDynamic(t);
        });

        // 3. Dynamic fields
        this.dynEl = form.createDiv('sr-dynamic');
        this.buildDynamic(t);

        // 4. Buttons
        const btnRow = form.createDiv('sr-btn-row');
        btnRow.createEl('button', {cls: 'sr-save-btn', text: isEdit ? t.updateBtn : t.saveBtn})
            .addEventListener('click', () => this.save(isEdit));
        btnRow.createEl('button', {cls: 'sr-cancel-btn', text: t.cancelBtn})
            .addEventListener('click', () => this.close());
    }

    private buildDynamic(t: Strings): void {
        const dyn = this.dynEl;
        dyn.empty();

        if (this.fd.type === 'interval') {
            const g = dyn.createDiv('sr-field-group');
            g.createEl('label', {cls: 'sr-label', text: t.fieldInterval});
            const inp = g.createEl('input', {cls: 'sr-input sr-input--short', type: 'number'});
            inp.min = '1';
            inp.value = String(this.fd.interval);
            inp.addEventListener('input', (e) => {
                const v = parseInt((e.target as HTMLInputElement).value, 10);
                this.fd.interval = Math.max(1, isNaN(v) ? 1 : v);
            });
        }

        if (this.fd.type === 'specific') {
            const g = dyn.createDiv('sr-field-group');
            g.createEl('label', {cls: 'sr-label', text: t.fieldDateTime});
            const inp = g.createEl('input', {cls: 'sr-input', type: 'datetime-local'});
            if (this.fd.specificDate) inp.value = this.fd.specificDate;
            inp.addEventListener('change', (e) => {
                this.fd.specificDate = (e.target as HTMLInputElement).value;
            });
        }

        if (this.fd.type === 'scheduled') {
            const g1 = dyn.createDiv('sr-field-group');
            g1.createEl('label', {cls: 'sr-label', text: t.fieldStartDate});
            g1.createEl('span', {cls: 'sr-label-desc', text: t.fieldStartDateDesc});
            const dateInp = g1.createEl('input', {cls: 'sr-input', type: 'datetime-local'});
            if (this.fd.startDate) dateInp.value = this.fd.startDate;
            dateInp.addEventListener('change', (e) => {
                this.fd.startDate = (e.target as HTMLInputElement).value;
            });

            const g2 = dyn.createDiv('sr-field-group');
            g2.createEl('label', {cls: 'sr-label', text: t.fieldInterval});
            const intInp = g2.createEl('input', {cls: 'sr-input sr-input--short', type: 'number'});
            intInp.min = '1';
            intInp.value = String(this.fd.interval);
            intInp.addEventListener('input', (e) => {
                const v = parseInt((e.target as HTMLInputElement).value, 10);
                this.fd.interval = Math.max(1, isNaN(v) ? 1 : v);
            });

            dyn.createDiv({cls: 'sr-hint', text: t.scheduledHint});
        }
    }

    // ── Save / Update ──────────────────────────────────────────────────────────

    private save(isEdit: boolean): void {
        const d = this.fd;
        const t = this.plugin.t;
        const now = Date.now();

        if (!d.title.trim()) {
            new Notice(t.errNoTitle);
            return;
        }

        if (isEdit && this.existing) {
            if (!this.applyEdit(this.existing, d, t, now)) return;
            this.plugin.saveSettings();
            new Notice(t.okUpdated);
        } else {
            const reminder = this.buildNew(d, t, now);
            if (!reminder) return;
            this.plugin.reminders.push(reminder);
            this.plugin.saveSettings();
            new Notice(t.okAdded);
        }

        this.onSaveCallback();
        this.close();
    }

    /** Mutate an existing reminder in-place. Returns false on validation error. */
    private applyEdit(reminder: Reminder, d: FormData, t: Strings, now: number): boolean {
        reminder.title = d.title.trim();
        reminder.type = d.type;
        reminder.interval = d.interval;

        if (d.type === 'interval') {
            reminder.specificTs = null;
            reminder.startTs = null;
            // Reset timer from now with the new interval
            reminder.nextTrigger = now + d.interval * 60_000;

        } else if (d.type === 'specific') {
            if (!d.specificDate) {
                new Notice(t.errNoDate);
                return false;
            }
            const ts = new Date(d.specificDate).getTime();
            if (isNaN(ts)) {
                new Notice(t.errBadDate);
                return false;
            }
            reminder.specificTs = ts;
            reminder.startTs = null;
            reminder.nextTrigger = ts > now ? ts : null;

        } else if (d.type === 'scheduled') {
            if (!d.startDate) {
                new Notice(t.errNoStartDate);
                return false;
            }
            const startTs = new Date(d.startDate).getTime();
            if (isNaN(startTs)) {
                new Notice(t.errBadDate);
                return false;
            }
            reminder.specificTs = null;
            reminder.startTs = startTs;
            reminder.nextTrigger = calcNextTrigger(reminder, now);
        }

        return true;
    }

    /** Build a brand-new Reminder. Returns null on validation error. */
    private buildNew(d: FormData, t: Strings, now: number): Reminder | null {
        const reminder: Reminder = {
            id: generateId(), title: d.title.trim(), type: d.type,
            checked: false, interval: d.interval,
            nextTrigger: null, specificTs: null, startTs: null,
        };

        if (d.type === 'interval') {
            reminder.nextTrigger = now + d.interval * 60_000;

        } else if (d.type === 'specific') {
            if (!d.specificDate) {
                new Notice(t.errNoDate);
                return null;
            }
            const ts = new Date(d.specificDate).getTime();
            if (isNaN(ts)) {
                new Notice(t.errBadDate);
                return null;
            }
            reminder.specificTs = ts;
            reminder.nextTrigger = ts;

        } else if (d.type === 'scheduled') {
            if (!d.startDate) {
                new Notice(t.errNoStartDate);
                return null;
            }
            const startTs = new Date(d.startDate).getTime();
            if (isNaN(startTs)) {
                new Notice(t.errBadDate);
                return null;
            }
            reminder.startTs = startTs;
            reminder.nextTrigger = calcNextTrigger(reminder, now);
        }

        return reminder;
    }
}
