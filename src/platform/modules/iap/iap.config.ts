import type { ProductDefinition } from './iap.types';

/**
 * Product registry — add new products here without changing IapService logic.
 * Map store / Play Console product IDs to entitlements.
 */
export const PRODUCTS = {
  REMOVE_ADS: {
    id: 'remove_ads',
    type: 'non_consumable',
    entitlement: 'remove_ads',
  },
} as const satisfies Record<string, ProductDefinition>;

export type ProductKey = keyof typeof PRODUCTS;

export const ENTITLEMENT_REMOVE_ADS = PRODUCTS.REMOVE_ADS.entitlement;

/** Default purchase timeout (ms). */
export const IAP_PURCHASE_TIMEOUT_MS = 60_000;

/** Dedicated storage key for entitlement persistence. */
export const IAP_STORAGE_KEY = 'iap-entitlements';

export function getProductById(productId: string): ProductDefinition | undefined {
  return Object.values(PRODUCTS).find((product) => product.id === productId);
}

export function getProductByKey(key: ProductKey): ProductDefinition {
  return PRODUCTS[key];
}

export function getAllProductIds(): string[] {
  return Object.values(PRODUCTS).map((product) => product.id);
}
