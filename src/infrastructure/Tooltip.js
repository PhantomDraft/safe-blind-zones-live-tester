export class Tooltip {
  constructor(element) {
    this.element = element;
    this.arrow = element.querySelector('.sbz-tooltip__arrow');
    this.content = element.querySelector('.sbz-tooltip__content');
    this.visible = false;
    this.boundMouseOver = this.handleMouseOver.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseOut = this.handleMouseOut.bind(this);
  }

  bind(target = document) {
    this.target = target;
    target.addEventListener('mouseover', this.boundMouseOver);
    target.addEventListener('mousemove', this.boundMouseMove);
    target.addEventListener('mouseout', this.boundMouseOut);
  }

  show(text, x, y) {
    this.content.textContent = text;
    this.element.setAttribute('data-show', '1');
    this.element.style.transform = 'none';
    this.visible = true;
    this.position(x, y);
  }

  hide() {
    this.element.removeAttribute('data-show');
    this.element.style.transform = 'translate(-9999px,-9999px)';
    this.visible = false;
  }

  position(x, y) {
    const margin = 12;
    const rect = this.element.getBoundingClientRect();
    let left = x;
    let top = y - rect.height - 10;
    if (top < margin) {
      top = y + 16;
    }
    if (left + rect.width + margin > window.innerWidth) {
      left = window.innerWidth - rect.width - margin;
    }
    if (left < margin) {
      left = margin;
    }
    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
    this.arrow.style.left = `${Math.min(Math.max(16, x - left), rect.width - 16)}px`;
    this.arrow.style.top = `${top < y ? rect.height - 2 : -12}px`;
    this.arrow.style.transform = top < y ? 'rotate(180deg)' : 'rotate(0deg)';
  }

  handleMouseOver(event) {
    const trigger = event.target.closest('.sbz-tooltip__trigger');
    if (trigger && trigger.dataset.tip) {
      this.show(trigger.dataset.tip, event.clientX, event.clientY);
    }
  }

  handleMouseMove(event) {
    if (this.visible) {
      this.position(event.clientX, event.clientY);
    }
  }

  handleMouseOut(event) {
    if (!this.visible) {
      return;
    }
    if (!event.relatedTarget || !event.relatedTarget.closest('.sbz-tooltip__trigger')) {
      this.hide();
    }
  }
}
