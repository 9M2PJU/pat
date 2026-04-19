import { PredictionPopover } from './prediction-popover';
import { PredictionModal } from './prediction-modal';
import * as bootstrap from 'bootstrap';

class RmslistView {
  constructor() {
    this.predictionPopover = new PredictionPopover();
    this.predictionModal = new PredictionModal();
    this.rmslistData = [];
    this.filteredData = [];
    this.itemsShown = 0;
    this.itemsPerLoad = 100;
    this.hideLinkQuality = true;
    this.onRowClick = null;
    this.collapse = null;
  }

  init() {
    const targetFilterInput = document.getElementById('targetFilterInput');
    if (targetFilterInput) {
      targetFilterInput.addEventListener('input', () => this.filterRmslist());
    }

    const loadmoreBtn = document.getElementById('loadmore-btn');
    if (loadmoreBtn) {
      loadmoreBtn.addEventListener('click', () => this.loadMoreItems());
    }

    const updateRmslistButton = document.getElementById('updateRmslistButton');
    if (updateRmslistButton) {
      updateRmslistButton.addEventListener('click', (e) => {
        e.target.disabled = true;
        this.updateRmslist(true);
      });
    }

    const modeSearchSelect = document.getElementById('modeSearchSelect');
    if (modeSearchSelect) {
      modeSearchSelect.addEventListener('change', () => this.updateRmslist());
    }

    const bandSearchSelect = document.getElementById('bandSearchSelect');
    if (bandSearchSelect) {
      bandSearchSelect.addEventListener('change', () => this.updateRmslist());
    }

    const rmslistContainer = document.getElementById('rmslist-container');
    if (rmslistContainer) {
      this.collapse = new bootstrap.Collapse(rmslistContainer, { toggle: false });
      rmslistContainer.addEventListener('shown.bs.collapse', () => {
        this.updateRmslist();
      });
      rmslistContainer.addEventListener('hidden.bs.collapse', () => {
        this.reset();
      });
    }
  }

  reset() {
    if (this.collapse) this.collapse.hide();
    this.rmslistData = [];
    this.filteredData = [];
    this.itemsShown = 0;
    const tbody = document.querySelector('#rmslist tbody');
    if (tbody) tbody.innerHTML = '';
    const loadmore = document.getElementById('rmslist-loadmore');
    if (loadmore) loadmore.style.display = 'none';
    this.predictionModal.remove();
    this.predictionPopover.destroyAll();
  }

  onTransportChange(transport) {
    const modeSearchSelect = document.getElementById('modeSearchSelect');
    if (!modeSearchSelect) return;

    switch (transport) {
      case 'ardop':
      case 'pactor':
      case 'varafm':
      case 'varahf':
        modeSearchSelect.value = transport;
        break;
      case 'ax25':
      case 'ax25+linux':
      case 'ax25+agwpe':
      case 'ax25+serial-tnc':
        modeSearchSelect.value = 'packet';
        break;
      default:
        return;
    }

    // Refresh the RMS list with the new filter
    this.updateRmslist();
  }

  updateRmslist(forceDownload) {
    const tbody = document.querySelector('#rmslist tbody');
    const spinner = document.getElementById('rmslistSpinner');
    const loadmore = document.getElementById('rmslist-loadmore');
    const updateBtn = document.getElementById('updateRmslistButton');

    this.predictionModal.remove();
    this.predictionPopover.destroyAll();

    const mode = document.getElementById('modeSearchSelect').value;
    const band = document.getElementById('bandSearchSelect').value;
    const params = new URLSearchParams({
      mode: mode,
      band: band,
      'force-download': forceDownload === true,
    });

    if (tbody) tbody.innerHTML = '';
    if (spinner) spinner.style.display = 'block';
    if (loadmore) loadmore.style.display = 'none';

    fetch(`/api/rmslist?${params}`)
      .then(response => response.json())
      .then(data => {
        this.rmslistData = data;
        this.itemsShown = 0;
        this.filterRmslist();
      })
      .finally(() => {
        if (spinner) spinner.style.display = 'none';
        if (updateBtn) updateBtn.disabled = false;
      });
  }

