import * as bootstrap from 'bootstrap';

export class StatusPopover {
  constructor() {
    this.statusPopoverDiv = null;
    this.guiStatusLight = null;
    this.navbarBrand = null;
    this.popover = null;
    this._panelSelectors = {
      websocketError: '#websocket_error',
      webserverInfo: '#webserver_info',
      notificationsError: '#notifications_error',
      geolocationError: '#geolocation_error',
      noError: '#no_error',
    };
  }

  init() {
    this.statusPopoverDiv = document.getElementById('status_popover_content');
    this.guiStatusLight = document.getElementById('gui_status_light');
    this.navbarBrand = document.querySelector('.navbar-brand');
    this._initPopover();
  }

  _initPopover() {
    this.showWebsocketError("Attempting to connect to WebSocket...");
    this.showNotificationsErrorPanel();

    if (this.guiStatusLight) {
      this.popover = new bootstrap.Popover(this.guiStatusLight, {
        placement: 'bottom',
        content: this.statusPopoverDiv,
        html: true,
        sanitize: false, // Important to allow our complex content
      });

      this.navbarBrand.addEventListener('click', (e) => {
        e.preventDefault();
        this.popover.toggle();
      });
    }
    
    if (this.statusPopoverDiv) {
        this.statusPopoverDiv.style.display = 'block';
    }
  }

  addSection({ severity, title, body }) {
    const cardClass = `text-bg-${severity === 'danger' ? 'danger' : severity === 'warning' ? 'warning' : 'info'}`;
    const newSection = document.createElement('div');
    newSection.className = `card mb-2 ${cardClass}`;
    newSection.dataset.severity = severity;
    newSection.innerHTML = `
        <div class="card-header py-1 px-2 small">${title}</div>
        <div class="card-body py-1 px-2 small"></div>
    `;

    const bodyEl = newSection.querySelector('.card-body');
    if (typeof body === 'string') {
        bodyEl.innerHTML = body;
    } else {
        bodyEl.appendChild(body);
    }

    const severityOrder = { danger: 3, warning: 2, info: 1 };
    const newSeverity = severityOrder[severity] || 0;

    let inserted = false;
    const existingPanels = this.statusPopoverDiv.querySelectorAll('.card[data-severity]');
    for (const panel of existingPanels) {
      const existingSeverity = severityOrder[panel.dataset.severity] || 0;
      if (newSeverity > existingSeverity) {
        panel.parentNode.insertBefore(newSection, panel);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      const noError = this.statusPopoverDiv.querySelector(this._panelSelectors.noError);
      if (noError) {
          noError.parentNode.insertBefore(newSection, noError);
      } else {
          this.statusPopoverDiv.appendChild(newSection);
      }
    }

    this.updateGUIStatus();
    return newSection;
  }

  removeSection(section) {
    if (section) {
      section.remove();
      this.updateGUIStatus();
    }
  }

  _setPanelState(panelSelector, isVisible, content = null, isHtml = false) {
    const panel = this.statusPopoverDiv.querySelector(panelSelector);
    if (!panel) return;

    if (content !== null) {
      const panelBody = panel.querySelector('.card-body, .panel-body');
      if (panelBody) {
        isHtml ? panelBody.innerHTML = content : panelBody.textContent = content;
      }
    }
    this.showGUIStatus(panel, isVisible);
    this.updateGUIStatus();
  }

  updateGUIStatus() {
    let color = 'success';
    
    const hasDanger = this.statusPopoverDiv.querySelector('.card.text-bg-danger:not(.d-none):not(.ignore-status), .panel-danger:not(.hidden):not(.ignore-status)');
    const hasWarning = this.statusPopoverDiv.querySelector('.card.text-bg-warning:not(.d-none):not(.ignore-status), .panel-warning:not(.hidden):not(.ignore-status)');
    const hasInfo = this.statusPopoverDiv.querySelector('.card.text-bg-info:not(.d-none):not(.ignore-status), .panel-info:not(.hidden):not(.ignore-status)');

    if (hasDanger) color = 'danger';
    else if (hasWarning) color = 'warning';
    else if (hasInfo) color = 'info';

    if (this.guiStatusLight) {
        this.guiStatusLight.className = this.guiStatusLight.className.replace(/\bbtn-\S+/g, '');
        this.guiStatusLight.classList.add('btn-' + color);
    }

    const noErrorPanel = this.statusPopoverDiv.querySelector(this._panelSelectors.noError);
    if (noErrorPanel) {
        this.showGUIStatus(noErrorPanel, color === 'success');
    }
  }

  showGUIStatus(element, show) {
    if (!element) return;
    show ? element.classList.remove('d-none', 'hidden') : element.classList.add('d-none', 'hidden');
  }

  find(selector) {
    return this.statusPopoverDiv.querySelector(selector);
  }

  showWebsocketError(message = "WebSocket Connection Error") {
    this._setPanelState(this._panelSelectors.websocketError, true, message);
  }
  hideWebsocketError() {
    this._setPanelState(this._panelSelectors.websocketError, false);
  }

  showWebserverInfo(htmlMessage = "Webserver active") {
    this._setPanelState(this._panelSelectors.webserverInfo, true, htmlMessage, true);
  }
  hideWebserverInfo() {
    this._setPanelState(this._panelSelectors.webserverInfo, false);
  }

  showNotificationsErrorPanel() {
    this._setPanelState(this._panelSelectors.notificationsError, true);
  }
  hideNotificationsErrorPanel() {
    this._setPanelState(this._panelSelectors.notificationsError, false);
  }
  getNotificationsErrorPanelBody() {
    const panel = this.find(this._panelSelectors.notificationsError);
    return panel ? panel.querySelector('.card-body, .panel-body') : null;
  }
  getNotificationsErrorPanel() {
    return this.find(this._panelSelectors.notificationsError);
  }

  showGeolocationError(message = "Geolocation error") {
    this._setPanelState(this._panelSelectors.geolocationError, true, message);
  }
  hideGeolocationError() {
    this._setPanelState(this._panelSelectors.geolocationError, false);
  }
  getGeolocationErrorPanel() {
    return this.find(this._panelSelectors.geolocationError);
  }

  displayInsecureOriginWarning(panelKey) {
    let panelSelector;
    if (panelKey === 'geolocation') {
      panelSelector = this._panelSelectors.geolocationError;
    } else if (panelKey === 'notifications') {
      panelSelector = this._panelSelectors.notificationsError;
    } else {
      return;
    }

    const panel = this.find(panelSelector);
    if (panel) {
      panel.classList.remove('text-bg-info', 'panel-info');
      panel.classList.add('text-bg-warning', 'panel-warning');
      const panelBody = panel.querySelector('.card-body, .panel-body');
      if (panelBody) {
          const existing = panelBody.querySelector('p.insecure-origin-warning');
          if (existing) existing.remove();
          const p = document.createElement('p');
          p.className = 'insecure-origin-warning';
          p.innerHTML = 'Ensure the <a href="https://github.com/la5nta/pat/wiki/The-web-GUI#powerful-features">secure origin criteria for Powerful Features</a> are met.';
          panelBody.appendChild(p);
      }
      this.showGUIStatus(panel, true);
      this.updateGUIStatus();
    }
  }

  show() {
    if (this.popover) this.popover.show();
  }
}
