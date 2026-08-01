import { App, Modal } from 'obsidian';
import type SimpleReminderPlugin from './main';
import { Reminder, DEFAULT_EMOJI } from './types';
import { isValidDay } from './utils';

const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

function monFirstPos(jsDay: number): number {
  return (jsDay + 6) % 7;
}

export class CalendarModal extends Modal {
  private plugin: SimpleReminderPlugin;
  private viewMonth: number | null;
  private selYear: number;
  private selMonth: number;
  private selDay: number | null;

  constructor(app: App, plugin: SimpleReminderPlugin) {
    super(app);
    this.plugin = plugin;
    const now = new Date();
    this.viewMonth = null;
    this.selYear = now.getFullYear();
    this.selMonth = now.getMonth();
    this.selDay = null;
  }

  onOpen(): void {
    const narrow = window.innerWidth < 640;
    this.modalEl.style.width = narrow ? '96vw' : '55vw';
    this.modalEl.style.maxWidth = narrow ? '100vw' : '560px';
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('sr-cal-modal');

    if (this.viewMonth === null) {
      this.renderYearView(contentEl);
    } else {
      this.renderMonthView(contentEl);
    }
  }

  private renderYearView(container: HTMLElement): void {
    const t = this.plugin.t;
    const header = container.createDiv('sr-cal-header');
    const prevBtn = header.createEl('button', { cls: 'sr-cal-nav-btn', text: '◀' });
    prevBtn.addEventListener('click', () => {
      this.selYear--;
      this.render();
    });
    header.createSpan({ cls: 'sr-cal-title', text: `${this.selYear}` });
    const nextBtn = header.createEl('button', { cls: 'sr-cal-nav-btn', text: '▶' });
    nextBtn.addEventListener('click', () => {
      this.selYear++;
      this.render();
    });

    const grid = container.createDiv('sr-cal-year-grid');
    for (let m = 0; m < 12; m++) {
      const card = grid.createDiv('sr-cal-month-card');
      card.createDiv({ cls: 'sr-cal-month-label', text: t.monthsShort[m] });
      this.renderMiniMonth(card, this.selYear, m);
    }
  }

