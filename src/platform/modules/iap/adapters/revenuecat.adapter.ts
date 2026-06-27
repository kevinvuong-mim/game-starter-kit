import {
  LOG_LEVEL,
  PRODUCT_CATEGORY,
  PRODUCT_TYPE,
  PURCHASES_ERROR_CODE,
  Purchases,
} from '@revenuecat/purchases-capacitor';
import type { CustomerInfo, PurchasesStoreProduct } from '@revenuecat/purchases-capacitor';
import { logger } from '@platform/core/error';
import { PRODUCTS, getAllProductIds, getProductById } from '../config/iap.config';
import type {
  IAPProvider,
  ProviderProduct,
  ProviderPurchase,
  ProductType,
} from '../types/iap.types';
import { IapError } from '../types/iap.types';

export interface RevenueCatAdapterConfig {
  apiKey: string;
  appUserId?: string;
  debug?: boolean;
}

const REGISTERED_ENTITLEMENTS = new Set<string>(
  Object.values(PRODUCTS).map((product) => product.entitlement)
);

export class RevenueCatAdapter implements IAPProvider {
  readonly name = 'revenuecat';

  private readonly config: RevenueCatAdapterConfig;
  private productCache = new Map<string, PurchasesStoreProduct>();
  private configured = false;

  constructor(config: RevenueCatAdapterConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('RevenueCat API key is missing');
    }

    await Purchases.setLogLevel({
      level: this.config.debug ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO,
    });

    await Purchases.configure({
      apiKey: this.config.apiKey,
      appUserID: this.config.appUserId ?? null,
    });

    this.configured = true;
    await this.refreshProductCache();
    logger.info('[IAP] RevenueCat adapter initialized');
  }

  async getProducts(): Promise<ProviderProduct[]> {
    await this.ensureConfigured();
    if (this.productCache.size === 0) {
      await this.refreshProductCache();
    }

    const registeredIds = new Set(getAllProductIds());
    return [...this.productCache.values()]
      .filter((product) => registeredIds.has(product.identifier))
      .map((product) => mapStoreProduct(product));
  }

  async purchase(productId: string): Promise<ProviderPurchase> {
    await this.ensureConfigured();

    const product = await this.getStoreProduct(productId);
    if (!product) {
      throw new IapError(`Product not found: ${productId}`, 'provider');
    }

    try {
      const result = await Purchases.purchaseStoreProduct({ product });
      return mapMakePurchaseResult(result, productId);
    } catch (error) {
      throw mapRevenueCatError(error);
    }
  }

  async restore(): Promise<ProviderPurchase[]> {
    await this.ensureConfigured();

    try {
      const { customerInfo } = await Purchases.restorePurchases();
      return mapCustomerInfoToPurchases(customerInfo);
    } catch (error) {
      throw mapRevenueCatError(error);
    }
  }

  async fetchEntitlements(): Promise<string[]> {
    await this.ensureConfigured();

    const { customerInfo } = await Purchases.getCustomerInfo();
    return extractKnownEntitlements(customerInfo);
  }

  private async ensureConfigured(): Promise<void> {
    if (!this.configured) {
      throw new Error('RevenueCat adapter not initialized');
    }
  }

  private async refreshProductCache(): Promise<void> {
    const productIds = getAllProductIds();
    if (productIds.length === 0) return;

    const { products } = await Purchases.getProducts({
      productIdentifiers: productIds,
      type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    });

    this.productCache.clear();
    for (const product of products) {
      this.productCache.set(product.identifier, product);
    }
  }

  private async getStoreProduct(productId: string): Promise<PurchasesStoreProduct | undefined> {
    const cached = this.productCache.get(productId);
    if (cached) return cached;

    const { products } = await Purchases.getProducts({
      productIdentifiers: [productId],
      type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    });

    const product = products[0];
    if (product) {
      this.productCache.set(product.identifier, product);
    }
    return product;
  }
}

function mapStoreProduct(product: PurchasesStoreProduct): ProviderProduct {
  return {
    id: product.identifier,
    type: mapProductType(product.productType),
    title: product.title,
    description: product.description,
    price: product.priceString,
    currency: product.currencyCode,
    priceAmount: product.price,
  };
}

function mapProductType(productType: PRODUCT_TYPE): ProductType {
  switch (productType) {
    case PRODUCT_TYPE.CONSUMABLE:
      return 'consumable';
    case PRODUCT_TYPE.NON_CONSUMABLE:
      return 'non_consumable';
    case PRODUCT_TYPE.AUTO_RENEWABLE_SUBSCRIPTION:
    case PRODUCT_TYPE.NON_RENEWABLE_SUBSCRIPTION:
    case PRODUCT_TYPE.PREPAID_SUBSCRIPTION:
      return 'subscription';
    default:
      return 'non_consumable';
  }
}

function mapMakePurchaseResult(
  result: {
    transaction: {
      transactionIdentifier: string;
      productIdentifier: string;
      purchaseDate: string;
    };
  },
  fallbackProductId: string
): ProviderPurchase {
  const purchaseDate = Date.parse(result.transaction.purchaseDate);
  return {
    productId: result.transaction.productIdentifier || fallbackProductId,
    transactionId: result.transaction.transactionIdentifier,
    receipt: result.transaction.transactionIdentifier,
    purchaseTime: Number.isNaN(purchaseDate) ? Date.now() : purchaseDate,
  };
}

function mapCustomerInfoToPurchases(customerInfo: CustomerInfo): ProviderPurchase[] {
  const purchases: ProviderPurchase[] = [];

  for (const entitlement of Object.values(customerInfo.entitlements.active)) {
    if (!getProductById(entitlement.productIdentifier)) continue;

    purchases.push({
      productId: entitlement.productIdentifier,
      transactionId: entitlement.identifier,
      receipt: entitlement.productIdentifier,
      purchaseTime: entitlement.latestPurchaseDateMillis,
    });
  }

  return purchases;
}

function extractKnownEntitlements(customerInfo: CustomerInfo): string[] {
  return Object.entries(customerInfo.entitlements.active)
    .filter(([entitlementId, info]) => info.isActive && REGISTERED_ENTITLEMENTS.has(entitlementId))
    .map(([entitlementId]) => entitlementId);
}

function mapRevenueCatError(error: unknown): IapError {
  if (isPurchasesError(error)) {
    if (error.userCancelled || error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return new IapError(error.message || 'Purchase cancelled', 'cancelled', error);
    }

    if (error.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
      return new IapError(error.message || 'Already owned', 'duplicate', error);
    }

    if (error.code === PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR) {
      return new IapError(error.message || 'Purchases not allowed', 'unavailable', error);
    }

    if (error.code === PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR) {
      return new IapError(error.message || 'Operation in progress', 'provider', error);
    }

    return new IapError(error.message || 'RevenueCat purchase failed', 'provider', error);
  }

  const message = error instanceof Error ? error.message : 'RevenueCat purchase failed';
  return new IapError(message, 'unknown', error);
}

interface PurchasesErrorLike {
  code: PURCHASES_ERROR_CODE;
  message: string;
  userCancelled?: boolean | null;
}

function isPurchasesError(error: unknown): error is PurchasesErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as PurchasesErrorLike).message === 'string'
  );
}
