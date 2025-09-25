export class SafeBlindZonesCalculator {
  pxTarget(platform, dpi, scale) {
    if (platform === 'android') {
      return Math.round(48 * (dpi / 160));
    }
    return Math.round(44 * scale);
  }

  pxGap(platform, dpi, scale) {
    if (platform === 'android') {
      return Math.round(8 * (dpi / 160));
    }
    return Math.round(8 * scale);
  }

  calculate(params) {
    const { W, H, pTop, pBottom, pSide, mTopBottom, mSides, platform, dpi, scale } = params;
    const top = Math.ceil((pTop / 100) * H);
    const bottom = Math.ceil((pBottom / 100) * H);
    const side = Math.ceil((pSide / 100) * W);

    const safe = { L: side, T: top, R: W - side, B: H - bottom };

    const iTop = Math.ceil((mTopBottom / 100) * H);
    const iBottom = Math.ceil((mTopBottom / 100) * H);
    const iSide = Math.ceil((mSides / 100) * W);

    const inner = {
      L: safe.L + iSide,
      T: safe.T + iTop,
      R: safe.R - iSide,
      B: safe.B - iBottom
    };

    const target = this.pxTarget(platform, dpi, scale);
    const gap = this.pxGap(platform, dpi, scale);

    return {
      W,
      H,
      top,
      bottom,
      side,
      safe,
      inner,
      target,
      gap,
      iTop,
      iBottom,
      iSide,
      platform,
      dpi,
      scale
    };
  }
}
