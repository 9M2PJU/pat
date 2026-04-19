export class Version {
  constructor(promptModal) {
    this.promptModal = promptModal;
  }

  checkNewVersion() {
    if (sessionStorage.getItem('pat_version_checked') === 'true') return;
    
    const lastCheck = parseInt(localStorage.getItem('pat_version_check_time') || '0');
    const now = Date.now();
    if (now - lastCheck < 72 * 60 * 60 * 1000) return;

    fetch('/api/new-release-check')
      .then(async response => {
        sessionStorage.setItem('pat_version_checked', 'true');
        if (response.status === 204) return;
        
        const data = await response.json();
        const ignoredVersion = localStorage.getItem('pat_ignored_version');
        if (data.version === ignoredVersion) return;

        const body = document.createElement('div');
        body.innerHTML = `
          <p>Version ${data.version} is now available 🎉</p>
          <p><a href="${data.release_url}" target="_blank">View release details</a></p>
        `;

        this.promptModal.showCustom({
          message: 'A new version of Pat is available!',
          body: body,
          buttons: [
            {
              text: 'Ignore this version',
              class: 'btn-outline-secondary',
              onClick: () => {
                localStorage.setItem('pat_ignored_version', data.version);
                this.promptModal.hide();
              }
            },
            {
              text: 'Remind me later',
              class: 'btn-secondary',
              onClick: () => {
                localStorage.setItem('pat_version_check_time', Date.now().toString());
                this.promptModal.hide();
              }
            },
            {
              text: 'Download',
              class: 'btn-primary',
              onClick: () => window.open(data.release_url, '_blank')
            }
          ]
        });
      })
      .catch(err => console.log('Version check failed:', err));
  }
}
