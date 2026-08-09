import { describe, it, expect, vi } from 'vitest';
import { MarkdownScanner, REMIND_REGEX } from '../src/markdownScanner';
import { App, TFile } from 'obsidian';

describe('MarkdownScanner Regex', () => {
  it('should match valid remind tags', () => {
    const text = '@remind(2026-08-10 15:00)';
    REMIND_REGEX.lastIndex = 0;
    const match = REMIND_REGEX.exec(text);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('2026-08-10');
    expect(match![2]).toBe('15:00');
  });

  it('should allow spaces inside parenthesis', () => {
    const text = '@remind(  2026-08-10   15:00 )';
    REMIND_REGEX.lastIndex = 0;
    const match = REMIND_REGEX.exec(text);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('2026-08-10');
    expect(match![2]).toBe('15:00');
  });

  it('should not match invalid formats', () => {
    REMIND_REGEX.lastIndex = 0;
    expect(REMIND_REGEX.exec('@remind(2026/08/10 15:00)')).toBeNull();
    REMIND_REGEX.lastIndex = 0;
    expect(REMIND_REGEX.exec('@remind(26-08-10 15:00)')).toBeNull();
  });
});

describe('MarkdownScanner.parseFile', () => {
  it('should correctly parse reminders and clean titles', async () => {
    const mockApp = {
      vault: {
        read: vi.fn().mockResolvedValue(`
# Notes
- [ ] Buy milk @remind(2026-08-10 15:00)
- Call mom @remind(2026-08-11 09:00)
Just a regular paragraph with a reminder @remind(2026-08-12 18:30) at the end.
- [x] Done task @remind-done(2026-08-01 10:00)
        `),
      },
    } as unknown as App;

    const scanner = new MarkdownScanner(mockApp);

    // Create a mock TFile
    const mockFile = { path: 'test.md', name: 'test.md', extension: 'md' } as TFile;

    const reminders = await scanner.parseFile(mockFile);

    expect(reminders.length).toBe(3); // @remind-done should NOT match

    // Test 1: Task
    expect(reminders[0].title).toBe('Buy milk');
    expect(reminders[0].line).toBe(2);
    expect(reminders[0].specificTs).toBe(new Date('2026-08-10T15:00:00').getTime());

    // Test 2: Bullet point
    expect(reminders[1].title).toBe('Call mom');
    expect(reminders[1].line).toBe(3);

    // Test 3: Paragraph with extra text
    expect(reminders[2].title).toBe('Just a regular paragraph with a reminder  at the end.');
    expect(reminders[2].line).toBe(4);
  });
});
