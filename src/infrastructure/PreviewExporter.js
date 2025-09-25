import { InnerLabelDataBuilder } from '../application/InnerLabelDataBuilder.js';
import { ZipBuilder } from './ZipBuilder.js';

export class PreviewExporter {
  constructor(background, blockManager, localization) {
    this.background = background;
    this.blockManager = blockManager;
    this.localization = localization;
  }

  async export(ctx, options = {}) {
    const { hideInnerData = false } = options;
    if (!ctx || !ctx.W || !ctx.H) {
      return;
    }
    const width = Math.round(ctx.W);
    const height = Math.round(ctx.H);
    if (width <= 0 || height <= 0) {
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext('2d');
    if (!g) {
      return;
    }
    g.fillStyle = '#111111';
    g.fillRect(0, 0, width, height);
    await this.drawBackground(g, ctx);
    this.drawBlindZones(g, ctx);
    this.drawSafeZone(g, ctx);
    this.drawInnerZone(g, ctx);
    if (!hideInnerData) {
      this.drawInnerLabel(g, ctx);
    }
    this.drawBlocks(g, ctx);
    if (hideInnerData) {
      await this.exportHiddenPackage(canvas, ctx);
    } else {
      await this.triggerPngDownload(canvas);
    }
  }

  async drawBackground(g, ctx) {
    const imageUrl = this.background.getImageUrl();
    if (!imageUrl) {
      return;
    }
    const image = await this.loadImage(imageUrl).catch(() => null);
    if (!image) {
      return;
    }
    const placement = this.calculateBackgroundPlacement(image, this.background.getMode(), ctx.W, ctx.H);
    g.drawImage(image, placement.x, placement.y, placement.width, placement.height);
  }

  calculateBackgroundPlacement(image, mode, targetWidth, targetHeight) {
    const iw = image.width;
    const ih = image.height;
    const tw = targetWidth;
    const th = targetHeight;
    if (!iw || !ih) {
      return { x: 0, y: 0, width: tw, height: th };
    }
    switch (mode) {
      case 'contain': {
        const scale = Math.min(tw / iw, th / ih);
        const width = iw * scale;
        const height = ih * scale;
        return { x: (tw - width) / 2, y: (th - height) / 2, width, height };
      }
      case 'stretch': {
        return { x: 0, y: 0, width: tw, height: th };
      }
      case 'fit-width': {
        const scale = tw / iw;
        const width = tw;
        const height = ih * scale;
        return { x: 0, y: (th - height) / 2, width, height };
      }
      case 'fit-height': {
        const scale = th / ih;
        const width = iw * scale;
        const height = th;
        return { x: (tw - width) / 2, y: 0, width, height };
      }
      case 'actual': {
        return { x: (tw - iw) / 2, y: (th - ih) / 2, width: iw, height: ih };
      }
      case 'cover':
      default: {
        const scale = Math.max(tw / iw, th / ih);
        const width = iw * scale;
        const height = ih * scale;
        return { x: (tw - width) / 2, y: (th - height) / 2, width, height };
      }
    }
  }

  drawBlindZones(g, ctx) {
    if (!ctx) {
      return;
    }
    const fill = 'rgba(214,69,69,0.16)';
    const stroke = 'rgba(214,69,69,0.6)';
    const lineWidth = 2;
    this.fillAndStrokeRect(g, { x: 0, y: 0, width: ctx.W, height: ctx.top }, fill, stroke, lineWidth);
    this.fillAndStrokeRect(g, { x: 0, y: ctx.H - ctx.bottom, width: ctx.W, height: ctx.bottom }, fill, stroke, lineWidth);
    this.fillAndStrokeRect(g, { x: 0, y: 0, width: ctx.side, height: ctx.H }, fill, stroke, lineWidth);
    this.fillAndStrokeRect(g, { x: ctx.W - ctx.side, y: 0, width: ctx.side, height: ctx.H }, fill, stroke, lineWidth);
  }

  drawSafeZone(g, ctx) {
    if (!ctx || !ctx.safe) {
      return;
    }
    const safe = ctx.safe;
    const rect = { x: safe.L, y: safe.T, width: safe.R - safe.L, height: safe.B - safe.T };
    this.fillAndStrokeRect(g, rect, 'rgba(20,164,77,0.08)', 'rgba(20,164,77,0.6)', 2);
  }

  drawInnerZone(g, ctx) {
    if (!ctx || !ctx.inner) {
      return;
    }
    const inner = ctx.inner;
    const rect = { x: inner.L, y: inner.T, width: inner.R - inner.L, height: inner.B - inner.T };
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }
    this.fillAndStrokeRect(g, rect, 'rgba(34,102,238,0.06)', 'rgba(34,102,238,0.55)', 2);
    g.save();
    g.strokeStyle = 'rgba(34,102,238,0.22)';
    g.lineWidth = 4;
    g.strokeRect(rect.x, rect.y, rect.width, rect.height);
    g.restore();
  }

