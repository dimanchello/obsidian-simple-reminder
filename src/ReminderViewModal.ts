import { App, Modal } from 'obsidian';
import { Reminder, DEFAULT_EMOJI } from './types';
import { Strings } from './i18n';
import { fmtDate, fmtDateShort, remindBeforeToMs } from './utils';

export class ReminderViewModal extends Modal {
  private reminder: Reminder;
  private t: Strings;

  constructor(app: App, reminder: Reminder, t: Strings) {
    super(app);
    this.reminder = reminder;
    this.t = t;
  }

  onOpen() {
    const { contentEl, reminder, t } = this;
    contentEl.addClass('sr-view-modal');

    const header = contentEl.createDiv('sr-view-header');
    header.createDiv({ cls: 'sr-view-icon', text: reminder.emoji || DEFAULT_EMOJI });
    header.createEl('h2', { cls: 'sr-view-title', text: reminder.title });

    const schedWrap = contentEl.createDiv('sr-view-sched');
    this.renderSchedule(schedWrap, reminder, t);

    if (reminder.description) {
      const descWrap = contentEl.createDiv('sr-view-desc-wrap');
      descWrap.createEl('h4', { text: t.descriptionTitle });
      const desc = descWrap.createDiv('sr-view-desc');
      desc.textContent = reminder.description;
    }

    if (reminder.remindBefore && reminder.remindBefore.length > 0) {
      const rbWrap = contentEl.createDiv('sr-view-rb-wrap');
      rbWrap.createEl('h4', { text: t.remindBeforeLabel });
      const scrollWrap = rbWrap.createDiv('sr-view-rb-scroll');
      const ul = scrollWrap.createEl('ul', { cls: 'sr-view-rb-list' });

      const sortedRb = [...reminder.remindBefore].sort(
        (a, b) => remindBeforeToMs(b.value, b.unit) - remindBeforeToMs(a.value, a.unit),
      );

      sortedRb.forEach((rb) => {
        const li = ul.createEl('li', { cls: 'sr-view-rb-item' });
        let triggerMs = rb.trigger;
        if (!triggerMs) {
          const target = reminder.nextTrigger ?? reminder.specificTs ?? reminder.completedAt;
          if (target) {
            triggerMs = target - remindBeforeToMs(rb.value, rb.unit);
          }
        }

        const isPast = triggerMs ? triggerMs <= Date.now() : true;

        const leftContent = li.createDiv({ cls: 'sr-view-rb-left' });
        leftContent.createDiv({ cls: 'sr-view-rb-val', text: t.formatRemindBefore(rb.value, rb.unit) });
        if (triggerMs) {
          leftContent.createDiv({ cls: 'sr-view-rb-date', text: fmtDate(triggerMs) });
        }

        if (isPast) {
          const rightContent = li.createDiv({ cls: 'sr-view-rb-right' });
          rightContent.createSpan({ text: '✅' });
        }
      });
    }

    if (reminder.nextTrigger) {
      const nextWrap = contentEl.createDiv('sr-view-next-wrap');
      nextWrap.createSpan({ cls: 'sr-view-next-label', text: t.nextLabel });
      nextWrap.createSpan({ cls: 'sr-view-next-val', text: fmtDate(reminder.nextTrigger) });
    }
  }

  onClose() {
    this.contentEl.empty();
  }

  private renderSchedule(el: HTMLElement, r: Reminder, t: Strings): void {
    if (r.type === 'once') {
      el.createSpan({ cls: 'sr-tag sr-tag--once', text: t.tagOnce });
      el.createSpan({ cls: 'sr-sched-text', text: fmtDate(r.specificTs) });
      return;
    }

    el.createSpan({ cls: 'sr-tag sr-tag--repeat', text: t.tagRepeat });

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
}
