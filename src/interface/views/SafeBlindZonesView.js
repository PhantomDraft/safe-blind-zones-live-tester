import { PreviewRenderer } from '../../infrastructure/PreviewRenderer.js';
import { PreviewBlockManager } from '../../infrastructure/PreviewBlockManager.js';

export class SafeBlindZonesView {
  constructor(elements) {
    this.elements = elements;
    this.previewRenderer = new PreviewRenderer(elements.screen);
    this.blockManager = new PreviewBlockManager(elements.screen, this.previewRenderer);
    this.innerDataVisible = true;
  }

  getPreviewRenderer() {
    return this.previewRenderer;
  }

  getBlockManager() {
    return this.blockManager;
  }

  updateKPIs(ctx) {
    if (this.elements.kTop) {
      this.elements.kTop.textContent = ctx.top;
    }
    if (this.elements.kBottom) {
      this.elements.kBottom.textContent = ctx.bottom;
    }
    if (this.elements.kSide) {
      this.elements.kSide.textContent = ctx.side;
    }
    if (this.elements.kTarget) {
      this.elements.kTarget.textContent = ctx.target;
    }
  }

  renderPreview(ctx) {
    this.previewRenderer.render(ctx);
    this.blockManager.renderBlocks(ctx);
  }

  renderCalcTable(ctx) {
    const body = this.elements.calcTable;
    body.innerHTML = '';
    const row = document.createElement('tr');
    row.appendChild(this.createCell(`${ctx.W}×${ctx.H}`));
    row.appendChild(this.createCell(ctx.top));
    row.appendChild(this.createCell(ctx.bottom));
    row.appendChild(this.createCell(ctx.side));
    row.appendChild(this.createCell(`(${ctx.safe.L}, ${ctx.safe.T}, ${ctx.safe.R}, ${ctx.safe.B})`));
    row.appendChild(this.createCell(`${ctx.target} px`));
    row.appendChild(this.createCell(`${ctx.gap} px`));
    row.appendChild(this.createCell(`${ctx.iTop}/${ctx.iBottom} px`));
    row.appendChild(this.createCell(`${ctx.iSide} px`));
    row.appendChild(this.createCell(`(${ctx.inner.L}, ${ctx.inner.T}, ${ctx.inner.R}, ${ctx.inner.B})`));
    body.appendChild(row);
  }

  renderPresetTable(presets, calculator) {
    const body = this.elements.presetTable;
    body.innerHTML = '';
    presets.forEach(preset => {
      const ctx = calculator.calculate({
        W: preset.W,
        H: preset.H,
        pTop: preset.pTop,
        pBottom: preset.pBottom,
        pSide: preset.pSide,
        mTopBottom: preset.mTopBottom,
        mSides: preset.mSides,
        platform: preset.platform,
        dpi: preset.dpi,
        scale: preset.scale
      });
      const row = document.createElement('tr');
      const nameCell = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sbz-preset__link';
      button.textContent = preset.name;
      button.dataset.presetId = preset.id;
      nameCell.appendChild(button);
      row.appendChild(nameCell);
      row.appendChild(this.createCell(`${preset.W}×${preset.H}`));
      row.appendChild(this.createCell(preset.platform === 'android' ? 'Android' : 'iOS'));
      row.appendChild(this.createCell(preset.platform === 'android' ? `${preset.dpi} dpi` : `@${preset.scale}x`));
      row.appendChild(this.createCell(ctx.top));
      row.appendChild(this.createCell(ctx.bottom));
      row.appendChild(this.createCell(ctx.side));
      row.appendChild(this.createCell(`(${ctx.safe.L}, ${ctx.safe.T}, ${ctx.safe.R}, ${ctx.safe.B})`));
      row.appendChild(this.createCell(`${ctx.target} px`));
      row.appendChild(this.createCell(`${ctx.gap} px`));
      body.appendChild(row);
    });
  }

  createCell(content) {
    const cell = document.createElement('td');
    cell.textContent = content;
    return cell;
  }

  setPlatformVisibility(platform) {
    if (platform === 'android') {
      this.elements.androidBox.classList.remove('sbz-form__group--hidden');
      this.elements.iosBox.classList.add('sbz-form__group--hidden');
    } else {
      this.elements.androidBox.classList.add('sbz-form__group--hidden');
      this.elements.iosBox.classList.remove('sbz-form__group--hidden');
    }
  }

  updateOrientationControl(orientation, labelText) {
    if (!this.elements.rotatePreview) {
      return;
    }
    this.elements.rotatePreview.classList.toggle(
      'sbz-preview__action--rotate-landscape',
      orientation === 'landscape'
    );
    if (labelText) {
      this.elements.rotatePreview.setAttribute('aria-label', labelText);
      this.elements.rotatePreview.setAttribute('title', labelText);
    }
  }

  disableExportButton() {
    if (this.elements.exportPreview) {
      this.elements.exportPreview.disabled = true;
      this.elements.exportPreview.setAttribute('aria-busy', 'true');
    }
  }

  enableExportButton() {
    if (this.elements.exportPreview) {
      this.elements.exportPreview.disabled = false;
      this.elements.exportPreview.removeAttribute('aria-busy');
    }
  }

  addBlockToPreview(ctx) {
    this.blockManager.addBlock(ctx);
  }

  clearBlocks() {
    this.blockManager.removeAllBlocks();
  }

  setInnerDataVisibility(isVisible) {
    this.innerDataVisible = Boolean(isVisible);
    this.previewRenderer.setInnerDataVisibility(this.innerDataVisible);
    if (this.elements.toggleData) {
      this.elements.toggleData.classList.toggle(
        'sbz-preview__action--toggle-data--hidden',
        !this.innerDataVisible
      );
      this.elements.toggleData.setAttribute('aria-pressed', this.innerDataVisible ? 'false' : 'true');
    }
  }

  isInnerDataVisible() {
    return this.innerDataVisible;
  }

  updateDataVisibilityLabel(label, key) {
    if (!this.elements.toggleData || !label) {
      return;
    }
    this.elements.toggleData.setAttribute('aria-label', label);
    this.elements.toggleData.setAttribute('title', label);
    if (key) {
      this.elements.toggleData.setAttribute('data-i18n-aria-label', key);
      this.elements.toggleData.setAttribute('data-i18n-title', key);
    }
  }
}
