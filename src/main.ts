import { Editor, Notice, Plugin } from 'obsidian';
import { PluginSettings, Reminder, DEFAULT_SETTINGS, DEFAULT_EMOJI, RemindBeforeEntry } from './types';
import { ReminderView, VIEW_TYPE_REMINDER } from './ReminderView';
import { ReminderCodeBlockChild } from './ReminderCodeBlock';
import { AddReminderModal } from './AddReminderModal';
import { ReminderViewModal } from './ReminderViewModal';
import { ReminderSettingTab } from './SettingsTab';
import { advanceTrigger, migrateLegacyReminder, pruneOldCompleted, calcRemindBeforeTriggers } from './utils';
import { getStrings, Strings } from './i18n';
import { SimpleReminderAPIImpl } from './api';

export default class SimpleReminderPlugin extends Plugin {
  settings!: PluginSettings;
  reminders!: Reminder[];
  t!: Strings;
  api!: SimpleReminderAPIImpl;

  private checkTimer: number | null = null;
  private lastPruneTime: number = 0;
  private isChecking: boolean = false;
  private activeCodeBlocks: Set<() => void> = new Set();

  get allReminders(): Reminder[] {
    return this.reminders;
  }

  registerCodeBlock(refresh: () => void): () => void {
    this.activeCodeBlocks.add(refresh);
    return () => {
      this.activeCodeBlocks.delete(refresh);
    };
  }

  async onload(): Promise<void> {
    await this.loadSettings();
    this.refreshStrings();

    this.api = new SimpleReminderAPIImpl(this);

    this.registerView(VIEW_TYPE_REMINDER, (leaf) => new ReminderView(leaf, this));

    this.registerMarkdownCodeBlockProcessor('simple-reminder', (source, el, ctx) => {
      const child = new ReminderCodeBlockChild(el, this, source);
      ctx.addChild(child);
    });

    this.addRibbonIcon('bell', this.t.pluginName, () => this.activateView());

    this.addCommand({
      id: 'open-panel',
      name: 'Open reminder panel',
      callback: () => this.activateView(),
    });

    this.addCommand({
      id: 'add-reminder',
      name: 'Add new reminder',
      callback: () =>
        new AddReminderModal(this.app, this, () => {
          this.refreshView();
          this.checkReminders();
        }).open(),
    });

    this.addCommand({
      id: 'insert-widget',
      name: 'Insert reminder widget',
      editorCallback: (editor: Editor) => {
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const snippet = line.trim().length > 0 ? '\n```simple-reminder\n```\n' : '```simple-reminder\n```\n';
        editor.replaceSelection(snippet);
      },
    });

    this.addSettingTab(new ReminderSettingTab(this.app, this));
    this.requestNotificationPermission(false);

    this.app.workspace.onLayoutReady(async () => {
      this.checkReminders();
      this.startCheckLoop();
    });
  }

