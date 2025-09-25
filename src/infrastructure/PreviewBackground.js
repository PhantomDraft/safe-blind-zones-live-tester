export class PreviewBackground {
  static DEFAULT_MODE = 'cover';

  static MODE_TO_SIZE = {
    cover: 'cover',
    contain: 'contain',
    stretch: '100% 100%',
    'fit-width': '100% auto',
    'fit-height': 'auto 100%',
    actual: 'auto'
  };

  constructor(element) {
    this.element = element;
    this.mode = PreviewBackground.DEFAULT_MODE;
    this.imageUrl = '';
    this.apply();
  }

  setImage(dataUrl) {
    this.imageUrl = dataUrl || '';
    this.apply();
  }

  clear() {
    this.setImage('');
  }

  setMode(mode) {
    this.mode = PreviewBackground.MODE_TO_SIZE[mode] ? mode : PreviewBackground.DEFAULT_MODE;
    this.apply();
  }

  apply() {
    this.element.style.backgroundImage = this.imageUrl ? `url(${this.imageUrl})` : 'none';
    this.element.style.backgroundRepeat = 'no-repeat';
    this.element.style.backgroundPosition = 'center center';
    const size = PreviewBackground.MODE_TO_SIZE[this.mode] || PreviewBackground.MODE_TO_SIZE[PreviewBackground.DEFAULT_MODE];
    this.element.style.backgroundSize = size;
  }

  getImageUrl() {
    return this.imageUrl;
  }

  getMode() {
    return this.mode;
  }
}