  private renderMiniMonth(container: HTMLElement, year: number, month: number): void {
    const t = this.plugin.t;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayPos = monFirstPos(new Date(year, month, 1).getDay());

    const grid = container.createDiv('sr-cal-mini-grid');
    for (let i = 0; i < 7; i++) {
      grid.createDiv({ cls: 'sr-cal-mini-dow', text: t.daysShort[MON_FIRST[i]] });
    }
    for (let i = 0; i < firstDayPos; i++) {
      grid.createDiv('sr-cal-mini-empty');
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const cell = grid.createDiv('sr-cal-mini-day');
      cell.createDiv({ cls: 'sr-cal-mini-day-num', text: String(day) });

      const today = new Date();
      if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
        cell.addClass('sr-cal-mini-day--today');
      }

      const cnt = this.countForDay(year, month, day);
      if (cnt > 0) {
        const dots = cell.createDiv('sr-cal-mini-dots');
        const n = Math.min(cnt, 3);
        for (let i = 0; i < n; i++) {
          dots.createSpan('sr-cal-mini-dot');
        }
      }

      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        this.viewMonth = month;
        this.selYear = year;
        this.selMonth = month;
        this.selDay = day;
        this.render();
      });
    }
  }

  private renderMonthView(container: HTMLElement): void {
    const t = this.plugin.t;

    const header = container.createDiv('sr-cal-header');
    const backBtn = header.createEl('button', { cls: 'sr-cal-back-btn', text: '← ' + t.calendarBack });
    backBtn.addEventListener('click', () => {
      this.viewMonth = null;
      this.selDay = null;
      this.render();
    });
    header.createSpan({ cls: 'sr-cal-title', text: `${t.monthsFull[this.selMonth]} ${this.selYear}` });

    const main = container.createDiv('sr-cal-month-main');
    const left = main.createDiv('sr-cal-month-left');
    this.renderFullMonth(left);

    const right = main.createDiv('sr-cal-month-right');
    if (this.selDay != null) {
      this.renderDayReminders(right);
    }
  }

  private renderFullMonth(container: HTMLElement): void {
    const t = this.plugin.t;
    const year = this.selYear;
    const month = this.selMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayPos = monFirstPos(new Date(year, month, 1).getDay());

    const grid = container.createDiv('sr-cal-month-grid');
    for (let i = 0; i < 7; i++) {
      grid.createDiv({ cls: 'sr-cal-month-dow', text: t.daysShort[MON_FIRST[i]] });
    }
    for (let i = 0; i < firstDayPos; i++) {
      grid.createDiv('sr-cal-month-empty');
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const cell = grid.createDiv('sr-cal-month-day');
      if (this.selDay === day) {
        cell.addClass('sr-cal-month-day--selected');
      }

      const today = new Date();
      if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
        cell.addClass('sr-cal-month-day--today');
      }

      cell.createDiv({ cls: 'sr-cal-month-day-num', text: String(day) });

      const cnt = this.countForDay(year, month, day);
      if (cnt > 0) {
        const dots = cell.createDiv('sr-cal-month-dots');
        const n = Math.min(cnt, 3);
        for (let i = 0; i < n; i++) {
          dots.createSpan('sr-cal-month-dot');
        }
      }

      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selDay = day;
        this.selYear = year;
        this.selMonth = month;
        this.render();
      });
    }
  }

  private renderDayReminders(container: HTMLElement): void {
    const t = this.plugin.t;
    const dateStr = `${t.monthsFull[this.selMonth]} ${this.selDay}, ${this.selYear}`;
    container.createDiv({ cls: 'sr-cal-day-header', text: `${t.calendarRemindersFor} ${dateStr}` });

    const reminders = this.getRemindersForDay(this.selYear, this.selMonth, this.selDay!);
    if (reminders.length === 0) {
      container.createDiv({ cls: 'sr-cal-day-empty', text: t.calendarNoReminders });
      return;
    }

    const list = container.createDiv('sr-cal-day-list');
    for (const r of reminders) {
      const item = list.createDiv('sr-cal-day-item');
      item.createSpan({ cls: 'sr-cal-day-item-emoji', text: r.emoji || DEFAULT_EMOJI });
      const body = item.createDiv('sr-cal-day-item-body');
      body.createDiv({ cls: 'sr-cal-day-item-title', text: r.title });
      if (r.type === 'once' && r.specificTs) {
        body.createDiv({
          cls: 'sr-cal-day-item-time',
          text: new Date(r.specificTs).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        });
      } else if (r.type === 'repeat') {
        const tm = r.intraDayTime ? r.intraDayTime : `${r.timeWindowStart || '00:00'}-${r.timeWindowEnd || '23:59'}`;
        body.createDiv({ cls: 'sr-cal-day-item-time', text: tm });
      }
    }
  }

  private countForDay(year: number, month: number, day: number): number {
    return this.getRemindersForDay(year, month, day).length;
  }

  private getRemindersForDay(year: number, month: number, day: number): Reminder[] {
    const result: Reminder[] = [];
    const dayStart = new Date(year, month, day).getTime();
    for (const r of this.plugin.reminders) {
      if (r.checked) {
        continue;
      }

      if (r.type === 'once' && r.specificTs) {
        const d = new Date(r.specificTs);
        if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
          result.push(r);
        }
      } else if (r.type === 'repeat') {
        if (r.endDate && dayStart > r.endDate) {
          continue;
        }
        const anchor = new Date(r.startDate ?? Date.now());
        anchor.setHours(0, 0, 0, 0);
        const cand = new Date(year, month, day);
        if (cand.getTime() >= anchor.getTime() && isValidDay(cand, anchor, r)) {
          result.push(r);
        }
      }
    }
    return result;
  }
}
