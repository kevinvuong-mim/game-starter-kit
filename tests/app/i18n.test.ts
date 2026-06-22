import { describe, it, expect, beforeEach } from 'vitest';
import { LocalizationService } from '@app/modules/localization/i18n.service';
import { usePlatformStore } from '@core/state';

describe('LocalizationService', () => {
  let i18n: LocalizationService;

  beforeEach(() => {
    usePlatformStore.getState().reset();
    i18n = new LocalizationService();
  });

  it('loads English translations', async () => {
    await i18n.init('en');
    expect(i18n.t('home.play')).toBe('Play');
    expect(i18n.t('home.title')).toBe('Game Starter Kit');
  });

  it('loads Vietnamese translations', async () => {
    await i18n.init('vi');
    expect(i18n.t('home.play')).toBe('Chơi');
    expect(i18n.t('home.title')).toBe('Bộ Khởi Động Game');
  });

  it('interpolates params', async () => {
    await i18n.init('en');
    expect(i18n.t('game.score', { score: 42 })).toBe('Score: 42');
  });

  it('falls back to English for unknown keys', async () => {
    await i18n.init('vi');
    expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('switches language at runtime', async () => {
    await i18n.init('en');
    expect(i18n.t('home.shop')).toBe('Shop');

    await i18n.setLanguage('vi');
    expect(i18n.t('home.shop')).toBe('Cửa hàng');
    expect(i18n.getCurrentLanguage()).toBe('vi');
  });
});
