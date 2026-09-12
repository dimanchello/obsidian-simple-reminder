import { App, Notice, PluginSettingTab, Setting, SettingDefinitionItem } from 'obsidian';
import type SimpleReminderPlugin from './main';
import { GroupBy } from './types';

export class ReminderSettingTab extends PluginSettingTab {
  private plugin: SimpleReminderPlugin;

  constructor(app: App, plugin: SimpleReminderPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    this.plugin.refreshStrings();
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
                  .setDestructive()
                  .onClick(async () => {
                    this.plugin.reminders = [];
                    await this.plugin.saveSettings();
                    new Notice(t.okAllDeleted);
                    this.update();
                  }),
              );
            },
          },
        ],
      },
    ];
  }
}