  onunload(): void {
    this.stopCheckLoop();
  }

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) ?? {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
    this.reminders = (Array.isArray(this.settings.reminders) ? this.settings.reminders : []).map(migrateLegacyReminder);
    this.pruneOldCompleted();
  }

  async saveSettings(): Promise<void> {
    this.settings.reminders = this.reminders;
    await this.saveData(this.settings);
  }

  refreshStrings(): void {
    this.t = getStrings(this.settings.language);
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_REMINDER)[0];
    if (!leaf) {
      const right = workspace.getRightLeaf(false);
      if (right) {
        await right.setViewState({ type: VIEW_TYPE_REMINDER, active: true });
        leaf = right;
      }
    }
    if (leaf) workspace.revealLeaf(leaf);
  }

  refreshView(): void {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_REMINDER);
    for (const leaf of leaves) {
      if (leaf && leaf.view instanceof ReminderView) {
        (leaf.view as ReminderView).refresh();
      }
    }
    for (const refresh of this.activeCodeBlocks) {
      refresh();
    }
  }

  startCheckLoop(): void {
    this.stopCheckLoop();
    const ms = Math.max(2, this.settings.checkIntervalSec) * 1000;
    this.checkTimer = window.setInterval(() => this.checkReminders(), ms);
  }

  stopCheckLoop(): void {
    if (this.checkTimer !== null) {
      window.clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  restartCheckLoop(): void {
    this.startCheckLoop();
  }

  pruneOldCompleted(): void {
    const before = this.reminders.length;
    this.reminders = pruneOldCompleted(this.reminders, this.settings.pruneCompletedDays);
    if (this.reminders.length !== before) {
      this.saveSettings();
      this.refreshView();
    }
  }

  async checkReminders(): Promise<void> {
    if (this.isChecking) {
      return;
    }
    this.isChecking = true;
    try {
      const now = Date.now();

      if (now - this.lastPruneTime > 3600_000) {
        this.pruneOldCompleted();
        this.lastPruneTime = now;
      }

      let changed = false;
      const all = this.allReminders;

      for (const r of all) {
        if (!r.checked && Array.isArray(r.remindBefore)) {
          for (const entry of r.remindBefore) {
            if (entry.trigger != null && now >= entry.trigger) {
              if (r.nextTrigger != null && now >= r.nextTrigger) {
                entry.trigger = null;
                changed = true;
                continue;
              }
              this.fireNotification(r, entry);
              entry.trigger = null;
              changed = true;
            }
          }
        }

        if (r.checked) {
          continue;
        }
        if (r.nextTrigger == null) {
          continue;
        }
        if (r.nagSilencedUntil != null && now < r.nagSilencedUntil) {
          continue;
        }
        if (now < r.nextTrigger) {
          continue;
        }

        this.fireNotification(r);
        this.api._emitFired(r);

        if (r.type === 'once') {
          if (r.nagMode && r.nagIntervalMin) {
            r.nextTrigger = advanceTrigger(r, now);
            if (r.remindBefore.length > 0) {
              r.remindBefore = calcRemindBeforeTriggers(r.nextTrigger, r.remindBefore);
            }
          } else {
            r.checked = true;
            r.completedAt = now;
            r.nextTrigger = null;
            r.remindBefore.forEach((e) => {
              e.trigger = null;
            });
          }
        } else {
          const nextT = advanceTrigger(r, now);
          r.nextTrigger = nextT;
          if (r.nagMode && r.nagIntervalMin) {
            r.nagSilencedUntil = nextT;
          }
          if (nextT && r.remindBefore.length > 0) {
            r.remindBefore = calcRemindBeforeTriggers(nextT, r.remindBefore);
          }
        }
        changed = true;
      }

      if (changed) {
        await this.saveSettings();
        this.refreshView();
      }
    } finally {
      this.isChecking = false;
    }
  }

  requestNotificationPermission(showNotice: boolean): void {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      if (showNotice) new Notice(this.t.okPermAlready);
      return;
    }
    Notification.requestPermission()
      .then((perm) => {
        if (!showNotice) return;
        new Notice(perm === 'granted' ? this.t.okPermGranted : this.t.warnPermDenied, 6000);
      })
      .catch(() => {});
  }

  fireNotification(r: Reminder, preAlertEntry?: RemindBeforeEntry): void {
    const emoji = r.emoji || DEFAULT_EMOJI;
    let prefix = `${emoji} ${this.t.pluginName}`;
    if (preAlertEntry) {
      const formattedTime = this.t.formatRemindBefore(preAlertEntry.value, preAlertEntry.unit);
      prefix = `${emoji} ${this.t.remindBeforePrefix(formattedTime)}`;
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const notif = new Notification(prefix, { body: r.title, silent: false });
        notif.onclick = (): void => {
          window.focus();
          this.handleReminderClick(r);
        };
        return;
      } catch {
        /* ignore */
      }
    }
    new Notice(`${emoji} ${r.title}`, 8000);
  }

  private handleReminderClick(r: Reminder): void {
    if (r.type === 'once') {
      r.checked = true;
      r.completedAt = Date.now();
      r.nextTrigger = null;
      r.remindBefore.forEach((e) => {
        e.trigger = null;
      });
      this.saveSettings();
      this.refreshView();
    }

    if (r.type === 'repeat' && r.nagMode && r.nagSilencedUntil != null) {
      r.nextTrigger = advanceTrigger(r, Date.now());
      r.nagSilencedUntil = null;
      if (r.remindBefore.length > 0) {
        r.remindBefore = calcRemindBeforeTriggers(r.nextTrigger, r.remindBefore);
      }
      this.saveSettings();
      this.refreshView();
    }

    if (r.url) {
      const url = r.url.trim();
      if (this.isWikiLink(url)) {
        this.openNote(url);
      } else if (this.isExternalUrl(url)) {
        window.open(url, '_blank');
      } else {
        new ReminderViewModal(this.app, r, this.t).open();
      }
    } else {
      new ReminderViewModal(this.app, r, this.t).open();
    }
  }

  private isWikiLink(url: string): boolean {
    return /^\[\[.+\]\]$/.test(url);
  }

  private isExternalUrl(url: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url);
  }

  private openNote(wikiLink: string): void {
    const notePath = wikiLink.slice(2, -2);
    const file = this.app.metadataCache.getFirstLinkpathDest(notePath, '');
    if (file) {
      this.app.workspace.getLeaf(true).openFile(file);
    } else {
      new Notice(`Note not found: ${notePath}`);
    }
  }

  fireTestNotification(): void {
    if (typeof Notification === 'undefined') {
      new Notice(this.t.testFallback, 5000);
      return;
    }
    const fire = (): void => {
      new Notification(`⏰ ${this.t.pluginName}`, { body: this.t.testBody });
    };
    if (Notification.permission === 'granted') {
      fire();
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((p) => {
        if (p === 'granted') {
          fire();
        } else {
          new Notice(this.t.warnPermDenied, 5000);
        }
      });
    } else {
      new Notice(this.t.warnPermBlocked, 6000);
    }
  }
}
