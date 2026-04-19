import * as bootstrap from 'bootstrap';

export class PromptModal {
  constructor(modalSelector = '#promptModal') {
    this.modalSelector = modalSelector;
    this.modalEl = null;
    this.modalInstance = null;
    this.modalBody = null;
    this.modalFooter = null;
    this.modalMessage = null;
    this.currentNotification = null;
    this.onResponse = null;
  }

  init() {
    this.modalEl = document.querySelector(this.modalSelector);
    if (!this.modalEl) return;
    
    this.modalBody = this.modalEl.querySelector('.modal-body');
    this.modalFooter = this.modalEl.querySelector('.modal-footer');
    this.modalMessage = document.getElementById('promptMessage');
    this.modalInstance = new bootstrap.Modal(this.modalEl, { backdrop: 'static', keyboard: false });

    // Ensure prompt modal appears on top of other modals
    this.modalEl.style.zIndex = '1060';
  }

  _cleanupModals() {
    if (this.modalInstance) this.modalInstance.hide();
  }

  showCustom(options = {}) {
    this._cleanupModals();

    // Clear previous content
    if (this.modalBody) this.modalBody.innerHTML = '';
    if (this.modalFooter) this.modalFooter.innerHTML = '';

    // Set message if provided
    if (options.message && this.modalMessage) {
      this.modalMessage.textContent = options.message;
    }

    // Handle custom content
    if (options.body && this.modalBody) {
      if (typeof options.body === 'string') {
          this.modalBody.innerHTML = options.body;
      } else {
          this.modalBody.appendChild(options.body);
      }
    }

    // Add buttons
    if (options.buttons && this.modalFooter) {
      options.buttons.forEach(button => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `btn ${button.class || 'btn-secondary'}`;
        if (button.pullLeft) btn.classList.add('me-auto'); // BS5 equivalent of pull-left in footer
        btn.textContent = button.text;
        btn.addEventListener('click', (e) => {
          if (button.onClick) {
            button.onClick(e);
          }
          if (button.close !== false) {
            this.hide();
          }
        });
        this.modalFooter.appendChild(btn);
      });
    }

