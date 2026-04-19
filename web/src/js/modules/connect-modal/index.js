import URI from 'urijs';
import { alert } from '../utils';
import { RmslistView } from './rmslist-view';
import { PromptModal } from '../prompt';
import * as bootstrap from 'bootstrap';

class ConnectModal {
  constructor(mycall) {
    this.mycall = mycall;
    this.initialized = false;
    this.connectAliases = {};
    this.rmslistView = new RmslistView();
    this.preserveAliasSelection = false;
    this.promptModal = new PromptModal();
    this.modalInstance = null;
  }

  init() {
    this.promptModal.init();

    const connectBtn = document.getElementById('connect_btn');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.connect());
    }

    const connectFormInputs = document.querySelectorAll('#connectForm input');
    connectFormInputs.forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.connect();
          e.preventDefault();
        }
      });
    });

    const freqInput = document.getElementById('freqInput');
    if (freqInput) {
      freqInput.addEventListener('focusin', () => {
        window.setTimeout(() => {
          if (connectBtn) connectBtn.disabled = true;
        }, 300);
      });
      freqInput.addEventListener('focusout', () => {
        window.setTimeout(() => {
          if (connectBtn) connectBtn.disabled = false;
        }, 300);
      });
      freqInput.addEventListener('change', () => {
        this.onConnectInputChange();
        this.onConnectFreqChange();
      });
    }

    const inputs = [
      'bandwidthInput', 'radioOnlyInput', 'addrInput', 'targetInput', 'connectRequestsInput'
    ];
    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => this.onConnectInputChange());
    });
    
    const bandwidthInput = document.getElementById('bandwidthInput');
    if (bandwidthInput) {
        bandwidthInput.addEventListener('change', (e) => this.onConnectBandwidthChange(e));
    }

    const connectURLInput = document.getElementById('connectURLInput');
    if (connectURLInput) {
      connectURLInput.addEventListener('change', (e) => {
        this.setConnectValues(e.target.value);
      });
    }

    const aliasActionBtn = document.getElementById('aliasActionBtn');
    if (aliasActionBtn) {
      aliasActionBtn.addEventListener('click', () => {
        const aliasSelect = document.getElementById('aliasSelect');
        const selectedAlias = aliasSelect ? aliasSelect.value : '';
        if (selectedAlias && selectedAlias !== '') {
          this.deleteAlias(selectedAlias);
        } else {
          this.saveAsNewAlias();
        }
      });
    }

    this.rmslistView.init();
    this.rmslistView.onRowClick = (url) => this.setConnectValues(url);

    const connectModalEl = document.getElementById('connectModal');
    if (connectModalEl) {
      this.modalInstance = new bootstrap.Modal(connectModalEl);
      connectModalEl.addEventListener('hidden.bs.modal', () => this.rmslistView.reset());
    }

    const transportSelect = document.getElementById('transportSelect');
    if (transportSelect) {
      transportSelect.addEventListener('change', (e) => {
        const bandwidthInput = document.getElementById('bandwidthInput');
        const addrInput = document.getElementById('addrInput');
        const freqInput = document.getElementById('freqInput');
        const connectRequestsInput = document.getElementById('connectRequestsInput');

        if (bandwidthInput) bandwidthInput.value = '';
        if (addrInput) addrInput.value = '';
        if (freqInput) freqInput.value = '';
        if (connectRequestsInput) connectRequestsInput.value = '';
        
        this.setConnectURL('');
        this.refreshExtraInputGroups();
        this.onConnectInputChange();
        this.onConnectFreqChange();
        this.rmslistView.onTransportChange(e.target.value);
      });
    }

    const savedUrl = localStorage.getItem(`pat_connect_url_${this.mycall}`);
    if (savedUrl != null) {
      this.setConnectValues(savedUrl);
    }
    this.refreshExtraInputGroups();
    this.initialized = true;

    this.updateConnectAliases();
    this.updateAliasActionButton();
    this._initConfigDefaults();
  }

  _initConfigDefaults() {
    fetch('/api/config')
      .then(response => response.json())
      .then(config => {
        if (config.ardop && config.ardop.connect_requests) {
          const el = document.getElementById('connectRequestsInput');
          if (el) el.placeholder = config.ardop.connect_requests;
        }
      })
      .catch(err => console.log("Failed to load config defaults", err));
  }

  getConnectURL() {
    const el = document.getElementById('connectURLInput');
    return el ? el.value : '';
  }

  setConnectURL(url) {
    const el = document.getElementById('connectURLInput');
    if (el) el.value = decodeURIComponent(url);
  }

  buildConnectURL(options = {}) {
    const { preserveFreq = false } = options;
    const transport = document.getElementById('transportSelect').value;
    const addrInput = document.getElementById('addrInput');
    const targetInput = document.getElementById('targetInput');
    const freqInput = document.getElementById('freqInput');
    const bandwidthInput = document.getElementById('bandwidthInput');
    const radioOnlyInput = document.getElementById('radioOnlyInput');
    const connectRequestsInput = document.getElementById('connectRequestsInput');

    const current = URI(this.getConnectURL());
    let url;
    if (transport === 'telnet') {
      url = URI(transport + "://" + (addrInput ? addrInput.value : '') + current.search());
    } else {
      url = current.protocol(transport).hostname(addrInput ? addrInput.value : '');
    }
    url = url.path(targetInput ? targetInput.value : '');
    
    const isFreqSuccess = freqInput && freqInput.parentElement && freqInput.parentElement.classList.contains('has-success');
    if (freqInput && freqInput.value && (preserveFreq || isFreqSuccess)) {
      url = url.setQuery("freq", freqInput.value);
    } else {
      url = url.removeQuery("freq");
    }

    if (bandwidthInput && bandwidthInput.value) {
      url = url.setQuery("bw", bandwidthInput.value);
    } else {
      url = url.removeQuery("bw");
    }

    if (radioOnlyInput && radioOnlyInput.checked) {
      url = url.setQuery("radio_only", "true");
    } else {
      url = url.removeQuery("radio_only");
    }

    if (connectRequestsInput && connectRequestsInput.value) {
      url = url.setQuery('connect_requests', connectRequestsInput.value);
    } else {
      url = url.removeQuery('connect_requests');
    }
    return url.build();
  }

  onConnectFreqChange() {
    if (!this.initialized) return;

    const qsyWarning = document.getElementById('qsyWarning');
    if (qsyWarning) {
      qsyWarning.innerHTML = '';
      qsyWarning.hidden = true;
    }

    const freqInput = document.getElementById('freqInput');
    if (!freqInput) return;
    freqInput.style.textDecoration = 'none';

    const inputGroup = freqInput.parentElement;
    if (inputGroup) {
      inputGroup.classList.remove('has-error', 'has-success', 'has-warning', 'is-invalid', 'is-valid');
      // Tooltip removal logic if using BS5 tooltips
      const existingTooltip = bootstrap.Tooltip.getInstance(inputGroup);
      if (existingTooltip) existingTooltip.dispose();
    }

    const transport = document.getElementById('transportSelect').value;
    const freqVal = Number(freqInput.value);
    if (freqVal === 0) return;

    const data = { transport, freq: freqVal };

    fetch('/api/qsy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(response => {
      if (response.ok) {
        if (inputGroup) inputGroup.classList.add('has-success', 'is-valid');
      } else {
        freqInput.style.textDecoration = 'line-through';
        if (response.status === 503) {
          if (inputGroup) {
              new bootstrap.Tooltip(inputGroup, {
                  title: 'Rigcontrol is not configured for the selected transport. Set radio frequency manually.'
              });
          }
        } else {
          const msg = 'Could not set radio frequency. See log output for more details and/or set the frequency manually.';
          if (inputGroup) {
              inputGroup.classList.add('has-error', 'is-invalid');
              new bootstrap.Tooltip(inputGroup, { title: msg });
          }
          if (qsyWarning) {
            qsyWarning.innerHTML = '<i class="bi bi-exclamation-triangle"></i> QSY failure';
            qsyWarning.hidden = false;
            new bootstrap.Tooltip(qsyWarning, { title: msg });
          }
        }
      }
    })
    .finally(() => {
      this.withPreservedAliasSelection(() => {
        this.onConnectInputChange();
      });
    });
  }

  onConnectBandwidthChange(e) {
    const input = e.target;
    input.dataset.xValue = input.value;
    if (input.value === '') {
      delete input.dataset.xValue;
    }
    this.onConnectInputChange();
  }

  onConnectInputChange() {
    this.setConnectURL(this.buildConnectURL());

    if (!this.preserveAliasSelection) {
      const aliasSelect = document.getElementById('aliasSelect');
      if (aliasSelect) aliasSelect.value = '';
      this.updateAliasActionButton();
    }
  }

  updateAliasActionButton() {
    const aliasSelect = document.getElementById('aliasSelect');
    const selectedAlias = aliasSelect ? aliasSelect.value : '';
    const button = document.getElementById('aliasActionBtn');
    if (!button) return;
    
    const icon = button.querySelector('i');
    if (!icon) return;

    if (selectedAlias && selectedAlias !== '') {
      icon.className = 'bi bi-trash';
      button.title = 'Delete selected alias';
    } else {
      icon.className = 'bi bi-plus-lg';
      button.title = 'Save current configuration as new alias';
    }
    button.style.display = 'block';
  }

  withPreservedAliasSelection(callback) {
    this.preserveAliasSelection = true;
    callback();
    this.preserveAliasSelection = false;
  }

  deleteAlias(aliasName) {
    this.promptModal.showCustom({
      message: `Are you sure you want to delete the alias "${aliasName}"?`,
      buttons: [
        {
          text: 'Cancel',
          class: 'btn-secondary',
          onClick: () => { }
        },
        {
          text: 'Delete',
          class: 'btn-danger',
          onClick: () => {
            fetch(`/api/config/connect_aliases/${encodeURIComponent(aliasName)}`, {
              method: 'DELETE'
            })
            .then(response => {
              if (response.ok) {
                delete this.connectAliases[aliasName];
                const aliasSelect = document.getElementById('aliasSelect');
                if (aliasSelect) {
                    const opt = Array.from(aliasSelect.options).find(o => o.text === aliasName);
                    if (opt) opt.remove();
                    aliasSelect.value = '';
                }
                this.updateAliasActionButton();
              }
            });
          }
        }
      ]
    });
  }

  validateAliasName(name) {
    if (!name || !/^[a-zA-Z0-9_.@-]+$/.test(name)) {
      return 'Alias name must contain only letters, numbers, dashes, underscores, dots, and @ symbols.';
    }
    if (this.connectAliases[name]) {
      return 'An alias with this name already exists.';
    }
    return null;
  }

  promptForAliasName() {
    return new Promise((resolve) => {
      const tryAgain = (errorMessage = null) => {
        const inputId = 'aliasNameInput';
        const body = document.createElement('div');

        const p1 = document.createElement('p');
        p1.textContent = 'Create a new alias to save this connection configuration for quick access.';
        body.appendChild(p1);

        const p2 = document.createElement('p');
        p2.className = 'text-muted small';
        p2.textContent = 'Allowed characters: letters, numbers, dashes (-), underscores (_), dots (.), and @ symbols';
        body.appendChild(p2);

        if (errorMessage) {
          const errDiv = document.createElement('div');
          errDiv.className = 'alert alert-danger py-1 px-2 small';
          errDiv.textContent = errorMessage;
          body.appendChild(errDiv);
        }

        const input = document.createElement('input');
        input.type = 'text';
        input.id = inputId;
        input.className = 'form-control';
        input.placeholder = 'Enter alias name...';
        input.autocomplete = 'off';
        body.appendChild(input);

        this.promptModal.showCustom({
          message: 'New Connection Alias',
          body: body,
          buttons: [
            {
              text: 'Cancel',
              class: 'btn-secondary',
              onClick: () => resolve(null)
            },
            {
              text: 'Save',
              class: 'btn-primary',
              onClick: () => {
                const aliasName = input.value.trim();
                const validationError = this.validateAliasName(aliasName);
                if (validationError) {
                  this.promptModal.hide();
                  setTimeout(() => tryAgain(validationError), 100);
                  return;
                }
                resolve(aliasName);
              }
            }
          ]
        });

        const modalEl = document.querySelector(this.promptModal.modalSelector);
        modalEl.addEventListener('shown.bs.modal', () => input.focus(), { once: true });
      };
      tryAgain();
    });
  }

  saveAsNewAlias() {
    this.promptForAliasName().then((aliasName) => {
      if (!aliasName) {
        const aliasSelect = document.getElementById('aliasSelect');
        if (aliasSelect) aliasSelect.value = '';
        return;
      }

      const connectURL = this.buildConnectURL({ preserveFreq: true }).toString();
      if (!connectURL) {
        alert('No connection URL to save. Please configure connection settings first.');
        const aliasSelect = document.getElementById('aliasSelect');
        if (aliasSelect) aliasSelect.value = '';
        return;
      }

      fetch(`/api/config/connect_aliases/${encodeURIComponent(aliasName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectURL)
      })
      .then(response => {
        if (response.ok) {
          this.connectAliases[aliasName] = connectURL;
          const aliasSelect = document.getElementById('aliasSelect');
          if (aliasSelect) {
              const option = document.createElement('option');
              option.text = aliasName;
              aliasSelect.add(option);
              aliasSelect.value = aliasName;
          }
          this.updateAliasActionButton();
        } else {
          alert('Failed to save alias. Please try again.');
        }
      });
    });
  }

  refreshExtraInputGroups() {
    const transportSelect = document.getElementById('transportSelect');
    const transport = transportSelect ? transportSelect.value : '';
    this.populateBandwidths(transport);
    
    const freqInputDiv = document.getElementById('freqInputDiv');
    const addrInputDiv = document.getElementById('addrInputDiv');
    const connectRequestsInputDiv = document.getElementById('connectRequestsInputDiv');
    const radioOnlyInputDiv = document.getElementById('radioOnlyInputDiv');
    const radioOnlyInput = document.getElementById('radioOnlyInput');

    if (freqInputDiv) freqInputDiv.style.display = 'none';
    if (addrInputDiv) addrInputDiv.style.display = 'none';
    if (connectRequestsInputDiv) connectRequestsInputDiv.style.display = 'none';

    switch (transport) {
      case 'telnet':
        if (addrInputDiv) addrInputDiv.style.display = 'block';
        break;
      case 'ardop':
        if (freqInputDiv) freqInputDiv.style.display = 'block';
        if (connectRequestsInputDiv) connectRequestsInputDiv.style.display = 'block';
        break;
      default:
        if (freqInputDiv) freqInputDiv.style.display = 'block';
    }

    if (transport.startsWith('ax25')) {
      if (radioOnlyInput) radioOnlyInput.checked = false;
      if (radioOnlyInputDiv) radioOnlyInputDiv.style.display = 'none';
    } else {
      if (radioOnlyInputDiv) radioOnlyInputDiv.style.display = 'block';
    }
  }

  populateBandwidths(transport) {
    const select = document.getElementById('bandwidthInput');
    const div = document.getElementById('bandwidthInputDiv');
    if (!select) return;

    let selected = select.dataset.xValue;
    select.innerHTML = '';
    select.disabled = true;

    fetch(`/api/bandwidths?mode=${transport}`)
      .then(response => response.json())
      .then(data => {
        if (data.bandwidths.length === 0) {
            if (div) div.style.display = 'none';
            return;
        }
        if (selected === undefined) {
          selected = data.default;
        }
        data.bandwidths.forEach((bw) => {
          const option = document.createElement('option');
          option.value = bw;
          option.text = bw;
          if (bw === selected) option.selected = true;
          select.add(option);
        });
        this.withPreservedAliasSelection(() => {
          select.value = selected;
          // Trigger change manually
          select.dispatchEvent(new Event('change'));
        });
        if (div) div.style.display = 'block';
      })
      .finally(() => {
        select.dataset.xForTransport = transport;
        select.disabled = false;
      });
  }

  updateConnectAliases() {
    fetch('/api/config/connect_aliases')
      .then(response => response.json())
      .then(data => {
        this.connectAliases = data;
        const select = document.getElementById('aliasSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">(None)</option>';
        Object.keys(data).forEach(key => {
          const option = document.createElement('option');
          option.text = key;
          select.add(option);
        });

        select.addEventListener('change', () => {
          const selectedAlias = select.value;
          this.updateAliasActionButton();
          if (selectedAlias) {
            const url = this.connectAliases[selectedAlias];
            this.withPreservedAliasSelection(() => {
              this.setConnectValues(url);
            });
          }
        });
      });
  }

  setConnectValues(url) {
    const uri = URI(url.toString());
    const transportSelect = document.getElementById('transportSelect');
    const targetInput = document.getElementById('targetInput');
    const freqInput = document.getElementById('freqInput');
    const bandwidthInput = document.getElementById('bandwidthInput');
    const radioOnlyInput = document.getElementById('radioOnlyInput');
    const connectRequestsInput = document.getElementById('connectRequestsInput');
    const addrInput = document.getElementById('addrInput');

    if (transportSelect) transportSelect.value = uri.protocol();

    if (targetInput) targetInput.value = uri.path().substr(1);

    const query = uri.search(true);

    if (uri.hasQuery('freq')) {
      if (freqInput) freqInput.value = query['freq'];
    } else {
      if (freqInput) freqInput.value = '';
    }

    if (uri.hasQuery('bw')) {
      if (bandwidthInput) {
          bandwidthInput.value = query['bw'];
          bandwidthInput.dataset.xValue = query['bw'];
      }
    } else {
      if (bandwidthInput) {
          bandwidthInput.value = '';
          delete bandwidthInput.dataset.xValue;
      }
    }

    if (uri.hasQuery('radio_only')) {
      if (radioOnlyInput) radioOnlyInput.checked = (query['radio_only'] === 'true');
    } else {
      if (radioOnlyInput) radioOnlyInput.checked = false;
    }

    if (uri.hasQuery('connect_requests')) {
      if (connectRequestsInput) connectRequestsInput.value = query['connect_requests'];
    }

    let usri = '';
    if (uri.username()) usri += uri.username();
    if (uri.password()) usri += ':' + uri.password();
    if (usri != '') usri += '@';
    if (addrInput) addrInput.value = usri + uri.host();

    this.refreshExtraInputGroups();
    this.onConnectInputChange();
    this.onConnectFreqChange();
    this.setConnectURL(uri.toString());
  }

  toggle() {
    if (this.modalInstance) this.modalInstance.toggle();
  }

  connect() {
    const url = this.getConnectURL();
    localStorage.setItem(`pat_connect_url_${this.mycall}`, url);
    if (this.modalInstance) this.modalInstance.hide();

    fetch('/api/connect?url=' + encodeURIComponent(url))
      .then(response => response.json())
      .then(data => {
        if (data.NumReceived == 0) {
          window.setTimeout(() => alert('No new messages.'), 1000);
        }
      })
      .catch(err => {
        console.error('Connect failed', err);
        alert('Connect failed. See console for detailed information.');
      });
  }
}

export { ConnectModal };
