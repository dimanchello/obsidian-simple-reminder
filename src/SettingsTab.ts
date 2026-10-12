import { App, ButtonComponent, DropdownComponent, Notice, PluginSettingTab, Setting, TextComponent } from 'obsidian';
import type SimpleReminderPlugin from './main';
import { GroupBy, Language } from './types';

interface SettingDefBase {
  name: string;
  desc?: string;
  searchable?: boolean;
}

interface SettingDefRender extends SettingDefBase {
  render: (setting: Setting) => void;
}

interface SettingDefGroup {
  type: 'group';
  heading: string;
  items: SettingDefRender[];
}

type SettingDefItem = SettingDefRender | SettingDefGroup;

export class ReminderSettingTab extends PluginSettingTab {
  private plugin: SimpleReminderPlugin;

  constructor(app: App, plugin: SimpleReminderPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  private refreshTab(): void {
    const self = this as unknown as Record<string, (() => void) | undefined>;
    if (typeof self['update'] === 'function') {
      self['update']();
    } else {
      self['display']?.();
    }
  }

  private styleDeleteButton(b: ButtonComponent): void {
    b.setButtonText(this.plugin.t.deleteAllBtn);
    const btnObj = b as unknown as Record<string, () => unknown>;
    if (typeof btnObj['setDestructive'] === 'function') {
      btnObj['setDestructive']();
    } else if (typeof btnObj['setWarning'] === 'function') {
      btnObj['setWarning']();
    }
  }

  getSettingDefinitions(): SettingDefItem[] {
    const t = this.plugin.t;

    return [
      {
        name: t.mobileH3,
        desc: t.mobileBody,
        render: (setting: Setting): void => {
          setting.settingEl.empty();
          setting.settingEl.addClass('sr-settings-notice');
          new Setting(setting.settingEl).setName(t.mobileH3).setHeading();
          setting.settingEl.createEl('p', { text: t.mobileBody });
        },
      },
      {
        type: 'group',
        heading: t.secManagement,
        items: [
          {
            name: t.openPanelName,
            desc: t.openPanelDesc,
            render: (setting: Setting): void => {
              setting.addButton((b: ButtonComponent): void => {
                b.setButtonText(t.openPanelBtn);
                b.setCta();
                b.onClick((): void => {
                  void this.plugin.activateView();
                });
              });
            },
          },
          {
            name: t.checkIntervalName,
            desc: t.checkIntervalDesc,
            render: (setting: Setting): void => {
              setting.addText((text: TextComponent): void => {
                text.setPlaceholder('30');
                text.setValue(String(this.plugin.settings.checkIntervalSec));
                text.onChange(async (raw: string): Promise<void> => {
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
            render: (setting: Setting): void => {
              setting.addDropdown((drop: DropdownComponent): void => {
                drop.addOption('auto', t.langAuto);
                drop.addOption('en', t.langEn);
                drop.addOption('ru', t.langRu);
                drop.setValue(this.plugin.settings.language);
                drop.onChange(async (val: string): Promise<void> => {
                  this.plugin.settings.language = val as Language;
                  await this.plugin.saveSettings();
                  this.plugin.refreshStrings();
                  this.refreshTab();
                });
              });
            },
          },
          {
            name: t.groupByName,
            desc: t.groupByDesc,
            render: (setting: Setting): void => {
              setting.addDropdown((drop: DropdownComponent): void => {
                drop.addOption('none', t.groupByNone);
                drop.addOption('minute', t.groupByMinute);
                drop.addOption('hour', t.groupByHour);
                drop.addOption('day', t.groupByDay);
                drop.addOption('week', t.groupByWeek);
                drop.addOption('month', t.groupByMonth);
                drop.addOption('year', t.groupByYear);
                drop.setValue(this.plugin.settings.groupBy);
                drop.onChange(async (val: string): Promise<void> => {
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
            render: (setting: Setting): void => {
              setting.addText((text: TextComponent): void => {
                text.setPlaceholder('3');
                text.setValue(String(this.plugin.settings.pruneCompletedDays));
                text.onChange(async (val: string): Promise<void> => {
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
            render: (setting: Setting): void => {
              setting.addButton((b: ButtonComponent): void => {
                b.setButtonText(t.testBtn);
                b.onClick((): void => {
                  this.plugin.fireTestNotification();
                });
              });
            },
          },
          {
            name: t.reqPermName,
            desc: t.reqPermDesc,
            render: (setting: Setting): void => {
              setting.addButton((b: ButtonComponent): void => {
                b.setButtonText(t.reqPermBtn);
                b.onClick((): void => {
                  this.plugin.requestNotificationPermission(true);
                });
              });
            },
          },
          {
            name: t.deleteAllName,
            desc: t.deleteAllDesc,
            render: (setting: Setting): void => {
              setting.addButton((b: ButtonComponent): void => {
                this.styleDeleteButton(b);
                b.onClick(async (): Promise<void> => {
                  this.plugin.reminders = [];
                  await this.plugin.saveSettings();
                  new Notice(t.okAllDeleted);
                  this.refreshTab();
                });
              });
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
            render: (setting: Setting): void => {
              setting.settingEl.empty();
              const total = this.plugin.reminders.length;
              const active = this.plugin.reminders.filter((r) => !r.checked).length;
              const done = total - active;

              const stats: HTMLElement = setting.settingEl.createDiv('sr-settings-stats');
              for (const [label, val] of [
                [t.statTotal, total],
                [t.statActive, active],
                [t.statDone, done],
              ] as [string, number][]) {
                const row: HTMLElement = stats.createDiv('sr-stats-row');
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
            render: (setting: Setting): void => {
              setting.settingEl.empty();
              setting.settingEl.createEl('p', {
                cls: 'sr-settings-info',
                text: t.aboutText(this.plugin.settings.checkIntervalSec),
              });
            },
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

    const notice = el.createDiv('sr-settings-notice');
    new Setting(notice).setName(t.mobileH3).setHeading();
    notice.createEl('p', { text: t.mobileBody });

    new Setting(el).setName(t.secManagement).setHeading();

    new Setting(el)
      .setName(t.openPanelName)
      .setDesc(t.openPanelDesc)
      .addButton((b: ButtonComponent): void => {
        b.setButtonText(t.openPanelBtn);
        b.setCta();
        b.onClick((): void => {
          void this.plugin.activateView();
        });
      });

    new Setting(el)
      .setName(t.checkIntervalName)
      .setDesc(t.checkIntervalDesc)
      .addText((text: TextComponent): void => {
        text.setPlaceholder('30');
        text.setValue(String(this.plugin.settings.checkIntervalSec));
        text.onChange(async (raw: string): Promise<void> => {
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

    new Setting(el)
      .setName(t.languageName)
      .setDesc(t.languageDesc)
      .addDropdown((drop: DropdownComponent): void => {
        drop.addOption('auto', t.langAuto);
        drop.addOption('en', t.langEn);
        drop.addOption('ru', t.langRu);
        drop.setValue(this.plugin.settings.language);
        drop.onChange(async (val: string): Promise<void> => {
          this.plugin.settings.language = val as Language;
          await this.plugin.saveSettings();
          this.plugin.refreshStrings();
          this.refreshTab();
        });
      });

    new Setting(el)
      .setName(t.groupByName)
      .setDesc(t.groupByDesc)
      .addDropdown((drop: DropdownComponent): void => {
        drop.addOption('none', t.groupByNone);
        drop.addOption('minute', t.groupByMinute);
        drop.addOption('hour', t.groupByHour);
        drop.addOption('day', t.groupByDay);
        drop.addOption('week', t.groupByWeek);
        drop.addOption('month', t.groupByMonth);
        drop.addOption('year', t.groupByYear);
        drop.setValue(this.plugin.settings.groupBy);
        drop.onChange(async (val: string): Promise<void> => {
          this.plugin.settings.groupBy = val as GroupBy;
          await this.plugin.saveSettings();
          this.plugin.refreshView();
        });
      });

    new Setting(el)
      .setName(t.pruneCompletedDaysName)
      .setDesc(t.pruneCompletedDaysDesc)
      .addText((text: TextComponent): void => {
        text.setPlaceholder('3');
        text.setValue(String(this.plugin.settings.pruneCompletedDays));
        text.onChange(async (val: string): Promise<void> => {
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

    new Setting(el)
      .setName(t.testName)
      .setDesc(t.testDesc)
      .addButton((b: ButtonComponent): void => {
        b.setButtonText(t.testBtn);
        b.onClick((): void => {
          this.plugin.fireTestNotification();
        });
      });

    new Setting(el)
      .setName(t.reqPermName)
      .setDesc(t.reqPermDesc)
      .addButton((b: ButtonComponent): void => {
        b.setButtonText(t.reqPermBtn);
        b.onClick((): void => {
          this.plugin.requestNotificationPermission(true);
        });
      });

    new Setting(el)
      .setName(t.deleteAllName)
      .setDesc(t.deleteAllDesc)
      .addButton((b: ButtonComponent): void => {
        this.styleDeleteButton(b);
        b.onClick(async (): Promise<void> => {
          this.plugin.reminders = [];
          await this.plugin.saveSettings();
          new Notice(t.okAllDeleted);
          this.refreshTab();
        });
      });

    new Setting(el).setName(t.secStats).setHeading();

    const total = this.plugin.reminders.length;
    const active = this.plugin.reminders.filter((r) => !r.checked).length;
    const done = total - active;

    const stats: HTMLElement = el.createDiv('sr-settings-stats');
    for (const [label, val] of [
      [t.statTotal, total],
      [t.statActive, active],
      [t.statDone, done],
    ] as [string, number][]) {
      const row: HTMLElement = stats.createDiv('sr-stats-row');
      row.createSpan({ cls: 'sr-stats-label', text: label });
      row.createSpan({ cls: 'sr-stats-val', text: String(val) });
    }

    new Setting(el).setName(t.secAbout).setHeading();
    el.createEl('p', {
      cls: 'sr-settings-info',
      text: t.aboutText(this.plugin.settings.checkIntervalSec),
    });
  }
}