  drawInnerLabel(g, ctx) {
    const data = InnerLabelDataBuilder.build(ctx);
    if (!data) {
      return;
    }

    const paddingX = 18;
    const paddingY = 12;
    const baseFont = Math.max(14, Math.min(28, Math.round(ctx.W * 0.013)));
    const secondaryFont = Math.max(12, Math.min(24, Math.round(baseFont * 0.85)));
    const metricsFont = Math.max(11, Math.min(22, Math.round(baseFont * 0.7)));
    const metricsLineHeight = metricsFont + 6;
    const metricsGap = data.metrics.length ? 10 : 0;

    g.save();
    g.font = `600 ${baseFont}px "Segoe UI", system-ui, -apple-system, sans-serif`;
    const pxMetrics = g.measureText(data.pxLine);
    g.font = `500 ${secondaryFont}px "Segoe UI", system-ui, -apple-system, sans-serif`;
    const percentMetrics = g.measureText(data.percentLine);
    g.font = `500 ${metricsFont}px "Segoe UI", system-ui, -apple-system, sans-serif`;
    const metricWidths = data.metrics.map(metric => {
      const label = this.resolveMetricLabel(metric);
      const line = `${label}: ${metric.value} ${metric.unit}`;
      return g.measureText(line).width;
    });
    const textWidth = Math.max(pxMetrics.width, percentMetrics.width, ...(metricWidths.length ? metricWidths : [0]));
    const labelWidth = textWidth + paddingX * 2;
    const innerWidth = ctx.inner.R - ctx.inner.L;
    const innerHeight = ctx.inner.B - ctx.inner.T;
    const labelHeight =
      paddingY * 2 +
      baseFont +
      secondaryFont +
      6 +
      (data.metrics.length ? metricsGap + data.metrics.length * metricsLineHeight : 0);
    const labelX = ctx.inner.L + innerWidth / 2 - labelWidth / 2;
    const labelY = ctx.inner.T + innerHeight / 2 - labelHeight / 2;

    g.fillStyle = 'rgba(255,255,255,0.92)';
    g.strokeStyle = 'rgba(34,102,238,0.22)';
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(labelX, labelY, labelWidth, labelHeight, 10);
    g.fill();
    g.stroke();

    let baseline = labelY + paddingY + baseFont - 4;
    g.fillStyle = 'rgba(34,102,238,0.95)';
    g.font = `600 ${baseFont}px "Segoe UI", system-ui, -apple-system, sans-serif`;
    g.fillText(data.pxLine, labelX + paddingX, baseline);

    baseline += secondaryFont + 10;
    g.fillStyle = 'rgba(34,102,238,0.88)';
    g.font = `500 ${secondaryFont}px "Segoe UI", system-ui, -apple-system, sans-serif`;
    g.fillText(data.percentLine, labelX + paddingX, baseline);

    if (data.metrics.length) {
      baseline += metricsGap;
      g.font = `500 ${metricsFont}px "Segoe UI", system-ui, -apple-system, sans-serif`;
      g.fillStyle = 'rgba(26,73,185,0.88)';
      data.metrics.forEach(metric => {
        const line = `${this.resolveMetricLabel(metric)}: ${metric.value} ${metric.unit}`;
        baseline += metricsFont;
        g.fillText(line, labelX + paddingX, baseline);
        baseline += metricsLineHeight - metricsFont;
      });
    }

    g.restore();
  }

  drawBlocks(g, ctx) {
    const blocks = this.blockManager.getBlocks();
    if (!blocks.length || !ctx.inner) {
      return;
    }
    blocks.forEach(block => this.drawSingleBlock(g, block));
  }

  drawSingleBlock(g, block) {
    g.save();
    g.fillStyle = 'rgba(34,102,238,0.24)';
    g.strokeStyle = 'rgba(34,102,238,0.52)';
    g.lineWidth = 2;
    g.roundRect(block.x, block.y, block.width, block.height, 14);
    g.fill();
    g.stroke();
    const label = `${block.width} × ${block.height} px`;
    const fontSize = 14;
    g.font = `600 ${fontSize}px "Segoe UI", system-ui, -apple-system, sans-serif`;
    const metrics = g.measureText(label);
    const labelWidth = metrics.width + 16;
    const labelHeight = fontSize + 12;
    const labelX = block.x + block.width / 2 - labelWidth / 2;
    const labelY = block.y + 8;
    g.fillStyle = 'rgba(255,255,255,0.82)';
    g.roundRect(labelX, labelY, labelWidth, labelHeight, 999);
    g.fill();
    g.fillStyle = 'rgba(34,102,238,0.92)';
    g.fillText(label, labelX + 8, labelY + fontSize);
    g.restore();
  }

  fillAndStrokeRect(g, rect, fill, stroke, lineWidth) {
    g.save();
    g.fillStyle = fill;
    g.fillRect(rect.x, rect.y, rect.width, rect.height);
    g.strokeStyle = stroke;
    g.lineWidth = lineWidth;
    g.strokeRect(rect.x + lineWidth / 2, rect.y + lineWidth / 2, rect.width - lineWidth, rect.height - lineWidth);
    g.restore();
  }

  async exportHiddenPackage(canvas, ctx) {
    const pngBlob = await this.canvasToBlob(canvas);
    if (!pngBlob) {
      return;
    }
    const report =
      InnerLabelDataBuilder.buildTextReport(ctx, key => this.localization?.translate(key)) ||
      this.localization?.translate('export.noData') ||
      'No inner data available.';
    const zipBuilder = new ZipBuilder();
    const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
    zipBuilder.addFile('safe-blind-zones-preview.png', pngBytes);
    zipBuilder.addTextFile('safe-blind-zones-data.txt', report);
    const zipBytes = zipBuilder.build();
    const zipBlob = new Blob([zipBytes], { type: 'application/zip' });
    this.triggerDownloadBlob(zipBlob, 'safe-blind-zones-package.zip');
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  async triggerPngDownload(canvas, filename = 'safe-blind-zones-preview.png') {
    const blob = await this.canvasToBlob(canvas);
    if (!blob) {
      return;
    }
    this.triggerDownloadBlob(blob, filename);
  }

  triggerDownloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  canvasToBlob(canvas) {
    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), 'image/png');
    });
  }

  resolveMetricLabel(metric) {
    if (!metric) {
      return '';
    }
    const translated = this.localization?.translate(metric.labelKey);
    return translated && translated !== metric.labelKey ? translated : metric.fallback;
  }
}
