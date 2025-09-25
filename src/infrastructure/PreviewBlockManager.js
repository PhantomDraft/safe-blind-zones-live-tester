export class PreviewBlockManager {
  static MIN_WIDTH = 40;
  static MIN_HEIGHT = 40;
  static DEFAULT_WIDTH = 240;
  static DEFAULT_HEIGHT = 120;

  constructor(screenElement, renderer) {
    this.screenElement = screenElement;
    this.renderer = renderer;
    this.blocks = [];
    this.layer = null;
    this.dom = new Map();
    this.sequence = 1;
    this.pointerState = null;
    this.currentCtx = null;
    this.renderState = null;
    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.boundPointerUp = this.handlePointerUp.bind(this);
  }

  getBlocks() {
    return this.blocks.map(block => ({ ...block }));
  }

  addBlock(ctx) {
    if (!ctx || !ctx.inner) {
      return null;
    }
    const innerWidth = Math.max(0, ctx.inner.R - ctx.inner.L);
    const innerHeight = Math.max(0, ctx.inner.B - ctx.inner.T);
    if (innerWidth < PreviewBlockManager.MIN_WIDTH || innerHeight < PreviewBlockManager.MIN_HEIGHT) {
      console.warn('Safe zone is too small to place a block.');
      return null;
    }
    const width = this.clamp(PreviewBlockManager.DEFAULT_WIDTH, PreviewBlockManager.MIN_WIDTH, innerWidth);
    const height = this.clamp(PreviewBlockManager.DEFAULT_HEIGHT, PreviewBlockManager.MIN_HEIGHT, innerHeight);
    const block = {
      id: `block-${this.sequence++}`,
      x: Math.round(ctx.inner.L + (innerWidth - width) / 2),
      y: Math.round(ctx.inner.T + (innerHeight - height) / 2),
      width,
      height
    };
    this.blocks.push(block);
    this.renderBlocks(ctx);
    return block;
  }

  renderBlocks(ctx) {
    this.currentCtx = ctx;
    const renderState = this.renderer.getRenderState();
    this.renderState = renderState;
    this.clearLayer();
    if (!ctx || !ctx.inner || !renderState) {
      return;
    }
    const innerWidth = Math.max(0, ctx.inner.R - ctx.inner.L);
    const innerHeight = Math.max(0, ctx.inner.B - ctx.inner.T);
    if (innerWidth <= 0 || innerHeight <= 0) {
      return;
    }
    this.syncBlocksWithBounds(ctx);
    if (this.blocks.length === 0) {
      return;
    }
    this.layer = document.createElement('div');
    this.layer.className = 'sbz-preview__blocks-layer';
    this.screenElement.appendChild(this.layer);
    this.blocks.forEach(block => {
      const element = this.createBlockElement(block);
      this.layer.appendChild(element);
      this.dom.set(block.id, element);
      this.updateBlockElement(block);
    });
  }

  createBlockElement(block) {
    const element = document.createElement('div');
    element.className = 'sbz-block';
    element.dataset.blockId = block.id;
    const handles = ['left', 'right', 'top', 'bottom'].map(direction => this.createHandle(direction, block.id));
    const label = document.createElement('div');
    label.className = 'sbz-block__label';
    const size = document.createElement('div');
    size.className = 'sbz-block__label-size';
    label.appendChild(size);
    handles.forEach(handle => element.appendChild(handle));
    element.appendChild(label);
    const removeButton = this.createRemoveButton(block.id);
    element.appendChild(removeButton);
    element.addEventListener('pointerdown', event => this.handlePointerDown(event, block.id, element));
    return element;
  }

  createHandle(direction, blockId) {
    const handle = document.createElement('div');
    handle.className = `sbz-block__handle sbz-block__handle--${direction}`;
    handle.dataset.direction = direction;
    handle.dataset.blockId = blockId;
    handle.addEventListener('pointerdown', event => this.startResize(event, direction, blockId, handle));
    return handle;
  }

  createRemoveButton(blockId) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sbz-block__remove';
    button.setAttribute('aria-label', 'Remove block');
    button.title = 'Remove block';
    button.textContent = '×';
    button.addEventListener('pointerdown', event => {
      event.stopPropagation();
    });
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      this.removeBlock(blockId);
    });
    return button;
  }

  handlePointerDown(event, blockId, element) {
    if (event.button !== 0) {
      return;
    }
    const block = this.getBlockById(blockId);
    if (!block) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.startInteraction(
      {
        type: 'move',
        pointerId: event.pointerId,
        blockId,
        originX: event.clientX,
        originY: event.clientY,
        startX: block.x,
        startY: block.y
      },
      element
    );
  }

  startResize(event, direction, blockId, handle) {
    if (event.button !== 0) {
      return;
    }
    const block = this.getBlockById(blockId);
    if (!block) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.startInteraction(
      {
        type: `resize-${direction}`,
        pointerId: event.pointerId,
        blockId,
        originX: event.clientX,
        originY: event.clientY,
        startX: block.x,
        startY: block.y,
        startWidth: block.width,
        startHeight: block.height
      },
      handle
    );
  }

  startInteraction(state, target) {
    this.endInteraction();
    this.pointerState = { ...state, target };
    if (target && target.setPointerCapture) {
      try {
        target.setPointerCapture(state.pointerId);
      } catch (error) {
        console.warn('Pointer capture failed.', error);
      }
    }
    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);
    window.addEventListener('pointercancel', this.boundPointerUp);
  }

  handlePointerMove(event) {
    if (!this.pointerState || event.pointerId !== this.pointerState.pointerId) {
      return;
    }
    const block = this.getBlockById(this.pointerState.blockId);
    if (!block || !this.renderState || !this.currentCtx) {
      return;
    }
    const scale = this.renderState.scale || 1;
    const deltaX = (event.clientX - this.pointerState.originX) / scale;
    const deltaY = (event.clientY - this.pointerState.originY) / scale;
    const bounds = this.currentCtx.inner;
    if (!bounds) {
      return;
    }
    if (this.pointerState.type === 'move') {
      const newX = this.clamp(this.pointerState.startX + deltaX, bounds.L, bounds.R - block.width);
      const newY = this.clamp(this.pointerState.startY + deltaY, bounds.T, bounds.B - block.height);
      block.x = Math.round(newX);
      block.y = Math.round(newY);
    } else if (this.pointerState.type === 'resize-right') {
      const maxWidth = bounds.R - this.pointerState.startX;
      const nextWidth = this.clamp(this.pointerState.startWidth + deltaX, PreviewBlockManager.MIN_WIDTH, maxWidth);
      block.width = Math.round(nextWidth);
    } else if (this.pointerState.type === 'resize-left') {
      const maxLeft = this.pointerState.startX + this.pointerState.startWidth - PreviewBlockManager.MIN_WIDTH;
      const proposedX = this.clamp(this.pointerState.startX + deltaX, bounds.L, maxLeft);
      const delta = this.pointerState.startX - proposedX;
      const candidateWidth = this.pointerState.startWidth + delta;
      const clampedWidth = this.clamp(candidateWidth, PreviewBlockManager.MIN_WIDTH, bounds.R - proposedX);
      block.x = Math.round(proposedX);
      block.width = Math.round(clampedWidth);
    } else if (this.pointerState.type === 'resize-bottom') {
      const maxHeight = bounds.B - this.pointerState.startY;
      const nextHeight = this.clamp(this.pointerState.startHeight + deltaY, PreviewBlockManager.MIN_HEIGHT, maxHeight);
      block.height = Math.round(nextHeight);
    } else if (this.pointerState.type === 'resize-top') {
      const maxTop = this.pointerState.startY + this.pointerState.startHeight - PreviewBlockManager.MIN_HEIGHT;
      const proposedY = this.clamp(this.pointerState.startY + deltaY, bounds.T, maxTop);
      const delta = this.pointerState.startY - proposedY;
      const candidateHeight = this.pointerState.startHeight + delta;
      const clampedHeight = this.clamp(candidateHeight, PreviewBlockManager.MIN_HEIGHT, bounds.B - proposedY);
      block.y = Math.round(proposedY);
      block.height = Math.round(clampedHeight);
    }
    this.updateBlockElement(block);
  }

  handlePointerUp(event) {
    if (!this.pointerState || event.pointerId !== this.pointerState.pointerId) {
      return;
    }
    this.endInteraction();
  }

  endInteraction() {
    if (!this.pointerState) {
      return;
    }
    const { target, pointerId } = this.pointerState;
    if (target && target.releasePointerCapture) {
      try {
        target.releasePointerCapture(pointerId);
      } catch (error) {
        console.warn('Pointer release failed.', error);
      }
    }
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    window.removeEventListener('pointercancel', this.boundPointerUp);
    this.pointerState = null;
  }

  updateBlockElement(block) {
    const element = this.dom.get(block.id);
    if (!element || !this.renderState) {
      return;
    }
    const scale = this.renderState.scale || 1;
    element.style.left = `${Math.round(block.x * scale)}px`;
    element.style.top = `${Math.round(block.y * scale)}px`;
    element.style.width = `${Math.round(block.width * scale)}px`;
    element.style.height = `${Math.round(block.height * scale)}px`;
    const size = element.querySelector('.sbz-block__label-size');
    if (size) {
      size.textContent = `${block.width} × ${block.height} px`;
    }
  }

  clearLayer() {
    if (this.layer && this.layer.parentNode) {
      this.layer.parentNode.removeChild(this.layer);
    }
    this.layer = null;
    this.dom.clear();
  }

  removeAllBlocks() {
    this.blocks = [];
    this.clearLayer();
  }

  removeBlock(blockId) {
    const index = this.blocks.findIndex(block => block.id === blockId);
    if (index === -1) {
      return;
    }
    this.blocks.splice(index, 1);
    if (this.pointerState && this.pointerState.blockId === blockId) {
      this.endInteraction();
    }
    this.renderBlocks(this.currentCtx);
  }

  getBlockById(id) {
    return this.blocks.find(block => block.id === id) || null;
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  syncBlocksWithBounds(ctx) {
    if (!ctx || !ctx.inner) {
      return;
    }
    const bounds = ctx.inner;
    this.blocks.forEach(block => {
      const maxWidth = bounds.R - bounds.L;
      const maxHeight = bounds.B - bounds.T;
      block.width = this.clamp(block.width, PreviewBlockManager.MIN_WIDTH, maxWidth);
      block.height = this.clamp(block.height, PreviewBlockManager.MIN_HEIGHT, maxHeight);
      block.x = this.clamp(block.x, bounds.L, bounds.R - block.width);
      block.y = this.clamp(block.y, bounds.T, bounds.B - block.height);
    });
  }
}
