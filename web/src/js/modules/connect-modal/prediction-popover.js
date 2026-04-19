import * as bootstrap from 'bootstrap';

class PredictionPopover {
  constructor() {
    this.activePopovers = new Map();
  }

  attach(element, outputValues, title = 'Prediction Details') {
    if (!element || !outputValues) {
      return element;
    }

    let popoverContent = '';
    Object.entries(outputValues).forEach(([key, value]) => {
      popoverContent += `${key}: ${value}\n`;
    });

    if (popoverContent) {
      const popover = new bootstrap.Popover(element, {
        container: 'body',
        html: true,
        trigger: 'hover',
        placement: 'left',
        title: title,
        content: '<pre style="text-align: left; margin: 0; background: transparent; border: 0; padding: 0;">' + popoverContent.trim() + '</pre>',
        sanitize: false
      });

      this.activePopovers.set(element, popover);
    }

    return element;
  }

  hide(element) {
    const popover = this.activePopovers.get(element);
    if (popover) {
      popover.hide();
    }
  }

  destroyAll() {
    this.activePopovers.forEach((popover) => {
      popover.dispose();
    });
    this.activePopovers.clear();
  }
}

export { PredictionPopover };
