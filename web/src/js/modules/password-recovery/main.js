export class PasswordRecovery {
  constructor(promptModal, statusPopover, mycall) {
    this.promptModal = promptModal;
    this.statusPopover = statusPopover;
    this.mycall = mycall;
    this.warningSection = null;
  }

  init() {
    document.addEventListener('click', (e) => {
      if (e.target.id === 'fix-now-btn') this.promptRecoveryEmail();
      if (e.target.id === 'dismiss_password_warning') this.dismissPasswordRecoveryWarning();
    });
  }

  checkPasswordRecoveryEmail() {
    if (this.wasLastVerified(30 * 24 * 60 * 60 * 1000)) return;
    if (this.isPasswordRecoveryDismissed()) return;

    fetch('/api/winlink-account/password-recovery-email')
      .then(res => {
        if (!res.ok) throw new Error('Check failed');
        return res.json();
      })
      .then(data => {
        if (!data.recovery_email || data.recovery_email.trim() === '') {
          this.showPasswordRecoveryWarning();
          this.statusPopover.show();
        } else {
          this.setLastVerified();
          this.hidePasswordRecoveryWarning();
        }
      })
      .catch(err => console.log('Password recovery email check failed (expected when offline):', err));
  }

  showPasswordRecoveryWarning() {
    if (this.warningSection) return;

    const body = document.createElement('div');
    body.innerHTML = `
      <p class="mb-1">You have no recovery email set for your Winlink account.</p>
      <p class="small text-muted mb-3">Add one now so you can easily reset a forgotten password.</p>
      <div class="d-flex justify-content-end gap-2">
        <button type="button" class="btn btn-sm btn-outline-light" id="dismiss_password_warning">Later</button>
        <button type="button" class="btn btn-sm btn-light" id="fix-now-btn">Add Email</button>
      </div>
    `;

    this.warningSection = this.statusPopover.addSection({
      severity: 'warning',
      title: 'Secure Your Account',
      body: body,
    });
  }

  hidePasswordRecoveryWarning() {
    if (!this.warningSection) return;
    this.statusPopover.removeSection(this.warningSection);
    this.warningSection = null;
  }

  dismissPasswordRecoveryWarning() {
    const dismissUntil = Date.now() + (84 * 60 * 60 * 1000);
    localStorage.setItem(`passwordRecoveryDismissed_${this.mycall}`, dismissUntil.toString());
    this.hidePasswordRecoveryWarning();
  }

  isPasswordRecoveryDismissed() {
    const dismissUntil = localStorage.getItem(`passwordRecoveryDismissed_${this.mycall}`);
    if (!dismissUntil) return false;
    return Date.now() < parseInt(dismissUntil, 10);
  }

  setLastVerified() {
    localStorage.setItem(`passwordRecoveryLastCheck_${this.mycall}`, Date.now().toString());
  }

  wasLastVerified(gracePeriodMillis) {
    const lastCheck = localStorage.getItem(`passwordRecoveryLastCheck_${this.mycall}`);
    if (!lastCheck) return false;
    return (Date.now() - lastCheck) < gracePeriodMillis;
  }

  promptRecoveryEmail() {
    this.promptModal.showCustom({
      message: 'Recovery Email Address',
      body: `
        <p>Please enter your recovery email address. This will be used to recover your password if you forget it.</p>
        <div class="mb-3">
          <input type="email" class="form-control" id="recoveryEmail" placeholder="Enter your recovery email">
        </div>
        <div id="recovery-error" class="alert alert-danger d-none py-2 px-3 small"></div>
        <small class="form-text text-muted">
          By submitting, your email address will be sent directly to winlink.org. See <a href="https://winlink.org/terms_conditions" target="_blank">Winlink's Privacy Policy</a>.
        </small>
      `,
      buttons: [
        {
          text: 'Cancel',
          class: 'btn-secondary',
          onClick: () => this.promptModal.hide()
        },
        {
          text: 'Submit',
          class: 'btn-primary',
          close: false,
          onClick: (event) => {
            const saveButton = event.currentTarget;
            const email = document.getElementById('recoveryEmail').value;
            const errorContainer = document.getElementById('recovery-error');

            saveButton.disabled = true;
            saveButton.innerHTML = '<i class="bi bi-arrow-repeat icon-spin me-1"></i> Submitting...';
            if (errorContainer) errorContainer.classList.add('d-none');

            fetch('/api/winlink-account/password-recovery-email', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ recovery_email: email })
            })
            .then(async res => {
              if (res.ok) {
                saveButton.innerHTML = '<i class="bi bi-check-lg me-1"></i> Submitted';
                this.hidePasswordRecoveryWarning();
                setTimeout(() => this.promptModal.hide(), 2000);
              } else {
                const data = await res.json().catch(() => ({}));
                const msg = data.error || await res.text() || 'An unknown error occurred.';
                if (errorContainer) {
                  errorContainer.textContent = msg;
                  errorContainer.classList.remove('d-none');
                }
                saveButton.disabled = false;
                saveButton.textContent = 'Retry';
              }
            })
            .catch(err => {
              if (errorContainer) {
                errorContainer.textContent = err.message;
                errorContainer.classList.remove('d-none');
              }
              saveButton.disabled = false;
              saveButton.textContent = 'Retry';
            });
          }
        }
      ]
    });
  }
}
