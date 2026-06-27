import { MockIapAdapter } from './mock.adapter';
import { RevenueCatAdapter, type RevenueCatAdapterConfig } from './revenuecat.adapter';
import type { IAPProvider } from '../types/iap.types';

export type IapProviderName = 'mock' | 'revenuecat';

export interface CreateIapProviderOptions {
  revenueCat?: RevenueCatAdapterConfig;
}

export function createIapProvider(
  name: IapProviderName,
  options: CreateIapProviderOptions = {}
): IAPProvider {
  switch (name) {
    case 'revenuecat':
      if (!options.revenueCat?.apiKey) {
        throw new Error('RevenueCat API key is required');
      }
      return new RevenueCatAdapter(options.revenueCat);
    case 'mock':
    default:
      return new MockIapAdapter();
  }
}

export { MockIapAdapter } from './mock.adapter';
export { RevenueCatAdapter } from './revenuecat.adapter';
export type { RevenueCatAdapterConfig } from './revenuecat.adapter';
