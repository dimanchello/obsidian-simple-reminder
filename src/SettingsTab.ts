import { App, Notice, PluginSettingTab, Setting, SettingDefinitionItem } from 'obsidian';
import type SimpleReminderPlugin from './main';
import { GroupBy, Language } from './types';

export class ReminderSettingTab extends PluginSettingTab {
  private plugin: SimpleReminderPlugin;

  constructor(app: App, plugin: SimpleReminderPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    const t = this.plugin.t;

    return [
      {
        type: 'group',
        items: [
          {
            name: t.mobileH3,
            desc: t.mobileBody,
            render: (setting: Setting) => {
              setting.settingEl.empty();
              const notice = setting.settingEl.createDiv('sr-settings-notice');
              new Setting(notice).setName(t.mobileH3).setHeading();
              notice.createEl('p', { text: t.mobileBody });
            },
          },
        ],
      },
      {
        type: 'group',
        heading: t.secManagement,
        items: [
          {
            name: t.openPanelName,
            desc: t.openPanelDesc,
            render: (setting: Setting) => {
              setting.addButton((b) =>
                b
                  .setButtonText(t.openPanelBtn)
                  .setCta()
                  .onClick(() => this.plugin.activateView()),
              );
            },
          },
          {
            name: t.checkIntervalName,
            desc: t.checkIntervalDesc,
            render: (setting: Setting) => {
              setting.addText((text) => {
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
                text.inputEl.addClass('sr-number-input');
              });
            },
          },
          {
            name: t.languageName,
            desc: t.languageDesc,
            render: (setting: Setting) => {
              setting.addDropdown((drop) => {
                drop
                  .addOption('auto', t.langAuto)
                  .addOption('en', t.langEn)
                  .addOption('ru', t.langRu)
                  .setValue(this.plugin.settings.language)
                  .onChange(async (val) => {
                    this.plugin.settings.language = val as Language;
                    await this.plugin.saveSettings();
                    this.plugin.refreshStrings();
                    this.display();
                    if (typeof this.update === 'function') {
                      this.update();
                    }
                  });
              });
            },
          },
          {
            name: t.groupByName,
            desc: t.groupByDesc,
            render: (setting: Setting) => {
              setting.addDropdown((drop) => {
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
            },
          },
          {
            name: t.pruneCompletedDaysName,
            desc: t.pruneCompletedDaysDesc,
            render: (setting: Setting) => {
              setting.addText((text) => {
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
                text.inputEl.addClass('sr-number-input');
              });
            },
          },
          {
            name: t.testName,
            desc: t.testDesc,
            render: (setting: Setting) => {
              setting.addButton((b) => b.setButtonText(t.testBtn).onClick(() => this.plugin.fireTestNotification()));
            },
          },
          {
            name: t.reqPermName,
            desc: t.reqPermDesc,
            render: (setting: Setting) => {
              setting.addButton((b) =>
                b.setButtonText(t.reqPermBtn).onClick(() => this.plugin.requestNotificationPermission(true)),
              );
            },
          },
          {
            name: t.deleteAllName,
            desc: t.deleteAllDesc,
            render: (setting: Setting) => {
              setting.addButton((b) =>
                b
                  .setButtonText(t.deleteAllBtn)
                  .setWarning()
                  .onClick(async () => {
                    this.plugin.reminders = [];
                    await this.plugin.saveSettings();
                    new Notice(t.okAllDeleted);
                    this.display();
                    if (typeof this.update === 'function') {
                      this.update();
                    }
                  }),
              );
            },
          },
        ],
      },
      {
        type: 'group',
        heading: t.secStats,
        items: [
          {
            name: t.secStats,
            render: (setting: Setting) => {
              setting.settingEl.empty();
              const total = this.plugin.reminders.length;
              const active = this.plugin.reminders.filter((r) => !r.checked).length;
              const done = total - active;

              const stats = setting.settingEl.createDiv('sr-settings-stats');
              for (const [label, val] of [
                [t.statTotal, total],
                [t.statActive, active],
                [t.statDone, done],
              ] as [string, number][]) {
                const row = stats.createDiv('sr-stats-row');
                row.createSpan({ cls: 'sr-stats-label', text: label });
                row.createSpan({ cls: 'sr-stats-val', text: String(val) });
              }
            },
          },
        ],
      },
      {
        type: 'group',
        heading: t.secAbout,
        items: [
          {
            name: t.secAbout,
            desc: t.aboutText(this.plugin.settings.checkIntervalSec),
            render: () => {},
          },
        ],
      },
    ];
  }

  display(): void {
    const { containerEl: el } = this;
    const t = this.plugin.t;

    el.empty();
    new Setting(el).setName(t.settingsH2).setHeading();

    // ── Mobile warning ──────────────────────────────────────────────────────
    const notice = el.createDiv('sr-settings-notice');
    new Setting(notice).setName(t.mobileH3).setHeading();
    notice.createEl('p', { text: t.mobileBody });

    // ── Management ──────────────────────────────────────────────────────────
    new Setting(el).setName(t.secManagement).setHeading();

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
        text.inputEl.addClass('sr-number-input');
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
        text.inputEl.addClass('sr-number-input');
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
    new Setting(el).setName(t.secStats).setHeading();

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
    new Setting(el).setName(t.secAbout).setHeading();
    el.createEl('p', {
      cls: 'sr-settings-info',
      text: t.aboutText(this.plugin.settings.checkIntervalSec),
    });
  }
}
