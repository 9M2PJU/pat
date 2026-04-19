import * as bootstrap from 'bootstrap';

class PredictionModal {
  constructor() {
    this.modalId = 'rawDataModal';
    this.modalInstance = null;
  }

  show(callsign, rawOutput) {
    if (!rawOutput) {
      return;
    }

    this.remove();

    const modalHtml = `
      <div class="modal fade" id="${this.modalId}" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Propagation Prediction Details: ${callsign}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div style="overflow: auto;">
                <pre style="white-space: pre; width: auto; margin-bottom: 0;">${rawOutput}</pre>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById(this.modalId);
    this.modalInstance = new bootstrap.Modal(modalEl);
    this.modalInstance.show();

    modalEl.addEventListener('hidden.bs.modal', () => {
        this.remove();
    });
  }

  remove() {
    const existing = document.getElementById(this.modalId);
    if (existing) {
        if (this.modalInstance) {
            this.modalInstance.dispose();
            this.modalInstance = null;
        }
        existing.remove();
    }
  }
}

export { PredictionModal };
