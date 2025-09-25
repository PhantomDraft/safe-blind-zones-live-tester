import { LocalizationRepository } from './LocalizationRepository.js';

export class LocalizationService {
  constructor(
    repository = new LocalizationRepository(),
    defaultLanguage = 'uk',
    supportedLanguages = ['uk', 'en']
  ) {
    this.repository = repository;
    this.defaultLanguage = defaultLanguage;
    this.supportedLanguages = supportedLanguages;
    this.language = defaultLanguage;
    this.translations = {};
    this.ready = false;
    this.loadingPromise = null;
  }

  async load() {
    if (this.ready) {
      return this.translations;
    }

    if (!this.loadingPromise) {
      this.loadingPromise = this.repository
        .loadLanguages(this.supportedLanguages)
        .then(translations => {
          this.translations = translations;
          if (!this.translations[this.language]) {
            this.language = this.defaultLanguage;
          }
          document.documentElement.lang = this.language;
          this.ready = true;
          return this.translations;
        });
    }

    return this.loadingPromise;
  }

  async setLanguage(language) {
    await this.load();
    if (!this.translations[language]) {
      return;
    }

    this.language = language;
    document.documentElement.lang = language;
    this.applyLanguage();
  }

  getLanguage() {
    return this.language;
  }

  translate(key) {
    if (!this.ready) {
      return key;
    }

    const dictionary = this.translations[this.language] || {};
    return dictionary[key] || key;
  }

  applyLanguage(root = document) {
    if (!this.ready) {
      return;
    }

    const nodes = root.querySelectorAll('[data-i18n]');
    nodes.forEach(node => {
      const key = node.getAttribute('data-i18n');
      if (key) {
        node.innerHTML = this.translate(key);
      }
    });

    const tipNodes = root.querySelectorAll('[data-i18n-tip]');
    tipNodes.forEach(node => {
      const key = node.getAttribute('data-i18n-tip');
      if (key) {
        node.dataset.tip = this.translate(key);
      }
    });

    const ariaNodes = root.querySelectorAll('[data-i18n-aria-label]');
    ariaNodes.forEach(node => {
      const key = node.getAttribute('data-i18n-aria-label');
      if (key) {
        node.setAttribute('aria-label', this.translate(key));
      }
    });

    const titleNodes = root.querySelectorAll('[data-i18n-title]');
    titleNodes.forEach(node => {
      const key = node.getAttribute('data-i18n-title');
      if (key) {
        node.setAttribute('title', this.translate(key));
      }
    });

    const selectNodes = root.querySelectorAll('option[data-i18n]');
    selectNodes.forEach(option => {
      const key = option.getAttribute('data-i18n');
      if (key) {
        option.textContent = this.translate(key);
      }
    });

    const titleElement = document.querySelector('title');
    const titleKey = titleElement?.getAttribute('data-i18n');
    if (titleElement && titleKey) {
      const translated = this.translate(titleKey);
      titleElement.textContent = translated;
    }
  }
}
