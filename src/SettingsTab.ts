import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type SimpleReminderPlugin from './main';
import { GroupBy, Language } from './types';

export class ReminderSettingTab extends PluginSettingTab {
  private plugin: SimpleReminderPlugin;

  constructor(app: App, plugin: SimpleReminderPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl: el } = this;
    const t = this.plugin.t;

    el.empty();
    el.createEl('h2', { text: t.settingsH2 });

    // ── Mobile warning ──────────────────────────────────────────────────────
    const notice = el.createDiv('sr-settings-notice');
    notice.createEl('h3', { text: t.mobileH3 });
    notice.createEl('p', { text: t.mobileBody });

    // ── Management ──────────────────────────────────────────────────────────
    el.createEl('h3', { text: t.secManagement });

    new Setting(el)
      .setName(t.openPanelName)
      .setDesc(t.openPanelDesc)
      .addButton((b) =>
        b
          .setButtonText(t.openPanelBtn)
          .setCta()
          .onClick(() => this.plugin.activateView()),
      );

    // Check interval
    new Setting(el)
      .setName(t.checkIntervalName)
      .setDesc(t.checkIntervalDesc)
      .addText((text) => {
        text
          .setPlaceholder('30')
          .setValue(String(this.plugin.settings.checkIntervalSec))
          .onChange(async (raw) => {
            const v = parseInt(raw, 10);
            if (!isNaN(v) && v >= 2) {
              this.plugin.settings.checkIntervalSec = v;
              await this.plugin.saveSettings();
              this.plugin.restartCheckLoop();
            }
          });
        text.inputEl.type = 'number';
        text.inputEl.min = '2';
        text.inputEl.style.width = '80px';
      });

    // Language
    new Setting(el)
      .setName(t.languageName)
      .setDesc(t.languageDesc)
      .addDropdown((drop) => {
        drop
          .addOption('auto', t.langAuto)
          .addOption('en', t.langEn)
          .addOption('ru', t.langRu)
          .setValue(this.plugin.settings.language)
          .onChange(async (val) => {
            this.plugin.settings.language = val as Language;
            await this.plugin.saveSettings();
            this.plugin.refreshStrings();
            // Re-render settings page with new language
            this.display();
          });
      });

    // Group by
    new Setting(el)
      .setName(t.groupByName)
      .setDesc(t.groupByDesc)
      .addDropdown((drop) => {
        drop
          .addOption('none', t.groupByNone)
          .addOption('minute', t.groupByMinute)
          .addOption('hour', t.groupByHour)
          .addOption('day', t.groupByDay)
          .addOption('week', t.groupByWeek)
          .addOption('month', t.groupByMonth)
          .addOption('year', t.groupByYear)
          .setValue(this.plugin.settings.groupBy)
          .onChange(async (val) => {
            this.plugin.settings.groupBy = val as GroupBy;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    // Prune completed days
    new Setting(el)
      .setName(t.pruneCompletedDaysName)
      .setDesc(t.pruneCompletedDaysDesc)
      .addText((text) => {
        text
          .setPlaceholder('3')
          .setValue(String(this.plugin.settings.pruneCompletedDays))
          .onChange(async (val) => {
            const parsed = parseInt(val, 10);
            if (!isNaN(parsed) && parsed >= 0) {
              this.plugin.settings.pruneCompletedDays = parsed;
              await this.plugin.saveSettings();
              this.plugin.pruneOldCompleted();
            }
          });
        text.inputEl.type = 'number';
        text.inputEl.min = '0';
        text.inputEl.style.width = '80px';
      });

    // Test notification
    new Setting(el)
      .setName(t.testName)
      .setDesc(t.testDesc)
      .addButton((b) => b.setButtonText(t.testBtn).onClick(() => this.plugin.fireTestNotification()));

    // Request permission
    new Setting(el)
      .setName(t.reqPermName)
      .setDesc(t.reqPermDesc)
      .addButton((b) => b.setButtonText(t.reqPermBtn).onClick(() => this.plugin.requestNotificationPermission(true)));

    // Delete all
    new Setting(el)
      .setName(t.deleteAllName)
      .setDesc(t.deleteAllDesc)
      .addButton((b) =>
        b
          .setButtonText(t.deleteAllBtn)
          .setWarning()
          .onClick(async () => {
            this.plugin.reminders = [];
            await this.plugin.saveSettings();
            new Notice(t.okAllDeleted);
            this.display();
          }),
      );

    // ── Statistics ──────────────────────────────────────────────────────────
    el.createEl('h3', { text: t.secStats });

    const total = this.plugin.reminders.length;
    const active = this.plugin.reminders.filter((r) => !r.checked).length;
    const done = total - active;

    const stats = el.createDiv('sr-settings-stats');
    for (const [label, val] of [
      [t.statTotal, total],
      [t.statActive, active],
      [t.statDone, done],
    ] as [string, number][]) {
      const row = stats.createDiv('sr-stats-row');
      row.createSpan({ cls: 'sr-stats-label', text: label });
      row.createSpan({ cls: 'sr-stats-val', text: String(val) });
    }

    // ── About ───────────────────────────────────────────────────────────────
    el.createEl('h3', { text: t.secAbout });
    el.createEl('p', {
      cls: 'sr-settings-info',
      text: t.aboutText(this.plugin.settings.checkIntervalSec),
    });
  }
}
