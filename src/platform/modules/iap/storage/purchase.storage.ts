import { logger } from '@platform/core/error';
import { storage } from '@platform/core/storage';
import { IAP_STORAGE_KEY } from '../config/iap.config';
import type { StoredEntitlements } from '../types/iap.types';

const STORAGE_VERSION = 1;

export class PurchaseStorage {
  private cache: StoredEntitlements | null = null;

  async load(): Promise<string[]> {
    if (this.cache) {
      return [...this.cache.entitlements];
    }

    const durable = storage.getDurableProviderType();
    const data = await storage.load<StoredEntitlements>(IAP_STORAGE_KEY, durable);

    if (!data?.entitlements) {
      this.cache = { version: STORAGE_VERSION, entitlements: [], updatedAt: Date.now() };
      return [];
    }

    this.cache = {
      version: data.version ?? STORAGE_VERSION,
      entitlements: [...new Set(data.entitlements)],
      updatedAt: data.updatedAt ?? Date.now(),
    };

    logger.debug('[IAP] Entitlements loaded', { count: this.cache.entitlements.length });
    return [...this.cache.entitlements];
  }

  async save(entitlements: string[]): Promise<void> {
    const unique = [...new Set(entitlements)];
    this.cache = {
      version: STORAGE_VERSION,
      entitlements: unique,
      updatedAt: Date.now(),
    };

    const durable = storage.getDurableProviderType();
    await storage.save(IAP_STORAGE_KEY, this.cache, durable);
    logger.debug('[IAP] Entitlements saved', { count: unique.length });
  }

  async add(entitlement: string): Promise<void> {
    const current = await this.load();
    if (current.includes(entitlement)) return;
    await this.save([...current, entitlement]);
  }

  async sync(entitlements: string[]): Promise<void> {
    await this.save(entitlements);
  }

  getCached(): string[] {
    return this.cache ? [...this.cache.entitlements] : [];
  }
}

export const purchaseStorage = new PurchaseStorage();
