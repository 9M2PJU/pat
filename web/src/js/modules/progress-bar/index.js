import { htmlEscape } from '../utils/index.js';

export class ProgressBar {
  constructor() {
    this.cancelCloseTimer = false;
    this.progressBarEl = null;
  }

  init() {
    this.progressBarEl = document.getElementById('navbar_progress');
  }

  update(p) {
    if (!this.progressBarEl) return;
    this.cancelCloseTimer = !p.done;

    const textEl = this.progressBarEl.querySelector('.progress-text');
    const barEl = this.progressBarEl.querySelector('.progress-bar');

    if (p.receiving || p.sending) {
      const percent = Math.ceil((p.bytes_transferred * 100) / p.bytes_total);
      const op = p.receiving ? 'Receiving' : 'Sending';
      let text = `${op} ${p.mid} (${p.bytes_total} bytes)`;
      if (p.subject) {
        text += ' - ' + htmlEscape(p.subject);
      }
      if (textEl) textEl.textContent = text;
      if (barEl) {
        barEl.style.width = percent + '%';
        barEl.textContent = percent + '%';
      }
    }

    const isVisible = !this.progressBarEl.classList.contains('d-none');

    if (isVisible && p.done) {
      window.setTimeout(() => {
        if (!this.cancelCloseTimer) {
          this.progressBarEl.classList.add('d-none');
        }
      }, 3000);
    } else if ((p.receiving || p.sending) && !p.done) {
      this.progressBarEl.classList.remove('d-none');
    }
  }
}
