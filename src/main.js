import { SafeBlindZonesController } from './interface/controllers/SafeBlindZonesController.js';

const elements = {
  width: document.getElementById('width'),
  height: document.getElementById('height'),
  platform: document.getElementById('platform'),
  dpi: document.getElementById('dpi'),
  scale: document.getElementById('scale'),
  percentTop: document.getElementById('percentTop'),
  percentBottom: document.getElementById('percentBottom'),
  percentSide: document.getElementById('percentSide'),
  marginTopBottom: document.getElementById('marginTopBottom'),
  marginSides: document.getElementById('marginSides'),
  backgroundImage: document.getElementById('backgroundImage'),
  backgroundMode: document.getElementById('backgroundMode'),
  clearBackground: document.getElementById('clearBackground'),
  presetPhone: document.getElementById('presetPhone'),
  presetPad: document.getElementById('presetPad'),
  calcTable: document.getElementById('calcTable')?.querySelector('tbody'),
  presetTable: document.getElementById('presetTable')?.querySelector('tbody'),
  screen: document.getElementById('screen'),
  rotatePreview: document.getElementById('rotatePreview'),
  addBlock: document.getElementById('addBlock'),
  toggleData: document.getElementById('toggleData'),
  exportPreview: document.getElementById('exportPreview'),
  androidBox: document.getElementById('androidBox'),
  iosBox: document.getElementById('iosBox'),
  tooltip: document.getElementById('sbz-tooltip'),
  language: document.getElementById('language')
};

if (!elements.calcTable || !elements.presetTable) {
  throw new Error('Table containers are missing in the document.');
}

const controller = new SafeBlindZonesController(elements);
controller.init().catch(error => console.error('Failed to initialize controller.', error));
