import type { IAPProvider } from './iap.types';
import { MockIapAdapter } from './iap.mock-adapter';
import { RevenueCatAdapter, type RevenueCatAdapterConfig } from './iap.revenuecat-adapter';

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

export { MockIapAdapter } from './iap.mock-adapter';
export { RevenueCatAdapter } from './iap.revenuecat-adapter';
export type { RevenueCatAdapterConfig } from './iap.revenuecat-adapter';
