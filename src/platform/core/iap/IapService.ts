import { logger } from '../error';
import { apiClient } from '../api';
import { getConfig } from '../config';
import type { IapProduct, IapPurchase, IIapProvider, IapVerifyResult } from './types';

export class MockIapProvider implements IIapProvider {
  readonly name = 'mock';

  private products: IapProduct[] = [
    {
      price: '$0.99',
      currency: 'USD',
      id: 'coins_100',
      priceAmount: 0.99,
      type: 'consumable',
      title: '100 Coins',
      description: 'Small coin pack',
    },
    {
      price: '$3.99',
      id: 'coins_500',
      currency: 'USD',
      priceAmount: 3.99,
      type: 'consumable',
      title: '500 Coins',
      description: 'Medium coin pack',
    },
    {
      price: '$4.99',
      currency: 'USD',
      id: 'remove_ads',
      priceAmount: 4.99,
      title: 'Remove Ads',
      type: 'non_consumable',
      description: 'Permanent ad removal',
    },
  ];

  async init(): Promise<void> {
    logger.info('[IAP] Mock provider initialized');
  }

  async getProducts(): Promise<IapProduct[]> {
    return [...this.products];
  }

  async purchase(productId: string): Promise<IapPurchase> {
    const product = this.products.find((p) => p.id === productId);
    if (!product) throw new Error(`Product not found: ${productId}`);

    await new Promise((r) => setTimeout(r, 800));
    return {
      productId,
      transactionId: `mock_tx_${Date.now()}`,
      receipt: `mock_receipt_${productId}`,
      purchaseTime: Date.now(),
    };
  }

  async restore(): Promise<IapPurchase[]> {
    logger.info('[IAP] Mock restore - no purchases');
    return [];
  }

  async verify(receipt: string): Promise<IapVerifyResult> {
    return {
      valid: true,
      productId: receipt.replace('mock_receipt_', ''),
      transactionId: `verified_${Date.now()}`,
    };
  }

  async consume(_transactionId: string): Promise<void> {}
}

export class IapService {
  private provider: IIapProvider | null = null;
  private enabled = true;

  constructor() {
    this.enabled = getConfig().iapEnabled;
  }

  setProvider(provider: IIapProvider): void {
    this.provider = provider;
  }

  async init(): Promise<void> {
    if (!this.provider) {
      this.provider = new MockIapProvider();
    }
    await this.provider.init();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  async getProducts(): Promise<IapProduct[]> {
    if (!this.provider) return [];
    return this.provider.getProducts();
  }

  async purchase(productId: string): Promise<IapPurchase> {
    if (!this.enabled || !this.provider) {
      throw new Error('IAP not available');
    }

    const purchase = await this.provider.purchase(productId);

    if (getConfig().apiUrl) {
      try {
        await apiClient.post('/iap/verify', {
          platform: 'mock',
          receipt: purchase.receipt,
          productId: purchase.productId,
        });
      } catch (e) {
        logger.warn('[IAP] Server verification failed, using local verify', e);
        await this.provider.verify(purchase.receipt);
      }
    }

    return purchase;
  }

  async restore(): Promise<IapPurchase[]> {
    if (!this.provider) return [];
    return this.provider.restore();
  }

  async verify(receipt: string): Promise<IapVerifyResult> {
    if (!this.provider) throw new Error('IAP not initialized');
    return this.provider.verify(receipt);
  }
}

export const iap = new IapService();
