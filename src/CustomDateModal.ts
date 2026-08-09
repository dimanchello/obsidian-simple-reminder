import { App, Modal, Setting } from 'obsidian';
import { Strings } from './i18n';

export class CustomDateModal extends Modal {
  private t: Strings;
  private onConfirm: (dateStr: string) => void;
  private dateValue: string = '';

  constructor(app: App, t: Strings, onConfirm: (dateStr: string) => void) {
    super(app);
    this.t = t;
    this.onConfirm = onConfirm;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass('sr-custom-date-modal');

    contentEl.createEl('h2', { text: 'Выберите дату и время' });

    const now = new Date();
    // Format for datetime-local: YYYY-MM-DDThh:mm
    const pad = (n: number): string => String(n).padStart(2, '0');
    const defaultVal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    this.dateValue = defaultVal;

    new Setting(contentEl).setName('Дата и время').addText((text) => {
      text.inputEl.type = 'datetime-local';
      text.setValue(this.dateValue);
      text.onChange((value) => {
        this.dateValue = value;
      });
    });

    const btnRow = contentEl.createDiv('sr-btn-row');
    btnRow.style.marginTop = '20px';
    btnRow.style.display = 'flex';
    btnRow.style.justifyContent = 'flex-end';
    btnRow.style.gap = '10px';

    const cancelBtn = btnRow.createEl('button', { text: this.t.confirmNo });
    cancelBtn.addEventListener('click', () => this.close());

    const okBtn = btnRow.createEl('button', { cls: 'mod-cta', text: this.t.saveBtn });
    okBtn.addEventListener('click', () => {
      // Return format: YYYY-MM-DD HH:mm
      if (this.dateValue) {
        const formatted = this.dateValue.replace('T', ' ');
        this.onConfirm(formatted);
      }
      this.close();
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
