import { storage } from '@core/storage';
import { usePlatformStore } from '@core/state';
import { logger } from '@core/error';

interface TranslationNode {
  [key: string]: string | TranslationNode;
}

export class LocalizationService {
  private translations: TranslationNode = {};
  private fallbackLanguage = 'en';
  private currentLanguage = 'en';
  private loadedLanguages = new Set<string>();

  async init(language?: string): Promise<void> {
    const lang = language ?? usePlatformStore.getState().settings.language ?? this.fallbackLanguage;
    await this.setLanguage(lang);
  }

  async setLanguage(language: string): Promise<void> {
    if (!this.loadedLanguages.has(language)) {
      await this.loadLanguage(language);
    }

    if (!this.loadedLanguages.has(language) && language !== this.fallbackLanguage) {
      await this.loadLanguage(this.fallbackLanguage);
      this.currentLanguage = this.fallbackLanguage;
      return;
    }

    this.currentLanguage = language;
    usePlatformStore.getState().updateSettings({ language });
    await storage.save('settings:language', language);
    logger.info(`[i18n] Language set to: ${language}`);
  }

  private async loadLanguage(language: string): Promise<void> {
    try {
      const module = await import(`../../../i18n/${language}.json`);
      this.translations = { ...this.translations, ...module.default };
      this.loadedLanguages.add(language);
    } catch {
      logger.warn(`[i18n] Failed to load language: ${language}`);
    }
  }

  t(key: string, params?: Record<string, string | number>): string {
    const value = this.resolve(key, this.translations)
      ?? this.resolve(key, this.translations)
      ?? key;

    if (!params) return value;
    return Object.entries(params).reduce(
      (str, [k, v]) => str.replace(new RegExp(`{{${k}}}`, 'g'), String(v)),
      value
    );
  }

  private resolve(key: string, map: TranslationNode): string | undefined {
    const parts = key.split('.');
    let current: string | TranslationNode = map;

    for (const part of parts) {
      if (typeof current !== 'object' || current === null) return undefined;
      current = current[part];
      if (current === undefined) return undefined;
    }

    return typeof current === 'string' ? current : undefined;
  }

  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  getFallbackLanguage(): string {
    return this.fallbackLanguage;
  }
}

export const i18n = new LocalizationService();

/** Shorthand translation function */
export function t(key: string, params?: Record<string, string | number>): string {
  return i18n.t(key, params);
}
