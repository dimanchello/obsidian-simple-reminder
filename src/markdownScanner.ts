import { App, TFile } from 'obsidian';
import { Reminder, DEFAULT_EMOJI } from './types';

// Matches: @remind(2026-08-10 15:00)
export const REMIND_REGEX = /@remind\(\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s*\)/g;

export class MarkdownScanner {
  private app: App;
  private cache: Map<string, Reminder[]> = new Map();

  constructor(app: App) {
    this.app = app;
  }

  // Parses a single file and returns the reminders found
  async parseFile(file: TFile): Promise<Reminder[]> {
    const content = await this.app.vault.read(file);
    const lines = content.split('\n');
    const reminders: Reminder[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match;
      REMIND_REGEX.lastIndex = 0; // reset for each line just in case, though we re-declare it

      // We use a fresh regex to find all matches on the line
      const lineRegex = new RegExp(REMIND_REGEX);
      while ((match = lineRegex.exec(line)) !== null) {
        const dateStr = match[1];
        const timeStr = match[2];
        const ts = new Date(`${dateStr}T${timeStr}:00`).getTime();

        if (isNaN(ts)) continue;

        // Clean up the title: remove the tag, checkbox, etc.
        let title = line.replace(match[0], '').trim();
        // Remove markdown task prefix if exists
        title = title.replace(/^- \[.\]\s*/, '');
        // Remove markdown list prefix if exists
        title = title.replace(/^[-*]\s*/, '');

        if (!title) {
          title = 'Reminder';
        }

        const reminder: Reminder = {
          id: `file:${file.path}:${i}:${match.index}`,
          title: title,
          checked: false,
          type: 'once',
          specificTs: ts,
          repUnit: null,
          repStep: null,
          repDaysOfWeek: null,
          repDayOfMonth: null,
          repMonth: null,
          startDate: null,
          endDate: null,
          intraDayMode: null,
          intraDayTime: null,
          intraDayStepMin: null,
          timeWindowStart: null,
          timeWindowEnd: null,
          remindBefore: [],
          emoji: DEFAULT_EMOJI,
          nextTrigger: ts,
          completedAt: null,
          file: file.path,
          line: i,
        };

        reminders.push(reminder);
      }
    }

    this.cache.set(file.path, reminders);
    return reminders;
  }

  removeFile(path: string): void {
    this.cache.delete(path);
  }

  renameFile(oldPath: string, newPath: string): void {
    const reminders = this.cache.get(oldPath);
    if (reminders) {
      // Update the file path in the cached reminders
      reminders.forEach((r) => {
        r.file = newPath;
      });
      this.cache.set(newPath, reminders);
      this.cache.delete(oldPath);
    }
  }

  getAllReminders(): Reminder[] {
    const all: Reminder[] = [];
    for (const fileReminders of this.cache.values()) {
      all.push(...fileReminders);
    }
    return all;
  }
}
