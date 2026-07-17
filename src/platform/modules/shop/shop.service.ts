import catalog from './catalog.json';
import { logger } from '@platform/core/error';
import { eventBus } from '@platform/core/events';
import { usePlatformStore } from '@platform/core/state';
import type { ProductKey } from '@platform/modules/iap';
import { iap, getProductByKey } from '@platform/modules/iap';

type ShopItemType = 'skin' | 'boost' | 'entitlement';

export interface ShopItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  duration?: number;
  type: ShopItemType;
  description: string;
  productKey?: ProductKey;
  currency: 'iap' | 'coins';
}

class ShopService {
  private items: ShopItem[] = catalog.items as ShopItem[];

  getItems(type?: ShopItemType): ShopItem[] {
    if (!type) return this.items;
    return this.items.filter((item) => item.type === type);
  }

  getItem(id: string): ShopItem | undefined {
    return this.items.find((item) => item.id === id);
  }

  isOwned(id: string): boolean {
    const item = this.getItem(id);
    if (!item) return false;

    if (item.type === 'entitlement' && item.productKey) {
      const product = getProductByKey(item.productKey);
      return iap.has(product.entitlement);
    }

    return !!usePlatformStore.getState().inventory.items[id];
  }

  async purchase(itemId: string): Promise<boolean> {
    const item = this.getItem(itemId);
    if (!item) {
      logger.warn(`[Shop] Item not found: ${itemId}`);
      return false;
    }

    if (item.type === 'skin' && this.isOwned(itemId)) {
      return false;
    }

    if (item.type === 'entitlement' && item.productKey) {
      if (this.isOwned(itemId)) return false;

      const product = getProductByKey(item.productKey);
      const result = await iap.purchase(product);

      if (result.success) {
        eventBus.emit('shop:purchase', { itemId, price: item.price });
        return true;
      }

      if (!result.cancelled) {
        logger.error('[Shop] IAP purchase failed', result.error);
      }
      return false;
    }

    if (item.currency === 'coins') {
      const coinsBefore = usePlatformStore.getState().currency.coins;
      await eventBus.emitAsync('coin:spend', { amount: item.price, reason: `shop:${itemId}` });
      if (usePlatformStore.getState().currency.coins === coinsBefore) return false;
    } else {
      return false;
    }

    this.grantItem(item);
    eventBus.emit('shop:purchase', { itemId, price: item.price });
    return true;
  }

  async restore(): Promise<number> {
    const result = await iap.restore();
    return result.restoredEntitlements.length;
  }

  private grantItem(item: ShopItem): void {
    const store = usePlatformStore.getState();

    if (item.type === 'skin' || item.type === 'boost') {
      store.addItem(item.id);
    }
  }
}

export const shop = new ShopService();
