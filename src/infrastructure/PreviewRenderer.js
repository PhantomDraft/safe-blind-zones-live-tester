import { InnerLabelDataBuilder } from '../application/InnerLabelDataBuilder.js';

export class PreviewRenderer {
  constructor(element) {
    this.element = element;
    this.lastRenderState = null;
    this.showInnerData = true;
  }

  render(ctx) {
    const { W, H, top, bottom, side, safe, inner, orientation } = ctx;
    if (!W || !H) {
      this.element.innerHTML = '';
      this.element.style.width = '0';
      this.element.style.height = '0';
      this.lastRenderState = null;
      return;
    }

    const containerRect = this.element.parentElement.getBoundingClientRect();
    const maxW = Math.max(40, containerRect.width - 40);
    const maxH = Math.max(40, containerRect.height - 40);
    const ratioW = maxW / W;
    const ratioH = maxH / H;
    const scaleCandidate = Math.min(ratioW, ratioH);
    const scale = Number.isFinite(scaleCandidate) && scaleCandidate > 0 ? scaleCandidate : 1;
    const scaledWidth = Math.max(1, Math.round(W * scale));
    const scaledHeight = Math.max(1, Math.round(H * scale));

    this.element.style.width = `${scaledWidth}px`;
    this.element.style.height = `${scaledHeight}px`;
    if (orientation) {
      this.element.setAttribute('data-orientation', orientation);
    }
    this.element.innerHTML = '';

    const createLayer = (cls, style) => {
      const layer = document.createElement('div');
      layer.className = cls;
      Object.assign(layer.style, style);
      this.element.appendChild(layer);
      return layer;
    };

    createLayer('sbz-preview__blind-zone', { left: 0, top: 0, width: `${scaledWidth}px`, height: `${Math.round(top * scale)}px` });
    createLayer('sbz-preview__blind-zone', {
      left: 0,
      top: `${scaledHeight - Math.round(bottom * scale)}px`,
      width: `${scaledWidth}px`,
      height: `${Math.round(bottom * scale)}px`
    });
    createLayer('sbz-preview__blind-zone', {
      left: 0,
      top: 0,
      width: `${Math.round(side * scale)}px`,
      height: `${scaledHeight}px`
    });
    createLayer('sbz-preview__blind-zone', {
      left: `${scaledWidth - Math.round(side * scale)}px`,
      top: 0,
      width: `${Math.round(side * scale)}px`,
      height: `${scaledHeight}px`
    });

    createLayer('sbz-preview__safe-zone', {
      left: `${Math.round(safe.L * scale)}px`,
      top: `${Math.round(safe.T * scale)}px`,
      width: `${Math.round((safe.R - safe.L) * scale)}px`,
      height: `${Math.round((safe.B - safe.T) * scale)}px`
    });

    const innerLayer = createLayer('sbz-preview__inner-zone', {
      left: `${Math.round(inner.L * scale)}px`,
      top: `${Math.round(inner.T * scale)}px`,
      width: `${Math.round((inner.R - inner.L) * scale)}px`,
      height: `${Math.round((inner.B - inner.T) * scale)}px`
    });

    const safeRectScaled = {
      left: Math.round(safe.L * scale),
      top: Math.round(safe.T * scale),
      width: Math.round((safe.R - safe.L) * scale),
      height: Math.round((safe.B - safe.T) * scale)
    };
    const innerRectScaled = {
      left: Math.round(inner.L * scale),
      top: Math.round(inner.T * scale),
      width: Math.round((inner.R - inner.L) * scale),
      height: Math.round((inner.B - inner.T) * scale)
    };

    this.lastRenderState = {
      scale,
      screenWidth: scaledWidth,
      screenHeight: scaledHeight,
      safeRect: { ...safe },
      innerRect: { ...inner },
      safeRectScaled,
      innerRectScaled
    };

    this.renderInnerLabel(innerLayer, ctx, scale);
  }

  renderInnerLabel(layer, ctx, scale) {
    if (!layer || !this.showInnerData) {
      return;
    }

    const data = InnerLabelDataBuilder.build(ctx);
    if (!data) {
      return;
    }

    const label = document.createElement('div');
    label.className = 'sbz-preview__inner-label';
    label.style.fontSize = `${Math.max(10, Math.min(20, Math.round(14 * scale)))}px`;

    const pxLine = document.createElement('div');
    pxLine.className = 'sbz-preview__inner-label-px';
    pxLine.textContent = data.pxLine;

    const percentLine = document.createElement('div');
    percentLine.className = 'sbz-preview__inner-label-percent';
    percentLine.textContent = data.percentLine;

    const metrics = document.createElement('div');
    metrics.className = 'sbz-preview__inner-label-metrics';
    data.metrics.forEach(item => {
      const metric = document.createElement('div');
      metric.className = 'sbz-preview__inner-label-metric';
      metric.dataset.metric = item.key;

      const name = document.createElement('span');
      name.className = 'sbz-preview__inner-label-metric-name';
      name.setAttribute('data-i18n', item.labelKey);
      name.textContent = item.fallback;

      const value = document.createElement('span');
      value.className = 'sbz-preview__inner-label-metric-value';
      value.textContent = item.value;

      const unit = document.createElement('span');
      unit.className = 'sbz-preview__inner-label-metric-unit';
      unit.textContent = item.unit;

      metric.append(name, value, unit);
      metrics.appendChild(metric);
    });

    label.append(pxLine, percentLine, metrics);
    layer.appendChild(label);
  }

  getRenderState() {
    return this.lastRenderState ? { ...this.lastRenderState } : null;
  }

  setInnerDataVisibility(isVisible) {
    this.showInnerData = Boolean(isVisible);
  }

  isInnerDataVisible() {
    return this.showInnerData;
  }
}
