import { Modal } from 'bootstrap';

document.addEventListener('DOMContentLoaded', () => {
  let originalConfig = null;
  const configForm = document.getElementById('configForm');
  const statusMessage = document.getElementById('statusMessage');
  const restartModal = new Modal(document.getElementById('restartNotice'));
  const createAccountModal = new Modal(document.getElementById('createAccountModal'));

  // Utility to show status messages
  const showStatus = (msg, isError = false) => {
    statusMessage.textContent = msg;
    statusMessage.className = isError ? 'small fw-bold text-danger' : 'small fw-bold text-success';
    setTimeout(() => {
        statusMessage.textContent = '';
    }, 5000);
  };

  // Enforce minimum beacon interval
  const enforceMinBeaconInterval = (input) => {
    const value = parseInt(input.value, 10);
    if (value > 0 && value < 10) {
      input.value = 10;
    }
  };

  ['ardop_beacon_interval', 'ax25_beacon_interval'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('blur', () => enforceMinBeaconInterval(el));
  });

  // Callsign verification
  const mycallInput = document.getElementById('mycall');
  const mycallStatus = document.getElementById('mycall-status');
  const createAccountPrompt = document.getElementById('create-account-prompt');

  mycallInput.addEventListener('blur', async () => {
    const callsign = mycallInput.value.trim().toUpperCase();
    if (callsign.length < 3) {
      mycallStatus.classList.add('d-none');
      return;
    }

    mycallStatus.classList.remove('d-none');
    mycallStatus.innerHTML = '<i class="bi bi-arrow-repeat spin"></i>';

    try {
      const response = await fetch(`/api/winlink-account/registration?callsign=${callsign}`);
      const data = await response.json();
      
      mycallStatus.innerHTML = data.exists 
        ? '<i class="bi bi-check-circle-fill text-success" title="Winlink account exists"></i>'
        : '<i class="bi bi-x-circle-fill text-danger" title="Winlink account does not exist"></i>';
      
      createAccountPrompt.style.display = data.exists ? 'none' : 'block';
    } catch (err) {
      mycallStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill text-warning" title="Verification failed"></i>';
      createAccountPrompt.style.display = 'none';
    }
  });

  // Password toggle
  document.getElementById('toggle-password').addEventListener('click', function() {
    const pwd = document.getElementById('secure_login_password');
    const icon = this.querySelector('i');
    const isPwd = pwd.type === 'password';
    pwd.type = isPwd ? 'text' : 'password';
    icon.className = isPwd ? 'bi bi-eye-slash' : 'bi bi-eye';
  });

  // Geolocation
  const locateBtn = document.getElementById('locate-me');
  locateBtn.addEventListener('click', async () => {
    const icon = locateBtn.querySelector('i');
    const statusDiv = document.getElementById('locate-status');
    const locatorField = document.getElementById('locator');

    locateBtn.disabled = true;
    icon.className = 'bi bi-arrow-repeat spin';
    statusDiv.classList.remove('d-none', 'text-danger', 'text-success');
    statusDiv.classList.add('text-info');
    statusDiv.textContent = 'Locating...';

    try {
      // Try GPSd first
      const gpsResp = await fetch('/api/current_gps_position');
      if (gpsResp.ok) {
        const gpsData = await gpsResp.json();
        await updateLocator(gpsData.Lat, gpsData.Lon, 'GPS device');
      } else {
        throw new Error('GPS device unavailable');
      }
    } catch (err) {
      statusDiv.textContent = 'GPS device not found, trying browser geolocation...';
      if (!navigator.geolocation) {
        statusDiv.textContent = 'Geolocation not supported';
        statusDiv.className = 'form-text text-danger mt-2';
        resetLocateBtn();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await updateLocator(pos.coords.latitude, pos.coords.longitude, 'browser', pos.coords.accuracy);
        },
        (geoErr) => {
          statusDiv.textContent = `Error: ${geoErr.message}`;
          statusDiv.className = 'form-text text-danger mt-2';
          resetLocateBtn();
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    async function updateLocator(lat, lon, source, accuracy) {
      try {
        const resp = await fetch('/api/coords_to_locator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lon })
        });
        const data = await resp.json();
        locatorField.value = data.locator;
        statusDiv.textContent = `Updated from ${source}${accuracy ? ` (accuracy: ${Math.round(accuracy)}m)` : ''}`;
        statusDiv.className = 'form-text text-success mt-2';
      } catch (e) {
        statusDiv.textContent = 'Failed to convert coordinates';
        statusDiv.className = 'form-text text-danger mt-2';
      } finally {
        resetLocateBtn();
      }
    }

    function resetLocateBtn() {
      locateBtn.disabled = false;
      icon.className = 'bi bi-geo-alt-fill';
    }
  });

  // Load Config
  const loadConfig = async () => {
    try {
      const resp = await fetch('/api/config');
      const config = await resp.json();
      originalConfig = JSON.parse(JSON.stringify(config));

      // Populate basic fields
      document.getElementById('mycall').value = config.mycall;
      document.getElementById('locator').value = config.locator;
      document.getElementById('auto_download_limit').value = config.auto_download_size_limit ?? -1;
      
      const pwdField = document.getElementById('secure_login_password');
      pwdField.value = config.secure_login_password ? '[REDACTED]' : '';
      pwdField.dataset.redacted = config.secure_login_password ? 'true' : 'false';

      pwdField.addEventListener('focus', () => {
        if (pwdField.dataset.redacted === 'true' && pwdField.value === '[REDACTED]') {
          pwdField.value = '';
        }
      });
      pwdField.addEventListener('blur', () => {
        if (pwdField.dataset.redacted === 'true' && pwdField.value === '') {
          pwdField.value = '[REDACTED]';
        }
      });

      document.getElementById('auxiliary_addresses').value = (config.auxiliary_addresses || []).join(', ');

      // Aliases
      const aliasContainer = document.getElementById('aliasesContainer');
      aliasContainer.innerHTML = '';
      Object.entries(config.connect_aliases || {}).forEach(([k, v]) => addAliasRow(k, v));
      if (Object.keys(config.connect_aliases || {}).length === 0) addAliasRow();

      // Transports
      const c = config;
      document.getElementById('ardop_addr').value = c.ardop.addr || '';
      document.getElementById('ardop_connect_requests').value = c.ardop.connect_requests || '';
      
      if (c.ardop.arq_bandwidth) {
          const bw = c.ardop.arq_bandwidth;
          document.getElementById('ardop_arq_bandwidth').value = `${bw.Max}${bw.Forced ? 'FORCED' : 'MAX'}`;
      }
      
      document.getElementById('ardop_cwid_enabled').checked = !!c.ardop.cwid_enabled;
      document.getElementById('ardop_ptt_ctrl').checked = !!c.ardop.ptt_ctrl;
      document.getElementById('ardop_beacon_interval').value = c.ardop.beacon_interval || 0;

      // VARA HF
      document.getElementById('vara_hf_addr').value = c.varahf.addr || '';
      document.getElementById('vara_hf_bandwidth').value = c.varahf.bandwidth || '500';

      // Listen methods
      const listen = c.listen || [];
      document.querySelectorAll('input[name="listen_methods[]"]').forEach(cb => {
        cb.checked = listen.includes(cb.value);
      });

      // Populate rig selects
      updateRigSelects(c.hamlib_rigs);
      document.getElementById('ardop_rig').value = c.ardop.rig || '';

    } catch (err) {
      showStatus('Failed to load configuration', true);
    }
  };

  const addAliasRow = (key = '', value = '') => {
    const container = document.getElementById('aliasesContainer');
    const div = document.createElement('div');
    div.className = 'alias-row mb-2';
    div.innerHTML = `
      <div class="row g-2">
        <div class="col-sm-4"><input type="text" class="form-control alias-key" placeholder="Name" value="${key}"></div>
        <div class="col-sm-7"><input type="text" class="form-control alias-value" placeholder="URL" value="${value}"></div>
        <div class="col-sm-1"><button type="button" class="btn btn-outline-danger w-100 delete-alias"><i class="bi bi-trash"></i></button></div>
      </div>
    `;
    container.appendChild(div);
    div.querySelector('.delete-alias').addEventListener('click', () => div.remove());
  };

  document.getElementById('addAlias').addEventListener('click', () => addAliasRow());

  const updateRigSelects = (rigs = {}) => {
    const selects = document.querySelectorAll('.rig-select');
    selects.forEach(s => {
      const current = s.value;
      s.innerHTML = '<option value="">None</option>';
      Object.keys(rigs).forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        s.appendChild(opt);
      });
      s.value = current;
    });
  };

  // Form submit
  configForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updated = JSON.parse(JSON.stringify(originalConfig));

    updated.mycall = document.getElementById('mycall').value.trim();
    updated.locator = document.getElementById('locator').value.trim();
    
    const pwd = document.getElementById('secure_login_password').value;
    if (pwd !== '[REDACTED]') {
        updated.secure_login_password = pwd;
    }

    updated.auto_download_size_limit = parseInt(document.getElementById('auto_download_limit').value) || -1;
    updated.auxiliary_addresses = document.getElementById('auxiliary_addresses').value.split(',').map(s => s.trim()).filter(s => s);

    // Aliases
    updated.connect_aliases = {};
    document.querySelectorAll('.alias-row').forEach(row => {
      const k = row.querySelector('.alias-key').value.trim();
      const v = row.querySelector('.alias-value').value.trim();
      if (k && v) updated.connect_aliases[k] = v;
    });

    // ARDOP
    const bwVal = document.getElementById('ardop_arq_bandwidth').value;
    const bwMatch = bwVal.match(/(\d+)(MAX|FORCED)/);
    updated.ardop = {
      ...updated.ardop,
      addr: document.getElementById('ardop_addr').value,
      connect_requests: parseInt(document.getElementById('ardop_connect_requests').value) || 0,
      arq_bandwidth: bwMatch ? { Max: parseInt(bwMatch[1]), Forced: bwMatch[2] === 'FORCED' } : {},
      cwid_enabled: document.getElementById('ardop_cwid_enabled').checked,
      ptt_ctrl: document.getElementById('ardop_ptt_ctrl').checked,
      beacon_interval: parseInt(document.getElementById('ardop_beacon_interval').value) || 0,
      rig: document.getElementById('ardop_rig').value
    };

    // Listen
    updated.listen = Array.from(document.querySelectorAll('input[name="listen_methods[]"]:checked')).map(cb => cb.value);

    try {
      const resp = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      
      if (resp.ok) {
        originalConfig = updated;
        showStatus('Configuration saved');
        restartModal.show();
      } else {
        const err = await resp.json();
        showStatus(`Save failed: ${err.error || resp.statusText}`, true);
      }
    } catch (err) {
      showStatus('Network error during save', true);
    }
  });

  // Restart
  document.getElementById('restartNow').addEventListener('click', async () => {
    const btn = document.getElementById('restartNow');
    const status = document.getElementById('restartStatus');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spin me-2"></i>Restarting...';
    
    try {
      await fetch('/api/reload', { method: 'POST' });
      status.style.display = 'block';
      status.innerHTML = '<div class="alert alert-info">Restart command sent. Reconnecting...</div>';
      
      // Poll for status
      let attempts = 0;
      const interval = setInterval(async () => {
        try {
          const sResp = await fetch('/api/status');
          if (sResp.ok) {
            clearInterval(interval);
            status.innerHTML = '<div class="alert alert-success">System online!</div>';
            btn.innerHTML = 'Restart Now';
            btn.disabled = false;
            setTimeout(() => window.location.reload(), 2000);
          }
        } catch (e) {
          attempts++;
          if (attempts > 30) {
            clearInterval(interval);
            status.innerHTML = '<div class="alert alert-danger">Restart timed out. Please check logs.</div>';
          }
        }
      }, 500);
    } catch (err) {
      status.innerHTML = '<div class="alert alert-danger">Failed to send restart command.</div>';
    }
  });

  loadConfig();
});