    // Show the modal
    if (this.modalInstance) this.modalInstance.show();
  }

  showSystemPrompt(prompt, onResponse) {
    this._cleanupModals();

    if (this.modalBody) this.modalBody.innerHTML = '';
    if (this.modalFooter) this.modalFooter.innerHTML = '';

    this.onResponse = onResponse;
    this._handleSystemPrompt(prompt);
  }

  hide() {
    if (this.modalInstance) this.modalInstance.hide();
    if (this.currentNotification) {
      this.currentNotification.close();
      this.currentNotification = null;
    }
  }

  setNotification(notification) {
    if (this.currentNotification) {
      this.currentNotification.close();
    }
    this.currentNotification = notification;
  }

  _handleSystemPrompt(prompt) {
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.id = 'promptID';
    hiddenInput.value = prompt.id;
    this.modalBody.appendChild(hiddenInput);

    if (this.modalMessage) this.modalMessage.textContent = prompt.message;
    this.modalEl.dataset.promptKind = prompt.kind;

    switch (prompt.kind) {
      case 'password':
        const pwdInput = document.createElement('input');
        pwdInput.type = 'password';
        pwdInput.id = 'promptPasswordInput';
        pwdInput.className = 'form-control';
        pwdInput.placeholder = 'Enter password...';
        pwdInput.autocomplete = 'off';
        this.modalBody.appendChild(pwdInput);

        const okBtn = document.createElement('button');
        okBtn.type = 'button';
        okBtn.className = 'btn btn-primary';
        okBtn.id = 'promptOkButton';
        okBtn.textContent = 'OK';
        okBtn.addEventListener('click', () => {
          this._submitResponse(pwdInput.value);
        });
        this.modalFooter.appendChild(okBtn);
        break;

      case 'busy-channel':
        const busyDiv = document.createElement('div');
        busyDiv.className = 'text-center';
        busyDiv.innerHTML = '<div class="spinner-border text-secondary my-3" role="status"><span class="visually-hidden">Loading...</span></div>';
        this.modalBody.appendChild(busyDiv);

        const contBtn = document.createElement('button');
        contBtn.type = 'button';
        contBtn.className = 'btn btn-secondary';
        contBtn.id = 'promptOkButton';
        contBtn.textContent = 'Continue anyway';
        contBtn.addEventListener('click', () => this._submitResponse('continue'));
        this.modalFooter.appendChild(contBtn);

        const abortBtn = document.createElement('button');
        abortBtn.type = 'button';
        abortBtn.className = 'btn btn-primary';
        abortBtn.textContent = 'Abort';
        abortBtn.addEventListener('click', () => this._submitResponse('abort'));
        this.modalFooter.appendChild(abortBtn);
        break;

      case 'multi-select':
        const container = document.createElement('div');
        container.className = 'checkbox-list';
        const list = document.createElement('ul');
        list.className = 'list-unstyled';

        prompt.options.forEach(opt => {
          const li = document.createElement('li');
          const div = document.createElement('div');
          div.className = 'form-check';
          
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.className = 'form-check-input';
          input.value = opt.value;
          input.checked = opt.checked;
          input.id = 'check_' + opt.value;
          
          const label = document.createElement('label');
          label.className = 'form-check-label';
          label.htmlFor = input.id;
          label.textContent = ` ${opt.desc || opt.value} (${opt.value})`;
          
          div.appendChild(input);
          div.appendChild(label);
          li.appendChild(div);
          list.appendChild(li);
        });

        container.appendChild(list);
        this.modalBody.appendChild(container);

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'btn btn-secondary me-auto';
        toggleBtn.id = 'selectAllToggle';
        toggleBtn.textContent = 'Select All';
        toggleBtn.addEventListener('click', () => {
          const checkboxes = container.querySelectorAll('input[type="checkbox"]');
          const allSelected = Array.from(checkboxes).every(cb => cb.checked);
          checkboxes.forEach(cb => cb.checked = !allSelected);
          toggleBtn.textContent = !allSelected ? 'Deselect All' : 'Select All';
        });
        this.modalFooter.appendChild(toggleBtn);

        const multiOkBtn = document.createElement('button');
        multiOkBtn.type = 'button';
        multiOkBtn.className = 'btn btn-primary';
        multiOkBtn.id = 'promptOkButton';
        multiOkBtn.textContent = 'OK';
        multiOkBtn.addEventListener('click', () => {
          const value = Array.from(container.querySelectorAll('input:checked'))
            .map(cb => cb.value)
            .join(',');
          this._submitResponse(value);
        });
        this.modalFooter.appendChild(multiOkBtn);
        break;

      case 'pre-account-activation':
        this.modalBody.innerHTML = `
          <p class="text-warning"><strong>WARNING:</strong> We were unable to confirm that your Winlink account is active.</p>
          <p>If you continue, an over-the-air activation will be initiated and you will receive a message with a new password.</p>
          <p>This password will be the only key to your account. If you lose it, it cannot be recovered.</p>
          <p>It is strongly recommended to create your account before proceeding.</p>
        `;
        
        const preContBtn = document.createElement('button');
        preContBtn.className = 'btn btn-secondary me-auto';
        preContBtn.textContent = 'Continue anyway';
        preContBtn.addEventListener('click', () => this._submitResponse('confirmed'));
        this.modalFooter.appendChild(preContBtn);

        const preAbortBtn = document.createElement('button');
        preAbortBtn.className = 'btn btn-secondary';
        preAbortBtn.textContent = 'Abort';
        preAbortBtn.addEventListener('click', () => this._submitResponse('abort'));
        this.modalFooter.appendChild(preAbortBtn);

        const preCreateBtn = document.createElement('button');
        preCreateBtn.className = 'btn btn-primary';
        preCreateBtn.textContent = 'Create new account';
        preCreateBtn.addEventListener('click', () => {
          this._submitResponse('abort');
          window.location.href = '/ui/config?action=create-account';
        });
        this.modalFooter.appendChild(preCreateBtn);
        break;

      case 'account-activation':
        this.modalBody.innerHTML = `
          <p>Welcome! The system has automatically generated a password for your new account.</p>
          <p>This password is in a message that is ready to be downloaded to your inbox during this session.</p>
          <p class="text-warning"><strong>WARNING:</strong> Once you download this message, the password inside is the only key to your account. If you lose it, it cannot be recovered.</p>
          <p>Are you ready to receive this message and save the password securely right now?</p>
        `;

        const actDeferBtn = document.createElement('button');
        actDeferBtn.className = 'btn btn-secondary';
        actDeferBtn.textContent = 'Postpone to Next Connection';
        actDeferBtn.addEventListener('click', () => this._submitResponse('defer'));
        this.modalFooter.appendChild(actDeferBtn);

        const actAcceptBtn = document.createElement('button');
        actAcceptBtn.className = 'btn btn-primary';
        actAcceptBtn.textContent = 'Yes, Download Now';
        actAcceptBtn.addEventListener('click', () => this._submitResponse('accept'));
        this.modalFooter.appendChild(actAcceptBtn);
        break;

      default:
        console.log('Ignoring unsupported prompt kind:', prompt.kind);
        return;
    }

    if (this.modalInstance) this.modalInstance.show();
  }

  _submitResponse(value) {
    const idInput = document.getElementById('promptID');
    const id = idInput ? idInput.value : null;
    this.hide();
    if (this.onResponse) {
      this.onResponse({ id: id, value: value });
    }
  }
}
