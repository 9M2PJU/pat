import { htmlEscape } from '../utils/index.js';

export class Mailbox {
  constructor(onMessageClick) {
    this.onMessageClick = onMessageClick;
    this.currentFolder = 'in';
    this.folderEl = null;
    this.tableEl = null;
    this.tbodyEl = null;
  }

  init() {
    this.folderEl = document.getElementById('folder');
    if (!this.folderEl) return;
    this.tableEl = this.folderEl.querySelector('table');

    // Adapted from https://stackoverflow.com/a/49041392
    this.tableEl.addEventListener('click', (event) => {
      const clickedTh = event.target.closest('th');
      if (!clickedTh) return;

      const tbody = this.tableEl.querySelector('tbody');
      if (!tbody) return;

      const rows = Array.from(tbody.querySelectorAll('tr'));
      const index = Array.from(clickedTh.parentNode.children).indexOf(clickedTh);
      
      clickedTh.asc = !clickedTh.asc;
      
      rows.sort(this._comparer(index, clickedTh.asc))
          .forEach((tr) => tbody.appendChild(tr));

      const previousTh = this.tableEl.querySelector('th.sorted');
      if (previousTh && previousTh !== clickedTh) {
        previousTh.classList.remove('sorted');
      }
      clickedTh.classList.add('sorted');
    });
  }

  displayFolder(dir) {
    this.currentFolder = dir;
    const is_from = dir === 'in' || dir === 'archive';

    if (!this.tableEl) return;
    this.tableEl.innerHTML = '';
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th></th>
        <th>Subject</th>
        <th>${is_from ? 'From' : 'To'}</th>
        ${is_from ? '' : '<th>P2P</th>'}
        <th>Date</th>
        <th>Message ID</th>
      </tr>
    `;
    this.tableEl.appendChild(thead);

    this.tbodyEl = document.createElement('tbody');
    this.tableEl.appendChild(this.tbodyEl);

    fetch(`/api/mailbox/${dir}`)
      .then(response => response.json())
      .then((data) => {
        data.forEach((msg) => {
          let to_from_html = '';
          if (!is_from && msg.To) {
            if (msg.To.length === 1) {
              to_from_html = msg.To[0].Addr;
            } else if (msg.To.length > 1) {
              to_from_html = `${msg.To[0].Addr}...`;
            }
          } else if (is_from) {
            to_from_html = msg.From.Addr;
          }

          const p2p_html = is_from
            ? ''
            : `<td>${msg.P2POnly ? '<i class="bi bi-check-lg"></i>' : ''}</td>`;

          const tr = document.createElement('tr');
          tr.id = msg.MID;
          if (msg.Unread) tr.classList.add('fw-bold');
          
          tr.innerHTML = `
            <td>${msg.Files.length > 0 ? '<i class="bi bi-paperclip"></i>' : ''}</td>
            <td>${htmlEscape(msg.Subject)}</td>
            <td>${to_from_html}</td>
            ${p2p_html}
            <td>${msg.Date}</td>
            <td>${msg.MID}</td>
          `;

          tr.addEventListener('click', (evt) => {
            const activeTr = this.tbodyEl.querySelector('tr.table-active');
            if (activeTr) activeTr.classList.remove('table-active');
            tr.classList.add('table-active');

            this.onMessageClick(this.currentFolder, tr.id);
          });

          this.tbodyEl.appendChild(tr);
        });
      })
      .catch(err => console.error('Failed to load mailbox', err));
  }

  _getCellValue(tr, idx) {
    return tr.children[idx].innerText || tr.children[idx].textContent;
  }

  _comparer(idx, asc) {
    return (a, b) =>
      ((v1, v2) =>
        v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2)
          ? v1 - v2
          : v1.toString().localeCompare(v2))(
            this._getCellValue(asc ? a : b, idx),
            this._getCellValue(asc ? b : a, idx)
          );
  }
}