  filterRmslist() {
    const filterInput = document.getElementById('targetFilterInput');
    const filterText = filterInput ? filterInput.value.toLowerCase() : '';
    this.filteredData = this.rmslistData.filter(rms =>
      rms.callsign.toLowerCase().startsWith(filterText)
    );
    this.itemsShown = Math.min(this.itemsPerLoad, this.filteredData.length);
    this.hideLinkQuality = this.filteredData.every(rms => rms.prediction == null);

    const initialData = this.filteredData.slice(0, this.itemsShown);
    this.renderRmslist(initialData, this.hideLinkQuality);
    this.updateLoadMoreControls();
  }

  loadMoreItems() {
    const currentItems = this.itemsShown;
    this.itemsShown = Math.min(this.itemsShown + this.itemsPerLoad, this.filteredData.length);
    const newItems = this.filteredData.slice(currentItems, this.itemsShown);
    this.appendToRmslist(newItems);
    this.updateLoadMoreControls();
  }

  updateLoadMoreControls() {
    const showingCount = document.getElementById('showing-count');
    const totalResults = document.getElementById('total-results');
    const loadmoreBtn = document.getElementById('loadmore-btn');
    const loadmoreContainer = document.getElementById('rmslist-loadmore');

    if (showingCount) showingCount.textContent = this.itemsShown;
    if (totalResults) totalResults.textContent = this.filteredData.length;

    const hasMore = this.itemsShown < this.filteredData.length;
    if (loadmoreBtn) loadmoreBtn.style.display = hasMore ? 'block' : 'none';
    if (loadmoreContainer) loadmoreContainer.style.display = this.filteredData.length > 0 ? 'block' : 'none';
  }

  appendToRmslist(data) {
    this.renderRmslistRows(data, this.hideLinkQuality);
  }

  renderRmslist(data, hideLinkQuality) {
    const tbody = document.querySelector('#rmslist tbody');
    if (tbody) tbody.innerHTML = '';
    
    document.querySelectorAll('.link-quality-column').forEach(el => {
        el.style.display = hideLinkQuality ? 'none' : '';
    });
    
    this.renderRmslistRows(data, hideLinkQuality);
  }

  renderRmslistRows(data, hideLinkQuality) {
    const tbody = document.querySelector('#rmslist tbody');
    if (!tbody) return;

    data.forEach((rms) => {
      const tr = document.createElement('tr');
      
      const callsignTd = document.createElement('td');
      callsignTd.className = 'text-left';
      callsignTd.textContent = rms.callsign;
      tr.appendChild(callsignTd);

      const distanceTd = document.createElement('td');
      distanceTd.className = 'text-left';
      distanceTd.textContent = rms.distance.toFixed(0) + ' km';
      tr.appendChild(distanceTd);

      const modesTd = document.createElement('td');
      modesTd.className = 'text-left';
      modesTd.textContent = rms.modes;
      tr.appendChild(modesTd);

      const dialTd = document.createElement('td');
      dialTd.className = 'text-right';
      dialTd.textContent = rms.dial.desc;
      tr.appendChild(dialTd);

      const linkQualityCell = document.createElement('td');
      linkQualityCell.className = 'text-right link-quality-cell';
      if (hideLinkQuality) {
        linkQualityCell.style.display = 'none';
      } else {
        const linkQualityText = rms.prediction == null ? 'N/A' : rms.prediction.link_quality + '%';
        const span = document.createElement('span');
        span.textContent = linkQualityText;
        
        if (rms.prediction) {
          span.style.cursor = 'pointer';
          span.style.borderBottom = '1px dotted #0d6efd'; // BS5 primary color
          
          if (rms.prediction.output_values) {
            this.predictionPopover.attach(span, rms.prediction.output_values);
          }
          if (rms.prediction.output_raw) {
            span.addEventListener('click', (e) => {
              e.stopPropagation();
              e.preventDefault();
              this.predictionPopover.hide(span);
              this.predictionModal.show(rms.callsign, rms.prediction.output_raw);
              return false;
            });
          }
        }
        linkQualityCell.appendChild(span);
      }
      tr.appendChild(linkQualityCell);

      tr.addEventListener('click', (e) => {
        const active = tbody.querySelector('.active');
        if (active) active.classList.remove('active');
        tr.classList.add('active');
        if (this.onRowClick) {
          this.onRowClick(rms.url);
        }
      });
      tbody.appendChild(tr);
    });
  }
}

export { RmslistView };
