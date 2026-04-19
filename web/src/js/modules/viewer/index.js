import { alert, isImageSuffix, formatFileSize, formXmlToFormName } from '../utils/index.js';
import * as bootstrap from 'bootstrap';

export class Viewer {
  constructor(composer) {
    this.composer = composer;
    this.modalEl = null;
    this.modalInstance = null;
    this.confirmDeleteModalEl = null;
    this.confirmDeleteModalInstance = null;
  }

  init() {
    this.modalEl = document.getElementById('message_view');
    if (!this.modalEl) return;
    this.modalInstance = new bootstrap.Modal(this.modalEl);

    this.confirmDeleteModalEl = document.getElementById('confirm_delete');
    if (this.confirmDeleteModalEl) {
      this.confirmDeleteModalInstance = new bootstrap.Modal(this.confirmDeleteModalEl);
    }

    this.subject = document.getElementById('subject');
    this.headers = document.getElementById('headers');
    this.body = document.getElementById('body');
    this.attachments = document.getElementById('attachments');
    
    this.replyBtn = document.getElementById('reply_btn');
    this.replyAllBtn = document.getElementById('reply_all_btn');
    this.forwardBtn = document.getElementById('forward_btn');
    this.editAsNewBtn = document.getElementById('edit_as_new_btn');
    this.deleteBtn = document.getElementById('delete_btn');
    this.archiveBtn = document.getElementById('archive_btn');
  }

  _buildMessagePath(folder, mid) {
    return '/api/mailbox/' + encodeURIComponent(folder) + '/' + encodeURIComponent(mid);
  }

  _setRead(box, mid) {
    fetch(this._buildMessagePath(box, mid) + '/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true })
    })
    .catch(err => console.error('Failed to set read status', err));
  }

  _deleteMessage(box, mid) {
    const okBtn = this.confirmDeleteModalEl.querySelector('.btn-ok');
    const handler = () => {
      this.modalInstance.hide();
      fetch(this._buildMessagePath(box, mid), { method: 'DELETE' })
        .then(async response => {
          this.confirmDeleteModalInstance.hide();
          if (response.ok) {
            alert('Message deleted');
          } else {
            alert('Failed to delete: ' + await response.text());
          }
        });
      okBtn.removeEventListener('click', handler);
    };
    okBtn.addEventListener('click', handler);
    this.confirmDeleteModalInstance.show();
  }

  _archiveMessage(box, mid) {
    fetch('/api/mailbox/archive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Pat-SourcePath': this._buildMessagePath(box, mid)
      }
    })
    .then(async response => {
      if (response.ok) {
        this.modalInstance.hide();
        alert('Message archived');
      } else {
        alert('Failed to archive: ' + await response.text());
      }
    });
  }

  displayMessage(currentFolder, mid) {
    const msg_url = this._buildMessagePath(currentFolder, mid);

    fetch(msg_url)
      .then(response => response.json())
      .then(data => {
        this.subject.textContent = data.Subject;
        this.headers.innerHTML = `
          Date: ${data.Date}<br>
          From: ${data.From.Addr}<br>
          To: ${data.To ? data.To.map(t => `<el>${t.Addr}</el>`).join(', ') : ''}
          ${data.P2POnly ? ' (<strong>P2P only</strong>)' : ''}
          ${data.Cc ? `<br>Cc: ${data.Cc.map(c => `<el>${c.Addr}</el>`).join(', ')}` : ''}
        `;

        this.body.innerHTML = data.BodyHTML;
        this.attachments.innerHTML = '';

        if (data.Files && data.Files.length > 0) {
          this.attachments.classList.remove('d-none');
          data.Files.forEach(file => {
            const formName = formXmlToFormName(file.Name);
            const renderToHtml = formName ? 'true' : 'false';
            const attachUrl = msg_url + '/' + file.Name + '?rendertohtml=' + renderToHtml;

            const col = document.createElement('div');
            col.className = 'col-6 col-md-3';
            
            const card = document.createElement('div');
            card.className = 'attachment-preview card h-100';

            if (isImageSuffix(file.Name)) {
              card.innerHTML = `
                <a target="_blank" href="${msg_url}/${file.Name}" class="text-decoration-none h-100">
                  <span class="filesize">${formatFileSize(file.Size)}</span>
                  <i class="bi bi-paperclip"></i>
                  <img src="${msg_url}/${file.Name}" alt="${file.Name}" class="img-fluid mt-2 rounded">
                </a>
              `;
            } else if (formName) {
              card.innerHTML = `
                <a target="_blank" href="${attachUrl}" class="btn btn-outline-primary btn-sm w-100 h-100 d-flex align-items-center justify-content-center">
                  <i class="bi bi-pencil-square me-1"></i> ${formName}
                </a>
              `;
            } else {
              card.innerHTML = `
                <a target="_blank" href="${msg_url}/${file.Name}" class="text-decoration-none h-100">
                  <span class="filesize">${formatFileSize(file.Size)}</span>
                  <i class="bi bi-paperclip"></i>
                  <br><span class="filename small text-truncate d-block mt-2">${file.Name}</span>
                </a>
              `;
            }
            col.appendChild(card);
            this.attachments.appendChild(col);
          });
        } else {
          this.attachments.classList.add('d-none');
        }

        const cloneAndReplace = (btn) => {
          const newBtn = btn.cloneNode(true);
          btn.parentNode.replaceChild(newBtn, btn);
          return newBtn;
        };

        this.replyBtn = cloneAndReplace(this.replyBtn);
        this.replyBtn.addEventListener('click', () => this.composer.reply(currentFolder, data, false));

        this.replyAllBtn = cloneAndReplace(this.replyAllBtn);
        this.replyAllBtn.addEventListener('click', () => this.composer.reply(currentFolder, data, true));

        this.forwardBtn = cloneAndReplace(this.forwardBtn);
        this.forwardBtn.addEventListener('click', () => this.composer.forward(currentFolder, data));

        this.editAsNewBtn = cloneAndReplace(this.editAsNewBtn);
        this.editAsNewBtn.addEventListener('click', () => this.composer.editAsNew(currentFolder, data));

        this.deleteBtn = cloneAndReplace(this.deleteBtn);
        this.deleteBtn.addEventListener('click', () => this._deleteMessage(currentFolder, mid));

        this.archiveBtn = cloneAndReplace(this.archiveBtn);
        this.archiveBtn.addEventListener('click', () => this._archiveMessage(currentFolder, mid));

        if (currentFolder === 'archive') {
          this.archiveBtn.closest('li').classList.add('d-none');
        } else {
          this.archiveBtn.closest('li').classList.remove('d-none');
        }

        this.modalInstance.show();
        if (!data.Read) {
          setTimeout(() => this._setRead(currentFolder, data.MID), 2000);
        }
      });
  }
}
