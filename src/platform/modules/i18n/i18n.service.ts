import { logger } from '@platform/core/error';
import { storage } from '@platform/core/storage';
import { usePlatformStore } from '@platform/core/state';

interface TranslationNode {
  [key: string]: string | TranslationNode;
}

const SUPPORTED_LANGUAGES = ['en', 'vi'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Lazy loaders — each locale is a separate chunk in production builds */
const LOCALE_LOADERS: Record<SupportedLanguage, () => Promise<{ default: TranslationNode }>> = {
  en: () => import('./locales/en.json'),
  vi: () => import('./locales/vi.json'),
};

export class LocalizationService {
  private catalogs = new Map<string, TranslationNode>();
  private fallbackLanguage: SupportedLanguage = 'en';
  private currentLanguage: SupportedLanguage = 'en';

  async init(language?: string): Promise<void> {
    await this.loadLanguage(this.fallbackLanguage);

    const lang = this.normalizeLanguage(language ?? usePlatformStore.getState().settings.language);
    await this.setLanguage(lang);
  }

  async setLanguage(language: string): Promise<void> {
    const lang = this.normalizeLanguage(language);

    if (!this.catalogs.has(lang)) {
      await this.loadLanguage(lang);
    }

    if (!this.catalogs.has(lang)) {
      logger.warn(`[i18n] Language unavailable: ${language}, using ${this.fallbackLanguage}`);
      this.currentLanguage = this.fallbackLanguage;
      return;
    }

    this.currentLanguage = lang;
    usePlatformStore.getState().updateSettings({ language: lang });
    await storage.save('settings:language', lang);
    logger.info(`[i18n] Language set to: ${lang}`);
  }

  private normalizeLanguage(language: string): SupportedLanguage {
    const code = language.split('-')[0].toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(code as SupportedLanguage)) {
      return code as SupportedLanguage;
    }
    return this.fallbackLanguage;
  }

  private async loadLanguage(language: string): Promise<void> {
    if (this.catalogs.has(language)) return;

    const loader = LOCALE_LOADERS[language as SupportedLanguage];
    if (!loader) {
      logger.warn(`[i18n] Unsupported language: ${language}`);
      return;
    }

    try {
      const module = await loader();
      this.catalogs.set(language, module.default);
      logger.debug(`[i18n] Loaded locale: ${language}`);
    } catch (error) {
      logger.warn(`[i18n] Failed to load language: ${language}`, error);
    }
  }

  t(key: string, params?: Record<string, string | number>): string {
    const catalog = this.catalogs.get(this.currentLanguage);
    const fallback = this.catalogs.get(this.fallbackLanguage);

    const value = this.resolve(key, catalog) ?? this.resolve(key, fallback) ?? key;

    if (!params) return value;

    return Object.entries(params).reduce(
      (str, [k, v]) => str.replace(new RegExp(`{{${k}}}`, 'g'), String(v)),
      value
    );
  }

  private resolve(key: string, map?: TranslationNode): string | undefined {
    if (!map) return undefined;

    const parts = key.split('.');
    let current: string | TranslationNode = map;

    for (const part of parts) {
      if (typeof current !== 'object' || current === null) return undefined;
      current = current[part];
      if (current === undefined) return undefined;
    }

    return typeof current === 'string' ? current : undefined;
  }

  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return [...SUPPORTED_LANGUAGES];
  }

  getFallbackLanguage(): SupportedLanguage {
    return this.fallbackLanguage;
  }
}

export const i18n = new LocalizationService();

/** Shorthand translation function */
export function t(key: string, params?: Record<string, string | number>): string {
  return i18n.t(key, params);
}
