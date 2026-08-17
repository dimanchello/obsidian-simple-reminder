import { MarkdownRenderChild } from 'obsidian';
import type SimpleReminderPlugin from './main';
import { ReminderWidget } from './ReminderWidget';
import { parseCodeBlockConfig } from './utils';

export class ReminderCodeBlockChild extends MarkdownRenderChild {
  private plugin: SimpleReminderPlugin;
  private widget: ReminderWidget;
  private unregister: (() => void) | null = null;

  constructor(containerEl: HTMLElement, plugin: SimpleReminderPlugin, source: string) {
    super(containerEl);
    this.plugin = plugin;
    const config = parseCodeBlockConfig(source);
    this.widget = new ReminderWidget({
      containerEl,
      plugin,
      initialTab: config.tab,
      groupBy: config.groupBy,
      showHeader: config.showHeader,
      showTabs: config.showTabs,
      title: config.title,
      isEmbedded: true,
    });
  }

  onload(): void {
    this.unregister = this.plugin.registerCodeBlock(() => this.render());
    this.render();
  }

  onunload(): void {
    if (this.unregister) {
      this.unregister();
      this.unregister = null;
    }
  }

  render(): void {
    this.widget.render();
  }
}
