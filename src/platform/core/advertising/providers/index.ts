import type { IAdsProvider } from '../types';
import { MockAdsProvider } from './MockAdsProvider';
import { AdMobAdsProvider } from './AdMobAdsProvider';

export type AdsProviderName = 'mock' | 'admob';

export function createAdsProvider(name: AdsProviderName): IAdsProvider {
  switch (name) {
    case 'admob':
      return new AdMobAdsProvider();
    case 'mock':
    default:
      return new MockAdsProvider();
  }
}
