export class LocalizationRepository {
  constructor(baseUrl = new URL('../../i18n/locales/', import.meta.url)) {
    this.baseUrl = baseUrl;
    this.cache = new Map();
  }

  async loadLanguages(languages) {
    const entries = await Promise.all(
      languages.map(async language => {
        const data = await this.loadLanguage(language);
        return [language, data];
      })
    );

    return entries.reduce((result, [language, data]) => {
      result[language] = data;
      return result;
    }, {});
  }

  async loadLanguage(language) {
    if (this.cache.has(language)) {
      return this.cache.get(language);
    }

    const url = new URL(`${language}.json`, this.baseUrl);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load locale: ${language}`);
    }

    const data = await response.json();
    this.cache.set(language, data);
    return data;
  }
}
