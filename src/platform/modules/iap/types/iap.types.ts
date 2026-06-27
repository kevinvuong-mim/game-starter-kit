export type ProductType = 'non_consumable' | 'consumable' | 'subscription';

export interface ProductDefinition {
  id: string;
  type: ProductType;
  entitlement: string;
}

export interface ProviderProduct {
  id: string;
  type: ProductType;
  title: string;
  price: string;
  currency: string;
  description: string;
  priceAmount: number;
}

export interface ProviderPurchase {
  productId: string;
  transactionId: string;
  receipt: string;
  purchaseTime: number;
}

export interface PurchaseResult {
  success: boolean;
  cancelled: boolean;
  entitlement?: string;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  restoredEntitlements: string[];
  error?: string;
}

export interface IapInitState {
  loading: boolean;
  ready: boolean;
  error: string | null;
}

export interface StoredEntitlements {
  version: number;
  entitlements: string[];
  updatedAt: number;
}

export interface IAPProvider {
  readonly name: string;
  initialize(): Promise<void>;
  getProducts(): Promise<ProviderProduct[]>;
  purchase(productId: string): Promise<ProviderPurchase>;
  restore(): Promise<ProviderPurchase[]>;
  /** Sync active entitlements from the provider (RevenueCat CustomerInfo, mock cache). */
  fetchEntitlements(): Promise<string[]>;
}

export class IapError extends Error {
  constructor(
    message: string,
    readonly code: 'cancelled' | 'timeout' | 'unavailable' | 'duplicate' | 'provider' | 'unknown',
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'IapError';
  }
}
