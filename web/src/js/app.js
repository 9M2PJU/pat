import * as bootstrap from 'bootstrap';

import { alert } from './modules/utils/index.js';
import { Version } from './modules/version/index.js';
import { NotificationService } from './modules/notifications/index.js';
import { StatusPopover } from './modules/status-popover/index.js';
import { Geolocation } from './modules/geolocation/index.js';
import { ConnectModal } from './modules/connect-modal/index.js';
import { PromptModal } from './modules/prompt/index.js';
import { PasswordRecovery } from './modules/password-recovery/main.js';
import { Mailbox } from './modules/mailbox/index.js';
import { Composer } from './modules/composer/index.js';
import { FormCatalog } from './modules/form-catalog/index.js';
import { Viewer } from './modules/viewer/index.js';
import { ProgressBar } from './modules/progress-bar/index.js';
import { StatusText } from './modules/status-text/index.js';

let wsURL = '';
let mycall = '';

let ws;
let configHash; // For auto-reload on config changes

let statusPopover;
let promptModal;
let connectModal;
let version;
let notificationService;
let passwordRecovery;
let geolocation;
let mailbox;
let composer;
let formCatalog;
let viewer;
let progressBar;
let statusText;

document.addEventListener('DOMContentLoaded', function() {
  wsURL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  mycall = document.getElementById('mycall').textContent;

  statusPopover = new StatusPopover();
  statusPopover.init();
  connectModal = new ConnectModal(mycall);
  connectModal.init();
  promptModal = new PromptModal();
  promptModal.init();
  version = new Version(promptModal);
  passwordRecovery = new PasswordRecovery(promptModal, statusPopover, mycall);
  passwordRecovery.init();
  geolocation = new Geolocation(statusPopover);
  geolocation.init();
  notificationService = new NotificationService(statusPopover);
  notificationService.init();
  composer = new Composer(mycall);
  composer.init();
  viewer = new Viewer(composer);
  viewer.init();
  mailbox = new Mailbox((currentFolder, mid) => viewer.displayMessage(currentFolder, mid));
  mailbox.init();
  formCatalog = new FormCatalog(composer);
  formCatalog.init();
  progressBar = new ProgressBar();
  progressBar.init();
  statusText = new StatusText(() => connectModal.toggle());
  statusText.init();

  // Setup folder navigation
  document.querySelectorAll('a[data-folder]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const folder = e.currentTarget.dataset.folder;
      mailbox.displayFolder(folder);
      
      // Update active state
      document.querySelectorAll('.navbar-nav .nav-link').forEach(link => link.classList.remove('active'));
      e.currentTarget.classList.add('active');
    });
  });

  // Auto-collapse navbar on click (mobile)
  const navbarCollapse = document.getElementById('navbarCollapse');
  if (navbarCollapse) {
    const bsCollapse = new bootstrap.Collapse(navbarCollapse, { toggle: false });
    document.querySelectorAll('.navbar-nav .nav-link:not(.dropdown-toggle)').forEach(link => {
      link.addEventListener('click', () => {
        if (window.getComputedStyle(navbarCollapse).display !== 'none' && navbarCollapse.classList.contains('show')) {
          bsCollapse.hide();
        }
      });
    });
  }

  initWs();
  mailbox.displayFolder('in');
  version.checkNewVersion();
});

function initWs() {
  if (!('WebSocket' in window)) {
    alert('Websocket not supported by your browser, please upgrade your browser.');
    return;
  }

  ws = new WebSocket(wsURL);
  ws.onopen = () => {
    console.log('Websocket opened');
    statusPopover.hideWebsocketError();
    statusPopover.showWebserverInfo();
    const consoleEl = document.getElementById('console');
    if (consoleEl) consoleEl.innerHTML = '';
    setTimeout(() => {
      passwordRecovery.checkPasswordRecoveryEmail();
    }, 3000);
  };

  ws.onmessage = function(evt) {
    const msg = JSON.parse(evt.data);
    if (msg.MyCall) {
      mycall = msg.MyCall;
    }
    if (msg.Notification) {
      notificationService.show(msg.Notification.title, msg.Notification.body);
    }
    if (msg.LogLine) {
      updateConsole(msg.LogLine + '\n');
    }
    if (msg.UpdateMailbox) {
      mailbox.displayFolder(mailbox.currentFolder);
    }
    if (msg.Status) {
      if (configHash && configHash !== msg.Status.config_hash) {
        const composerEl = document.getElementById('composer');
        if (composerEl && composerEl.classList.contains('show')) {
          const div = document.getElementById('navbar_status');
          div.innerHTML = `
            <div class="alert alert-warning py-1 px-3 mb-0 rounded-0 small d-flex align-items-center">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              Configuration has changed, please <a href="#" class="alert-link ms-1" onclick="location.reload()">reload the page</a>.
            </div>
          `;
          div.style.display = 'block';
        } else {
          console.log('Config hash changed, reloading page');
          location.reload();
        }
      }
      configHash = msg.Status.config_hash;
      statusText.update(msg.Status);
      const n = msg.Status.http_clients.length;
      statusPopover.showWebserverInfo(`${n} client${n === 1 ? '' : 's'} connected.`);
    }
    if (msg.Progress) {
      progressBar.update(msg.Progress);
    }
    if (msg.Prompt) {
      promptModal.showSystemPrompt(msg.Prompt, (response) => {
        ws.send(JSON.stringify({ prompt_response: response }));
      });
      promptModal.setNotification(notificationService.show(msg.Prompt.message, ''));
    }
    if (msg.PromptAbort) {
      promptModal.hide();
    }
    if (msg.Ping) {
      ws.send(JSON.stringify({ Pong: true }));
    }
  };

  ws.onclose = () => {
    console.log('Websocket closed');
    statusPopover.showWebsocketError("WebSocket connection closed. Attempting to reconnect...");
    statusPopover.hideWebserverInfo();
    const statusTextEl = document.getElementById('status_text');
    if (statusTextEl) statusTextEl.innerHTML = '';
    window.setTimeout(function() {
      initWs();
    }, 1000);
  };
}

function updateConsole(msg) {
  const pre = document.getElementById('console');
  if (!pre) return;
  const span = document.createElement('span');
  span.className = 'terminal';
  span.textContent = msg;
  pre.appendChild(span);
  pre.scrollTop = pre.scrollHeight;
}
