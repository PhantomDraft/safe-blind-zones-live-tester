import { SafeBlindZonesService } from '../../application/SafeBlindZonesService.js';
import { presets } from '../../application/presets.js';
import { SafeBlindZonesView } from '../views/SafeBlindZonesView.js';
import { PreviewBackground } from '../../infrastructure/PreviewBackground.js';
import { PreviewExporter } from '../../infrastructure/PreviewExporter.js';
import { Tooltip } from '../../infrastructure/Tooltip.js';
import { LocalizationService } from '../../infrastructure/LocalizationService.js';
import { LocalizationRepository } from '../../infrastructure/LocalizationRepository.js';

export class SafeBlindZonesController {
  constructor(elements, localizationRepository = new LocalizationRepository()) {
    this.elements = elements;
    this.service = new SafeBlindZonesService();
    this.localization = new LocalizationService(localizationRepository, 'uk', ['uk', 'en']);
    this.view = new SafeBlindZonesView(elements);
    this.background = new PreviewBackground(elements.screen);
    this.exporter = new PreviewExporter(this.background, this.view.getBlockManager(), this.localization);
    this.tooltip = new Tooltip(elements.tooltip);
  }

  async init() {
    this.bindEvents();
    await this.localization.load();
    this.localization.applyLanguage();
    this.tooltip.bind(document);
    if (this.elements.language) {
      this.elements.language.value = this.localization.getLanguage();
    }
    this.view.setInnerDataVisibility(true);
    this.updateDataVisibilityControl();
    this.view.renderPresetTable(presets, this.service.getCalculator());
    this.view.setPlatformVisibility(this.elements.platform.value);
    this.updateOrientationControl();
    this.background.setMode(this.elements.backgroundMode.value || PreviewBackground.DEFAULT_MODE);
    this.update();
  }

  bindEvents() {
    const formInputs = [
      this.elements.width,
      this.elements.height,
      this.elements.dpi,
      this.elements.scale,
      this.elements.percentTop,
      this.elements.percentBottom,
      this.elements.percentSide,
      this.elements.marginTopBottom,
      this.elements.marginSides
    ];

    formInputs.forEach(input => {
      if (input) {
        input.addEventListener('input', () => this.update());
      }
    });

    if (this.elements.platform) {
      this.elements.platform.addEventListener('change', () => {
        this.view.setPlatformVisibility(this.elements.platform.value);
        this.update();
      });
    }

    if (this.elements.presetPhone) {
      this.elements.presetPhone.addEventListener('click', () => this.applyPresetById('phone-default'));
    }

    if (this.elements.presetPad) {
      this.elements.presetPad.addEventListener('click', () => this.applyPresetById('tablet-default'));
    }

    if (this.elements.rotatePreview) {
      this.elements.rotatePreview.addEventListener('click', () => {
        this.service.toggleOrientation();
        this.updateOrientationControl();
        this.update();
      });
    }

    if (this.elements.backgroundMode) {
      this.elements.backgroundMode.addEventListener('change', event => {
        this.background.setMode(event.target.value);
        this.update();
      });
    }

    if (this.elements.backgroundImage) {
      this.elements.backgroundImage.addEventListener('change', event => this.handleBackgroundSelection(event));
    }

    if (this.elements.clearBackground) {
      this.elements.clearBackground.addEventListener('click', () => this.handleClearBackground());
    }

    if (this.elements.addBlock) {
      this.elements.addBlock.addEventListener('click', () => this.handleAddBlock());
    }

    if (this.elements.toggleData) {
      this.elements.toggleData.addEventListener('click', () => {
        this.view.setInnerDataVisibility(!this.view.isInnerDataVisible());
        this.updateDataVisibilityControl();
        this.update();
      });
    }

    if (this.elements.exportPreview) {
      this.elements.exportPreview.addEventListener('click', () => this.handleExport());
    }

    if (this.elements.language) {
      this.elements.language.addEventListener('change', event => {
        this.localization
          .setLanguage(event.target.value)
          .then(() => {
            this.updateOrientationControl();
            this.updateDataVisibilityControl();
          })
          .catch(error => console.error('Failed to change language.', error));
      });
    }

    if (this.elements.presetTable) {
      this.elements.presetTable.addEventListener('click', event => {
        const button = event.target.closest('button[data-preset-id]');
        if (button) {
          this.applyPresetById(button.dataset.presetId);
        }
      });
    }
  }

  readFormState() {
    return {
      W: Number(this.elements.width.value) || 0,
      H: Number(this.elements.height.value) || 0,
      platform: this.elements.platform.value,
      dpi: Number(this.elements.dpi.value) || 160,
      scale: Number(this.elements.scale.value) || 2,
      pTop: Number(this.elements.percentTop.value) || 0,
      pBottom: Number(this.elements.percentBottom.value) || 0,
      pSide: Number(this.elements.percentSide.value) || 0,
      mTopBottom: Number(this.elements.marginTopBottom.value) || 0,
      mSides: Number(this.elements.marginSides.value) || 0
    };
  }

  update() {
    const formState = this.readFormState();
    const context = this.service.calculate(formState);
    this.background.apply();
    this.view.updateKPIs(context);
    this.view.renderPreview(context);
    if (this.elements.screen) {
      this.localization.applyLanguage(this.elements.screen);
    }
    this.view.renderCalcTable(context);
  }

  applyPresetById(id) {
    const preset = presets.find(item => item.id === id);
    if (!preset) {
      return;
    }
    this.elements.width.value = preset.W;
    this.elements.height.value = preset.H;
    this.elements.platform.value = preset.platform;
    this.elements.dpi.value = preset.dpi;
    this.elements.scale.value = preset.scale;
    this.elements.percentTop.value = preset.pTop;
    this.elements.percentBottom.value = preset.pBottom;
    this.elements.percentSide.value = preset.pSide;
    this.elements.marginTopBottom.value = preset.mTopBottom;
    this.elements.marginSides.value = preset.mSides;
    this.view.setPlatformVisibility(preset.platform);
    this.update();
  }

  handleBackgroundSelection(event) {
    const { files } = event.target;
    if (!files || !files[0]) {
      return;
    }
    const [file] = files;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.background.setImage(reader.result);
        this.update();
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  handleClearBackground() {
    this.background.clear();
    if (this.elements.backgroundImage) {
      this.elements.backgroundImage.value = '';
    }
    this.update();
  }

  handleAddBlock() {
    const context = this.service.getLastContext() || this.service.calculate(this.readFormState());
    if (context) {
      this.view.addBlockToPreview(context);
    }
  }

  async handleExport() {
    const context = this.service.getLastContext() || this.service.calculate(this.readFormState());
    if (!context) {
      return;
    }
    this.view.disableExportButton();
    try {
      await this.exporter.export(context, {
        hideInnerData: !this.view.isInnerDataVisible()
      });
    } catch (error) {
      console.error('Failed to export preview.', error);
    } finally {
      this.view.enableExportButton();
    }
  }

  updateOrientationControl() {
    const orientation = this.service.getOrientation();
    const label = this.localization.translate('preview.rotate');
    this.view.updateOrientationControl(orientation, label);
  }

  updateDataVisibilityControl() {
    const labelKey = this.view.isInnerDataVisible() ? 'preview.toggleData.hide' : 'preview.toggleData.show';
    const label = this.localization.translate(labelKey);
    this.view.updateDataVisibilityLabel(label, labelKey);
  }
}
