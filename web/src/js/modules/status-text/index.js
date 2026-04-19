import * as bootstrap from 'bootstrap';

class StatusText {
  constructor(onReadyClick) {
    this.onReadyClick = onReadyClick;
    this.statusTextEl = null;
    this.tooltipInstance = null;
  }

  init() {
    this.statusTextEl = document.getElementById('status_text');
  }

  update(data) {
    if (!this.statusTextEl) return;
    
    // Dispose old tooltip
    if (this.tooltipInstance) {
      this.tooltipInstance.dispose();
      this.tooltipInstance = null;
    }

    this.statusTextEl.innerHTML = '';
    const newStatusTextEl = this.statusTextEl.cloneNode(true);
    this.statusTextEl.parentNode.replaceChild(newStatusTextEl, this.statusTextEl);
    this.statusTextEl = newStatusTextEl;

    const onDisconnect = (e) => {
      e.preventDefault();
      if (this.tooltipInstance) this.tooltipInstance.hide();
      this.disconnect(false, () => {
        this.statusTextEl.innerHTML = 'Disconnecting... ';
        
        const forceDisconnectHandler = (fe) => {
          fe.preventDefault();
          this.disconnect(true);
          if (this.tooltipInstance) this.tooltipInstance.hide();
        };
        
        const forceBtn = this.statusTextEl.cloneNode(true);
        this.statusTextEl.parentNode.replaceChild(forceBtn, this.statusTextEl);
        this.statusTextEl = forceBtn;
        this.statusTextEl.addEventListener('click', forceDisconnectHandler);
        
        this.statusTextEl.setAttribute('title', 'Click to force disconnect');
        this.tooltipInstance = new bootstrap.Tooltip(this.statusTextEl);
        this.tooltipInstance.show();
      });
    };

    if (data.dialing) {
      this.statusTextEl.innerHTML = '<span class="text-warning">Dialing...</span> ';
      this.statusTextEl.addEventListener('click', onDisconnect);
      this.statusTextEl.setAttribute('title', 'Click to abort');
      this.tooltipInstance = new bootstrap.Tooltip(this.statusTextEl);
    } else if (data.connected) {
      this.statusTextEl.innerHTML = '<span class="text-success">Connected</span> ' + (data.remote_addr || '');
      this.statusTextEl.addEventListener('click', onDisconnect);
      this.statusTextEl.setAttribute('title', 'Click to disconnect');
      this.tooltipInstance = new bootstrap.Tooltip(this.statusTextEl);
    } else {
      if (data.active_listeners && data.active_listeners.length > 0) {
        this.statusTextEl.innerHTML = '<i class="text-info">Listening ' + data.active_listeners + '</i>';
      } else {
        this.statusTextEl.innerHTML = '<i class="text-muted">Ready</i>';
      }
      this.statusTextEl.setAttribute('title', 'Click to connect');
      this.statusTextEl.addEventListener('click', (e) => {
        e.preventDefault();
        this.onReadyClick();
      });
      this.tooltipInstance = new bootstrap.Tooltip(this.statusTextEl);
    }
  }

  disconnect(dirty, successHandler) {
    fetch('/api/disconnect?dirty=' + dirty, { method: 'POST' })
      .then(response => {
        if (response.ok && successHandler) successHandler();
      })
      .catch(err => console.error('Disconnect failed', err));
  }
}

export { StatusText };
