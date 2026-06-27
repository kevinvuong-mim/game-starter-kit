export { iap, IapService } from './services/iap.service';
export type { IapServiceDeps } from './services/iap.service';

export {
  PRODUCTS,
  ENTITLEMENT_REMOVE_ADS,
  getProductById,
  getProductByKey,
} from './config/iap.config';
export type { ProductKey } from './config/iap.config';

export { purchaseStorage, PurchaseStorage } from './storage/purchase.storage';

export { IAP_EVENTS } from './events/iap.events';
export type {
  IapPurchaseSuccessPayload,
  IapPurchaseFailedPayload,
  IapRestoreSuccessPayload,
  IapEntitlementChangedPayload,
} from './events/iap.events';

export { useEntitlement, onEntitlementsChanged } from './hooks/use-entitlement';
export { bindIapController } from './iap.controller';

export { createIapProvider, MockIapAdapter, RevenueCatAdapter } from './adapters';
export type {
  IapProviderName,
  RevenueCatAdapterConfig,
  CreateIapProviderOptions,
} from './adapters';

export type {
  ProductDefinition,
  ProductType,
  ProviderProduct,
  ProviderPurchase,
  PurchaseResult,
  RestoreResult,
  IAPProvider,
  IapInitState,
} from './types/iap.types';

export { IapError } from './types/iap.types';
