export function alert(msg) {
  const container = document.getElementById('navbar_status');
  if (!container) return;

  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-info alert-dismissible fade show py-2 px-3 mb-0 rounded-0 small d-flex align-items-center shadow-sm';
  alertDiv.role = 'alert';
  alertDiv.innerHTML = `
    <i class="bi bi-info-circle-fill me-2"></i>
    <span>${msg}</span>
    <button type="button" class="btn-close py-2" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  container.innerHTML = '';
  container.appendChild(alertDiv);
  container.style.display = 'block';

  // Auto-dismiss after 8 seconds
  setTimeout(() => {
    if (alertDiv.parentNode) {
      const bsAlert = new bootstrap.Alert(alertDiv);
      bsAlert.close();
    }
  }, 8000);
}

export function isInsecureOrigin() {
  if (Object.prototype.hasOwnProperty.call(window, 'isSecureContext')) {
    return !window.isSecureContext;
  }
  if (window.location.protocol === 'https:') {
    return false;
  }
  if (window.location.protocol === 'file:') {
    return false;
  }
  if (window.location.hostname === 'localhost' || window.location.hostname.startsWith('127.')) {
    return false;
  }
  return true;
}

export function dateFormat(previous) {
  const current = new Date();
  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;
  const msPerMonth = msPerDay * 30;
  const msPerYear = msPerDay * 365;
  const elapsed = current - previous;

  if (elapsed < msPerDay) {
    return (
      (previous.getHours() < 10 ? '0' : '') +
      previous.getHours() +
      ':' +
      (previous.getMinutes() < 10 ? '0' : '') +
      previous.getMinutes()
    );
  } else if (elapsed < msPerMonth) {
    return 'approximately ' + Math.round(elapsed / msPerDay) + ' days ago';
  } else if (elapsed < msPerYear) {
    return 'approximately ' + Math.round(elapsed / msPerMonth) + ' months ago';
  } else {
    return 'approximately ' + Math.round(elapsed / msPerYear) + ' years ago';
  }
}

export function htmlEscape(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function isImageSuffix(name) {
  return name.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/);
}

export function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  } else if (bytes >= 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }
  return bytes + ' B';
}

export function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  const expires = 'expires=' + d.toUTCString();
  document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
}

export function deleteCookie(cname) {
  document.cookie = cname + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

export function formXmlToFormName(fileName) {
  let match = fileName.match(/^RMS_Express_Form_([\w \.]+)-\d+\.xml$/i);
  if (match) {
    return match[1];
  }

  match = fileName.match(/^RMS_Express_Form_([\w \.]+)\.xml$/i);
  if (match) {
    return match[1];
  }

  return null;
}
