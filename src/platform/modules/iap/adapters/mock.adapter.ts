import { logger } from '@platform/core/error';
import { getAllProductIds, getProductById } from '../config/iap.config';
import type { IAPProvider, ProviderProduct, ProviderPurchase } from '../types/iap.types';

const MOCK_PRODUCTS: ProviderProduct[] = [
  {
    id: 'remove_ads',
    type: 'non_consumable',
    title: 'Remove Ads',
    description: 'Permanent ad removal',
    price: '$4.99',
    currency: 'USD',
    priceAmount: 4.99,
  },
];

export class MockIapAdapter implements IAPProvider {
  readonly name = 'mock';

  private restoredPurchases: ProviderPurchase[] = [];

  async initialize(): Promise<void> {
    logger.info('[IAP] Mock adapter initialized');
  }

  async getProducts(): Promise<ProviderProduct[]> {
    const registeredIds = new Set(getAllProductIds());
    return MOCK_PRODUCTS.filter((product) => registeredIds.has(product.id));
  }

  async purchase(productId: string): Promise<ProviderPurchase> {
    const product = MOCK_PRODUCTS.find((p) => p.id === productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 800));

    const purchase: ProviderPurchase = {
      productId,
      transactionId: `mock_tx_${Date.now()}`,
      receipt: `mock_receipt_${productId}`,
      purchaseTime: Date.now(),
    };

    this.restoredPurchases = [
      ...this.restoredPurchases.filter((p) => p.productId !== productId),
      purchase,
    ];

    return purchase;
  }

  async restore(): Promise<ProviderPurchase[]> {
    logger.info('[IAP] Mock restore', { count: this.restoredPurchases.length });
    return [...this.restoredPurchases];
  }

  async fetchEntitlements(): Promise<string[]> {
    const entitlements = new Set<string>();
    for (const purchase of this.restoredPurchases) {
      const product = getProductById(purchase.productId);
      if (product) entitlements.add(product.entitlement);
    }
    return [...entitlements];
  }

  /** Test helper — seed restore data without going through purchase flow. */
  seedPurchase(productId: string): void {
    this.restoredPurchases = [
      ...this.restoredPurchases.filter((p) => p.productId !== productId),
      {
        productId,
        transactionId: `mock_seed_${Date.now()}`,
        receipt: `mock_receipt_${productId}`,
        purchaseTime: Date.now(),
      },
    ];
  }
}
