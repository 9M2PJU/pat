import * as bootstrap from 'bootstrap';

export class FormCatalog {
  constructor(composer) {
    this.composer = composer;
    this.formsCatalog = null;
  }

  init() {
    document.getElementById('updateFormsButton')?.addEventListener('click', () => this.update());
    
    fetch('/api/formcatalog')
      .then(res => res.json())
      .then(data => {
        this._initFormSelect(data);
        
        document.getElementById('formSearchInput')?.addEventListener('input', (e) => {
          this._filterForms(e.target.value.toLowerCase());
        });

        document.getElementById('clearSearchButton')?.addEventListener('click', () => {
          const input = document.getElementById('formSearchInput');
          if (input) input.value = '';
          this._filterForms('');
        });
      })
      .catch(() => this._initFormSelect(null));
  }

  update() {
    const responseEl = document.getElementById('updateFormsResponse');
    const errorEl = document.getElementById('updateFormsError');
    if (responseEl) responseEl.textContent = '';
    if (errorEl) errorEl.textContent = '';

    const btn = document.getElementById('updateFormsButton');
    const spinner = document.getElementById('updateFormsSpinner');
    
    if (btn) btn.disabled = true;
    if (spinner) {
      spinner.classList.remove('d-none');
      spinner.classList.add('icon-spin');
    }

    fetch('/api/formsUpdate', { method: 'POST' })
      .then(async res => {
        const msg = await res.text();
        if (res.ok) {
          if (errorEl) errorEl.textContent = '';
          let response = JSON.parse(msg);
          switch (response.action) {
            case 'none':
              if (responseEl) responseEl.textContent = 'You already have the latest forms version';
              break;
            case 'update':
              if (responseEl) responseEl.textContent = 'Updated forms to ' + response.newestVersion;
              this.init();
              break;
          }
        } else {
          if (responseEl) responseEl.textContent = '';
          if (errorEl) errorEl.textContent = msg;
        }
      })
      .catch(err => {
        if (responseEl) responseEl.textContent = '';
        if (errorEl) errorEl.textContent = err.message;
      })
      .finally(() => {
        if (btn) btn.disabled = false;
        if (spinner) {
          spinner.classList.add('d-none');
          spinner.classList.remove('icon-spin');
        }
      });
  }

  _filterForms(searchTerm) {
    let visibleCount = 0;
    const formItems = document.querySelectorAll('.form-item');

    formItems.forEach(item => {
      const templatePath = item.dataset.templatePath || '';
      const isMatch = templatePath.toLowerCase().includes(searchTerm);
      item.style.display = isMatch ? '' : 'none';
      if (isMatch) visibleCount++;
    });

    document.querySelectorAll('.folder-container').forEach(folder => {
      const hasVisibleForms = Array.from(folder.querySelectorAll('.form-item'))
        .some(item => item.style.display !== 'none');
      folder.style.display = hasVisibleForms ? '' : 'none';
    });

    // Auto-expand/collapse
    document.querySelectorAll('.folder-toggle').forEach(toggle => {
      const targetId = toggle.getAttribute('data-bs-target').replace('#', '');
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;
      
      const collapseInstance = bootstrap.Collapse.getOrCreateInstance(targetEl, { toggle: false });
      
      if (visibleCount < 20 && searchTerm !== '') {
        collapseInstance.show();
      } else if (searchTerm === '') {
        collapseInstance.hide();
      }
    });
  }

  _initFormSelect(data) {
    this.formsCatalog = data;
    const versionEl = document.getElementById('formsVersion');
    const updateVersionEl = document.getElementById('updateFormsVersion');
    const rootNameEl = document.getElementById('formsRootFolderName');
    const folderRootEl = document.getElementById('formFolderRoot');

    if (data && data.path && ((data.folders && data.folders.length > 0) || (data.forms && data.forms.length > 0))) {
      if (versionEl) {
        versionEl.innerHTML = `<span>(ver <a href="http://www.winlink.org/content/all_standard_templates_folders_one_zip_self_extracting_winlink_express_ver_12142016" target="_blank">${data.version}</a>)</span>`;
      }
      if (updateVersionEl) updateVersionEl.textContent = data.version;
      if (rootNameEl) rootNameEl.textContent = data.path;
      if (folderRootEl) {
        folderRootEl.innerHTML = '';
        this._appendFormFolder(folderRootEl, data);
      }
    } else {
      if (rootNameEl) rootNameEl.textContent = 'missing form templates';
      if (folderRootEl) {
        folderRootEl.innerHTML = `
          <h6>Form templates not downloaded</h6>
          <p>Use Action → Update Form Templates to download now</p>
        `;
      }
    }
  }

  _appendFormFolder(container, data, level = 0) {
    if (!data.folders && !data.forms) return;

    if (data.folders && data.folders.length > 0) {
      data.folders.forEach((folder) => {
        if (folder.form_count > 0) {
          const folderContentId = `folder-content-${Math.random().toString(36).substr(2, 9)}`;
          const folderDiv = document.createElement('div');
          folderDiv.className = `folder-container ${level > 0 ? 'ps-3 mt-2' : ''}`;
          
          folderDiv.innerHTML = `
            <button class="btn btn-outline-secondary btn-sm folder-toggle mb-2 collapsed" 
                    data-bs-toggle="collapse" 
                    data-bs-target="#${folderContentId}">
              <i class="bi bi-folder me-1"></i> ${folder.name}
            </button>
            <div id="${folderContentId}" class="collapse">
              <div class="folder-content border-start ms-2 ps-2"></div>
            </div>
          `;

          container.appendChild(folderDiv);
          this._appendFormFolder(folderDiv.querySelector('.folder-content'), folder, level + 1);
        }
      });
    }

    if (data.forms && data.forms.length > 0) {
      const formsContainer = document.createElement('div');
      formsContainer.className = 'forms-container d-grid gap-1 mt-1';
      data.forms.forEach((form) => {
        const formDiv = document.createElement('div');
        formDiv.className = 'form-item';
        formDiv.dataset.templatePath = form.template_path;
        
        const btn = document.createElement('button');
        btn.className = 'btn btn-light btn-sm text-start w-100 border-0';
        btn.innerHTML = `<i class="bi bi-file-earmark-text me-1 text-muted"></i> ${form.name}`;
        btn.addEventListener('click', () => {
          const composerEl = document.getElementById('composer');
          const inReplyTo = composerEl ? composerEl.dataset.inReplyTo : null;
          const replyParam = inReplyTo ? '&in-reply-to=' + encodeURIComponent(inReplyTo) : '';
          const path = encodeURIComponent(form.template_path);
          this._onFormLaunching(`/api/forms?template=${path}${replyParam}`);
        });

        formDiv.appendChild(btn);
        formsContainer.appendChild(formDiv);
      });
      container.appendChild(formsContainer);
    }
  }

  _onFormLaunching(target) {
    const modalEl = document.getElementById('selectForm');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
    this.composer.startPolling();
    window.open(target);
  }
}
