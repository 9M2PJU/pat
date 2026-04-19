import logoUrl from '../../../static/pat_logo.png';
import { isInsecureOrigin } from '../utils/index.js';

export class NotificationService {
  constructor(statusPopover) {
    this.statusPopover = statusPopover;
  }
  init() {
    this.requestSystemPermission();
  }

  isSupported() {
    if (!window.Notification || !Notification.requestPermission) return false;
    if (Notification.permission === 'granted') return true;

    // Chrome on Android support notifications only in the context of a Service worker.
    // This is a hack to detect this case, so we can avoid asking for a pointless permission.
    try {
      new Notification('');
    } catch (e) {
      if (e.name === 'TypeError') return false;
    }
    return true;
  }

  requestSystemPermission() {
    if (!this.isSupported()) {
      const body = this.statusPopover.getNotificationsErrorPanelBody();
      if (body) body.textContent = 'Not supported by this browser.';
      this.statusPopover.showNotificationsErrorPanel();
      return;
    }

    Notification.requestPermission((permission) => {
      const body = this.statusPopover.getNotificationsErrorPanelBody();

      if (permission === 'granted') {
        this.statusPopover.hideNotificationsErrorPanel();
      } else if (isInsecureOrigin()) {
        this.statusPopover.displayInsecureOriginWarning('notifications');
      } else {
        if (body) body.textContent = 'Notification permission denied or dismissed.';
        this.statusPopover.showNotificationsErrorPanel();
      }
    });
  }

  show(title, body = '') {
    if (this.isSupported() && Notification.permission === 'granted') {
      const options = { body, icon: logoUrl };
      return new Notification(title, options);
    }
    return null;
  }
}
