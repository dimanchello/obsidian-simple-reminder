import {
  App,
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  TFile,
} from 'obsidian';
import { CustomDateModal } from './CustomDateModal';
import type SimpleReminderPlugin from './main';

interface SuggestOption {
  label: string;
  dateStr: string;
}

export class MarkdownSuggest extends EditorSuggest<SuggestOption> {
  private plugin: SimpleReminderPlugin;

  constructor(app: App, plugin: SimpleReminderPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile | null): EditorSuggestTriggerInfo | null {
    const line = editor.getLine(cursor.line);
    const textBeforeCursor = line.substring(0, cursor.ch);

    // Trigger when user types @remind
    const match = textBeforeCursor.match(/@remind\s*$/);
    if (match) {
      return {
        start: { line: cursor.line, ch: textBeforeCursor.lastIndexOf('@remind') },
        end: cursor,
        query: textBeforeCursor,
      };
    }

    return null;
  }

  getSuggestions(_context: EditorSuggestContext): SuggestOption[] | Promise<SuggestOption[]> {
    const now = new Date();
    const pad = (n: number): string => String(n).padStart(2, '0');

    const formatDate = (d: Date): string => {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const in15m = new Date(now.getTime() + 15 * 60000);
    const in1h = new Date(now.getTime() + 60 * 60000);

    const tomorrowMorning = new Date(now);
    tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
    tomorrowMorning.setHours(9, 0, 0, 0);

    const tomorrowEvening = new Date(now);
    tomorrowEvening.setDate(tomorrowEvening.getDate() + 1);
    tomorrowEvening.setHours(18, 0, 0, 0);

    // Using basic hardcoded strings here, but could use i18n
    return [
      { label: 'Через 15 минут', dateStr: formatDate(in15m) },
      { label: 'Через 1 час', dateStr: formatDate(in1h) },
      { label: 'Завтра утром (09:00)', dateStr: formatDate(tomorrowMorning) },
      { label: 'Завтра вечером (18:00)', dateStr: formatDate(tomorrowEvening) },
      { label: 'Свой формат...', dateStr: 'CUSTOM' },
    ];
  }

  renderSuggestion(value: SuggestOption, el: HTMLElement): void {
    el.createDiv({ text: value.label });
    el.createDiv({ text: value.dateStr, cls: 'sr-suggest-date' });
  }

  selectSuggestion(value: SuggestOption, _evt: MouseEvent | KeyboardEvent): void {
    if (!this.context) return;

    const editor = this.context.editor;
    const start = this.context.start;
    const end = this.context.end;

    if (value.dateStr === 'CUSTOM') {
      new CustomDateModal(this.plugin.app, this.plugin.t, (dateStr) => {
        editor.replaceRange(`@remind(${dateStr}) `, start, end);
      }).open();
      return;
    }

    // We want to replace `@remind` with `@remind(YYYY-MM-DD HH:mm)`
    editor.replaceRange(`@remind(${value.dateStr}) `, start, end);
  }
}
