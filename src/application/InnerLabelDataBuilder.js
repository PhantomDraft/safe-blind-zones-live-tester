export class InnerLabelDataBuilder {
  static build(ctx) {
    if (!ctx || !ctx.inner) {
      return null;
    }

    const widthPx = Math.max(0, Math.round(ctx.inner.R - ctx.inner.L));
    const heightPx = Math.max(0, Math.round(ctx.inner.B - ctx.inner.T));
    if (widthPx === 0 || heightPx === 0) {
      return null;
    }

    const widthPercent = ctx.W ? (widthPx / ctx.W) * 100 : 0;
    const heightPercent = ctx.H ? (heightPx / ctx.H) * 100 : 0;

    const metrics = [
      { key: 'top', labelKey: 'metrics.top', fallback: 'Top', value: ctx.top },
      { key: 'bottom', labelKey: 'metrics.bottom', fallback: 'Bottom', value: ctx.bottom },
      { key: 'side', labelKey: 'metrics.side', fallback: 'Side', value: ctx.side },
      { key: 'target', labelKey: 'metrics.targetLabel', fallback: 'Min target', value: ctx.target }
    ].map(item => ({
      ...item,
      value: InnerLabelDataBuilder.formatInteger(item.value),
      unit: 'px'
    }));

    return {
      widthPx,
      heightPx,
      widthPercent,
      heightPercent,
      pxLine: `${widthPx} × ${heightPx} px`,
      percentLine: `${InnerLabelDataBuilder.formatPercent(widthPercent)} × ${InnerLabelDataBuilder.formatPercent(heightPercent)}`,
      metrics
    };
  }

  static buildTextReport(ctx, translate = key => key, lineSeparator = '\n') {
    const data = InnerLabelDataBuilder.build(ctx);
    if (!data) {
      return null;
    }

    const t = key => {
      if (typeof translate !== 'function') {
        return key;
      }
      const result = translate(key);
      return result === undefined || result === null ? key : result;
    };

    const lines = [
      t('export.reportTitle'),
      '',
      `${t('export.innerDimensions')}: ${data.pxLine}`,
      `${t('export.innerPercent')}: ${data.percentLine}`,
      '',
      `${t('export.metricsHeader')}:`
    ];

    data.metrics.forEach(metric => {
      const label = t(metric.labelKey) || metric.fallback;
      lines.push(`- ${label}: ${metric.value} ${metric.unit}`);
    });

    return lines.join(lineSeparator);
  }

  static formatPercent(value) {
    if (!Number.isFinite(value)) {
      return '0.0%';
    }
    return `${value.toFixed(1)}%`;
  }

  static formatInteger(value) {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.round(value);
  }
}
