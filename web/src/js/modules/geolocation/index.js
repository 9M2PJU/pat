import { alert, isInsecureOrigin, dateFormat } from '../utils/index.js';
import * as bootstrap from 'bootstrap';

export class Geolocation {
  constructor(statusPopover) {
    this.statusPopover = statusPopover;
    this.modalEl = null;
    this.modalInstance = null;
    this.posId = 0;
  }

  init() {
    this.modalEl = document.getElementById('posModal');
    if (!this.modalEl) {
      console.error('Geolocation module: Container not found');
      return;
    }
    this.modalInstance = new bootstrap.Modal(this.modalEl);

    this.modalEl.querySelector('#pos_btn')?.addEventListener('click', () => {
      this.postPosition();
    });

    this.modalEl.addEventListener('shown.bs.modal', () => {
      this.onModalShown();
    });

    this.modalEl.addEventListener('hidden.bs.modal', () => {
      this.onModalHidden();
    });
  }

  handleGeolocationError(error) {
    let message = 'Geolocation error.';
    if (error && error.message) {
      message = error.message;
    }
    if ((error.message && error.message.search('insecure origin') > 0) || isInsecureOrigin()) {
      this.statusPopover.displayInsecureOriginWarning('geolocation');
    }
    this.statusPopover.showGeolocationError(message);
    const statusEl = this.modalEl.querySelector('#pos_status');
    if (statusEl) statusEl.innerHTML = 'Geolocation unavailable.';
  }

  updatePositionGeolocation(pos) {
    let d;
    if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
      d = new Date();
    } else {
      d = new Date(pos.timestamp);
    }
    const statusEl = this.modalEl.querySelector('#pos_status');
    if (statusEl) statusEl.innerHTML = 'Last position update ' + dateFormat(d) + '...';
    
    const latEl = this.modalEl.querySelector('#pos_lat');
    const longEl = this.modalEl.querySelector('#pos_long');
    const tsEl = this.modalEl.querySelector('#pos_ts');
    
    if (latEl) latEl.value = pos.coords.latitude;
    if (longEl) longEl.value = pos.coords.longitude;
    if (tsEl) tsEl.value = d.getTime();
  }

  updatePositionGPS(gpsData) {
    const d = new Date(gpsData.Time);
    const statusEl = this.modalEl.querySelector('#pos_status');
    if (statusEl) statusEl.innerHTML = 'Last position update ' + dateFormat(d) + '...';
    
    const latEl = this.modalEl.querySelector('#pos_lat');
    const longEl = this.modalEl.querySelector('#pos_long');
    const tsEl = this.modalEl.querySelector('#pos_ts');

    if (latEl) latEl.value = gpsData.Lat;
    if (longEl) longEl.value = gpsData.Lon;
    if (tsEl) tsEl.value = d.getTime();
  }

  postPosition() {
    const lat = parseFloat(this.modalEl.querySelector('#pos_lat').value);
    const lon = parseFloat(this.modalEl.querySelector('#pos_long').value);
    const comment = this.modalEl.querySelector('#pos_comment').value;
    const ts = parseInt(this.modalEl.querySelector('#pos_ts').value);

    const pos = {
      lat: lat,
      lon: lon,
      comment: comment,
      date: new Date(ts),
    };

    fetch('/api/posreport', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pos)
    })
    .then(async response => {
      const text = await response.text();
      if (response.ok) {
        this.modalInstance.hide();
        alert(text);
      } else {
        alert('Failed to post position: ' + text);
      }
    })
    .catch(err => alert('Failed to post position: ' + err.message));
  }

  onModalShown() {
    const statusEl = this.modalEl.querySelector('#pos_status');
    if (statusEl) statusEl.innerHTML = 'Checking if GPS device is available';

    fetch('/api/current_gps_position')
      .then(res => {
        if (!res.ok) throw new Error('GPS not available');
        return res.json();
      })
      .then(gpsData => {
        if (statusEl) statusEl.innerHTML = '<strong>Waiting for position from GPS device...</strong>';
        this.updatePositionGPS(gpsData);
      })
      .catch(() => {
        if (statusEl) statusEl.innerHTML = 'GPS device not available!';
        if (navigator.geolocation) {
          if (statusEl) statusEl.innerHTML = '<strong>Waiting for position (geolocation)...</strong>';
          const geoOptions = { enableHighAccuracy: true, maximumAge: 0 };
          this.posId = navigator.geolocation.watchPosition(
            (pos) => this.updatePositionGeolocation(pos),
            (error) => this.handleGeolocationError(error),
            geoOptions
          );
        } else {
          if (statusEl) statusEl.innerHTML = 'Geolocation is not supported by this browser.';
        }
      });
  }

  onModalHidden() {
    if (navigator.geolocation && this.posId !== 0) {
      navigator.geolocation.clearWatch(this.posId);
      this.posId = 0;
    }
  }
}
