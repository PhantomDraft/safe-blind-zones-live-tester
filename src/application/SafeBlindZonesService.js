import { SafeBlindZonesCalculator } from '../domain/SafeBlindZonesCalculator.js';

export class SafeBlindZonesService {
  constructor() {
    this.calculator = new SafeBlindZonesCalculator();
    this.orientation = 'portrait';
    this.lastContext = null;
  }

  getCalculator() {
    return this.calculator;
  }

  getOrientation() {
    return this.orientation;
  }

  toggleOrientation() {
    this.orientation = this.orientation === 'portrait' ? 'landscape' : 'portrait';
    return this.orientation;
  }

  setOrientation(orientation) {
    if (orientation === 'portrait' || orientation === 'landscape') {
      this.orientation = orientation;
    }
  }

  calculate(formState) {
    const orientedState = this.applyOrientation(formState);
    const context = this.calculator.calculate(orientedState);
    context.orientation = this.orientation;
    this.lastContext = context;
    return context;
  }

  getLastContext() {
    return this.lastContext;
  }

  applyOrientation(state) {
    if (this.orientation !== 'landscape') {
      return { ...state };
    }
    return {
      ...state,
      W: state.H,
      H: state.W
    };
  }
}
