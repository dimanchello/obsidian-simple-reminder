import { Notice, Plugin } from 'obsidian';
import { PluginSettings, Reminder, DEFAULT_SETTINGS } from './types';
import { ReminderView, VIEW_TYPE_REMINDER } from './ReminderView';
import { AddReminderModal } from './AddReminderModal';
import { ReminderSettingTab } from './SettingsTab';
import {
  advanceTrigger,
  migrateLegacyReminder,
  pruneOldCompleted,
  calcRemindBeforeTriggers,
  migrateRemindBefore,
} from './utils';
import { getStrings, Strings } from './i18n';
import { SimpleReminderAPIImpl } from './api';

export default class SimpleReminderPlugin extends Plugin {
  settings!: PluginSettings;
  reminders!: Reminder[];
  t!: Strings;

  /** Public API — accessible to other plugins via app.plugins.plugins['simple-reminder'].api */
  api!: SimpleReminderAPIImpl;

  private checkTimer: number | null = null;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async onload(): Promise<void> {
    await this.loadSettings();
    this.refreshStrings();

    // Expose API before anything else so other plugins loading after us can use it
    this.api = new SimpleReminderAPIImpl(this);

    this.registerView(VIEW_TYPE_REMINDER, (leaf) => new ReminderView(leaf, this));

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

    this.addSettingTab(new ReminderSettingTab(this.app, this));
    this.requestNotificationPermission(false);

    this.app.workspace.onLayoutReady(() => {
      this.checkReminders();
      this.startCheckLoop();
    });
  }

  onunload(): void {
    this.stopCheckLoop();
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) ?? {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
    this.reminders = (Array.isArray(this.settings.reminders) ? this.settings.reminders : [])
      .map(migrateLegacyReminder)
      .map(migrateRemindBefore);
    this.pruneOldCompleted();
  }

  async saveSettings(): Promise<void> {
    this.settings.reminders = this.reminders;
    await this.saveData(this.settings);
  }

  // ── i18n ───────────────────────────────────────────────────────────────────

  refreshStrings(): void {
    this.t = getStrings(this.settings.language);
  }

  // ── View ───────────────────────────────────────────────────────────────────

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
    const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_REMINDER)[0];
    if (leaf && leaf.view instanceof ReminderView) {
      (leaf.view as ReminderView).refresh();
    }
  }

  // ── Check loop ─────────────────────────────────────────────────────────────

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
    this.reminders = pruneOldCompleted(this.reminders);
    if (this.reminders.length !== before) {
      this.saveSettings();
      this.refreshView();
    }
  }

  // ── Check logic ────────────────────────────────────────────────────────────

  checkReminders(): void {
    this.pruneOldCompleted();

    const now = Date.now();
    let changed = false;

    for (const r of this.reminders) {
      // ── remindBefore check ───────────────────────────────────────────────────
      if (!r.checked && r.remindBefore.length > 0) {
        for (const entry of r.remindBefore) {
          if (entry.trigger != null && now >= entry.trigger) {
            this.fireNotification(r, true);
            entry.trigger = null;
            changed = true;
          }
        }
      }

      // ── Main trigger check ───────────────────────────────────────────────────
      if (r.checked) continue;
      if (r.nextTrigger == null) continue;
      if (now < r.nextTrigger) continue;

      this.fireNotification(r, false);
      this.api._emitFired(r);

      if (r.type === 'once') {
        r.checked = true;
        r.completedAt = now;
        r.nextTrigger = null;
        r.remindBefore = r.remindBefore.map((e) => ({ ...e, trigger: null }));
      } else {
        r.nextTrigger = advanceTrigger(r, now);
        r.remindBefore = calcRemindBeforeTriggers(r.nextTrigger, r.remindBefore);
      }
      changed = true;
    }

    if (changed) {
      this.saveSettings();
      this.refreshView();
    }
  }

  // ── Notifications ──────────────────────────────────────────────────────────

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

  fireNotification(r: Reminder, isPreAlert = false): void {
    const emoji = r.emoji || '⏰';
    const prefix = isPreAlert ? `${emoji} ${this.t.remindBeforePrefix}` : `${emoji} ${this.t.pluginName}`;
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(prefix, { body: r.title, silent: false });
        return;
      } catch {
        /* ignore */
      }
    }
    new Notice(`${emoji} ${r.title}`, 8000);
  }

  fireTestNotification(): void {
    if (typeof Notification === 'undefined') {
      new Notice(this.t.testFallback, 5000);
      return;
    }
    const fire = () => new Notification(`⏰ ${this.t.pluginName}`, { body: this.t.testBody });
    if (Notification.permission === 'granted') {
      fire();
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((p) => {
        if (p === 'granted') fire();
        else new Notice(this.t.warnPermDenied, 5000);
      });
    } else {
      new Notice(this.t.warnPermBlocked, 6000);
    }
  }
}
