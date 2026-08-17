import { ItemView, WorkspaceLeaf } from 'obsidian';
import type SimpleReminderPlugin from './main';
import { ReminderWidget } from './ReminderWidget';

export const VIEW_TYPE_REMINDER = 'simple-reminder-view';

export class ReminderView extends ItemView {
  private plugin: SimpleReminderPlugin;
  private widget: ReminderWidget;

  constructor(leaf: WorkspaceLeaf, plugin: SimpleReminderPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.widget = new ReminderWidget({
      containerEl: this.contentEl,
      plugin: this.plugin,
      initialTab: this.plugin.settings.activeTab || 'all',
      isEmbedded: false,
      onTabChange: async (tab) => {
        this.plugin.settings.activeTab = tab;
        await this.plugin.saveSettings();
      },
    });
  }

  getViewType(): string {
    return VIEW_TYPE_REMINDER;
  }
  getDisplayText(): string {
    return this.plugin.t.pluginName;
  }
  getIcon(): string {
    return 'bell';
  }

  async onOpen(): Promise<void> {
    this.render();
  }
  async onClose(): Promise<void> {}

  refresh(): void {
    this.render();
  }

  private render(): void {
    this.widget.render();
  }
}
