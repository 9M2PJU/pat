import { alert, isImageSuffix, formatFileSize, formXmlToFormName, setCookie, deleteCookie } from '../utils/index.js';
import * as bootstrap from 'bootstrap';

export class Composer {
  constructor(mycall) {
    this.mycall = mycall;
    this.pollTimer = null;
    this.ws = null;
    this.modalEl = null;
    this.modalInstance = null;
  }

  init() {
    this.modalEl = document.getElementById('composer');
    if (!this.modalEl) return;
    this.modalInstance = new bootstrap.Modal(this.modalEl);

    document.getElementById('compose_btn')?.addEventListener('click', () => {
      this.close(true);
      this.modalInstance.show();
    });

    this.modalEl.querySelector('.btn-file :first-child')?.addEventListener('change', this._handleFileSelection.bind(this));
    this.modalEl.addEventListener('hidden.bs.modal', this._forgetPolling.bind(this));

    const errorEl = document.getElementById('composer_error');
    if (errorEl) errorEl.classList.add('d-none');

    document.getElementById('composer_form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      const formData = new FormData(form);

      const d = new Date().toJSON();
      formData.append('date', d);

      const inReplyTo = this.modalEl.dataset.inReplyTo;
      if (inReplyTo) {
        formData.append('in_reply_to', inReplyTo);
      }

      const bodyEl = document.getElementById('msg_body');
      const subjectEl = document.getElementById('msg_subject');

      if (bodyEl.value.length === 0) bodyEl.value = '<No message body>';
      if (subjectEl.value.length === 0) subjectEl.value = '<No subject>';

      fetch('/api/mailbox/out', {
        method: 'POST',
        body: formData
      })
      .then(async response => {
        const text = await response.text();
        if (response.ok) {
          const attachmentsInput = document.getElementById('msg_attachments_input');
          if (attachmentsInput) attachmentsInput.dataset.storedFiles = '[]';
          this.modalInstance.hide();
          this.close(true);
          alert(text);
        } else {
          if (errorEl) {
            errorEl.textContent = text;
            errorEl.classList.remove('d-none');
          }
        }
      })
      .catch(err => {
        console.error('Submit failed', err);
        if (errorEl) {
          errorEl.textContent = 'Submission failed. See console.';
          errorEl.classList.remove('d-none');
        }
      });
    });
  }

  startPolling() {
    setCookie('forminstance', Math.floor(Math.random() * 1000000000), 1);
    this._connectWebSocket();
  }

  _forgetPolling() {
    window.clearTimeout(this.pollTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    deleteCookie('forminstance');
  }

  _connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = protocol + '//' + window.location.host + '/ws/form';
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (!this.modalEl.classList.contains('d-none')) {
        this._writeToComposer(data);
      }
      this.ws.close();
    };
    
    this.ws.onerror = () => {
      if (!this.modalEl.classList.contains('d-none')) {
        this.pollTimer = window.setTimeout(this._connectWebSocket.bind(this), 1000);
      }
    };
  }

  _writeToComposer(data) {
    document.getElementById('msg_body').value = data.msg_body || '';
    if (data.msg_to) document.getElementById('msg_to').value = data.msg_to;
    if (data.msg_cc) document.getElementById('msg_cc').value = data.msg_cc;
    if (data.msg_subject) document.getElementById('msg_subject').value = data.msg_subject;
  }

  close(clear) {
    if (clear) {
      const errorEl = document.getElementById('composer_error');
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.add('d-none');
      }
      document.getElementById('msg_body').value = '';
      document.getElementById('msg_subject').value = '';
      document.getElementById('msg_to').value = '';
      document.getElementById('msg_cc').value = '';
      document.getElementById('composer_form').reset();
      delete this.modalEl.dataset.inReplyTo;

      document.getElementById('composer_attachments').innerHTML = '';

      const attachmentsInput = document.getElementById('msg_attachments_input');
      if (attachmentsInput) attachmentsInput.dataset.storedFiles = '[]';
    }
    this.modalInstance.hide();
  }

  _handleFileSelection(e) {
    const fileInput = e.target;
    const dt = new DataTransfer();
    let storedFiles = [];
    let filesProcessed = 0;
    const totalFiles = fileInput.files.length;

    try {
      storedFiles = JSON.parse(fileInput.dataset.storedFiles || '[]');
      storedFiles.forEach(fileInfo => {
        const byteString = atob(fileInfo.content.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        const blob = new Blob([ab], { type: fileInfo.type });
        const file = new File([blob], fileInfo.name, { type: fileInfo.type });
        dt.items.add(file);
      });
    } catch (e) { console.error("Error parsing stored files:", e); }

    if (totalFiles === 0) return;

    Array.from(fileInput.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (re) => {
        storedFiles.push({
          name: file.name,
          type: file.type,
          content: re.target.result
        });
        fileInput.dataset.storedFiles = JSON.stringify(storedFiles);
        dt.items.add(file);
        filesProcessed++;
        if (filesProcessed === totalFiles) {
          fileInput.files = dt.files;
          this._previewAttachmentFiles(fileInput);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  _previewAttachmentFiles(fileInput) {
    const attachmentsContainer = document.getElementById('composer_attachments');
    attachmentsContainer.innerHTML = '';

    Array.from(fileInput.files).forEach((file, index) => {
      const col = document.createElement('div');
      col.className = 'col-6 col-md-3';
      
      const card = document.createElement('div');
      card.className = 'attachment-preview card h-100';
      
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn-close';
      removeBtn.ariaLabel = 'Remove';
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const dt = new DataTransfer();
        const files = Array.from(fileInput.files);
        files.splice(index, 1);
        files.forEach(f => dt.items.add(f));
        fileInput.files = dt.files;

        let stored = JSON.parse(fileInput.dataset.storedFiles || '[]');
        stored.splice(index, 1);
        fileInput.dataset.storedFiles = JSON.stringify(stored);

        this._previewAttachmentFiles(fileInput);
      });

      card.appendChild(removeBtn);
      
      const sizeSpan = document.createElement('span');
      sizeSpan.className = 'filesize';
      sizeSpan.textContent = formatFileSize(file.size);
      card.appendChild(sizeSpan);

      if (isImageSuffix(file.name)) {
        const img = document.createElement('img');
        img.className = 'img-fluid mt-2 rounded';
        const reader = new FileReader();
        reader.onload = (re) => { img.src = re.target.result; };
        reader.readAsDataURL(file);
        card.appendChild(img);
      } else {
        const nameSpan = document.createElement('span');
        nameSpan.className = 'filename mt-2 d-block small text-truncate';
        nameSpan.textContent = file.name;
        card.appendChild(nameSpan);
      }

      col.appendChild(card);
      attachmentsContainer.appendChild(col);
    });
  }

  _reAttachFiles(msg_url, files) {
    const fileInput = document.getElementById('msg_attachments_input');
    const dt = new DataTransfer();
    if (!files) return;

    let filesProcessed = 0;
    files.forEach(file => {
      fetch(msg_url + '/' + file.Name)
        .then(res => res.blob())
        .then(blob => {
          const f = new File([blob], file.Name, { type: blob.type });
          dt.items.add(f);
          filesProcessed++;
          if (filesProcessed === files.length) {
            fileInput.files = dt.files;
            this._previewAttachmentFiles(fileInput);
          }
        });
    });
  }

  reply(folder, data, replyAll) {
    this.close(true);
    document.getElementById('msg_to').value = data.From.Addr;
    document.getElementById('msg_cc').value = (replyAll ? this._replyCarbonCopyList(data) : []).join(', ');
    
    let subject = data.Subject;
    if (subject.lastIndexOf('Re:', 0) !== 0) subject = 'Re: ' + subject;
    document.getElementById('msg_subject').value = subject;
    
    const body = document.getElementById('msg_body');
    body.value = '\n\n' + this._quoteMsg(data);
    this.modalEl.dataset.inReplyTo = folder + '/' + data.MID;
    this.modalInstance.show();
    
    body.focus();
    body.setSelectionRange(0, 0);

    this._showReplyForm(folder, data.MID, data);
  }

  forward(folder, data) {
    this.close(true);
    document.getElementById('msg_to').value = '';
    document.getElementById('msg_subject').value = 'Fw: ' + data.Subject;
    const body = document.getElementById('msg_body');
    body.value = this._quoteMsg(data);
    body.setSelectionRange(0, 0);

    this._reAttachFiles(this._buildMessagePath(folder, data.MID), data.Files);
    this.modalInstance.show();
  }

  editAsNew(folder, data) {
    this.close(true);
    document.getElementById('msg_to').value = data.To.map(r => r.Addr).join(', ');
    document.getElementById('msg_cc').value = (data.Cc || []).map(r => r.Addr).join(', ');
    document.getElementById('msg_subject').value = data.Subject;
    document.getElementById('msg_body').value = data.Body;
    document.getElementById('msg_body').setSelectionRange(0, 0);

    this._reAttachFiles(this._buildMessagePath(folder, data.MID), data.Files);
    this.modalInstance.show();
  }

  _quoteMsg(data) {
    let output = `--- ${data.Date} ${data.From.Addr} wrote: ---\n`;
    output += data.Body.split('\n').map(line => '>' + line).join('\n');
    return output;
  }

  _replyCarbonCopyList(msg) {
    let addrs = [...msg.To];
    if (msg.Cc) addrs = [...addrs, ...msg.Cc];
    const seen = { [this.mycall]: true, [msg.From.Addr]: true };
    return addrs.filter(a => !seen[a.Addr] && (seen[a.Addr] = true)).map(a => a.Addr);
  }

  _showReplyForm(folder, mid, msg) {
    const orgMsgUrl = this._buildMessagePath(folder, mid);
    for (let i = 0; msg.Files && i < msg.Files.length; i++) {
      const file = msg.Files[i];
      const formName = formXmlToFormName(file.Name);
      if (!formName) continue;

      fetch(orgMsgUrl + '/' + file.Name + '?rendertohtml=false')
        .then(res => res.text())
        .then(data => {
          let xmlDoc = new DOMParser().parseFromString(data, 'text/xml');
          if (xmlDoc) {
            let replyTmpl = xmlDoc.evaluate('/RMS_Express_Form/form_parameters/reply_template', xmlDoc, null, XPathResult.STRING_TYPE, null);
            if (replyTmpl && replyTmpl.stringValue) {
              window.setTimeout(() => this.startPolling(), 500);
              window.open(orgMsgUrl + '/' + file.Name + '?rendertohtml=true&in-reply-to=' + encodeURIComponent(folder + '/' + mid));
            }
          }
        });
      return;
    }
  }

  _buildMessagePath(folder, mid) {
    return '/api/mailbox/' + encodeURIComponent(folder) + '/' + encodeURIComponent(mid);
  }
}
