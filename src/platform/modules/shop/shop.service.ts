import catalog from './catalog.json';
import { usePlatformStore } from '@platform/core/state';
import { eventBus } from '@platform/core/events';
import { iap } from '@platform/core/iap';
import { logger } from '@platform/core/error';

export type ShopItemType = 'skin' | 'boost' | 'currency';

export interface ShopItem {
  id: string;
  type: ShopItemType;
  name: string;
  description: string;
  price: number;
  currency: 'coins' | 'gems' | 'iap';
  icon: string;
  iapProductId?: string;
  duration?: number;
  reward?: { coins?: number; gems?: number };
}

export class ShopService {
  private items: ShopItem[] = catalog.items as ShopItem[];

  getItems(type?: ShopItemType): ShopItem[] {
    if (!type) return this.items;
    return this.items.filter((item) => item.type === type);
  }

  getItem(id: string): ShopItem | undefined {
    return this.items.find((item) => item.id === id);
  }

  isOwned(id: string): boolean {
    return !!usePlatformStore.getState().inventory.items[id];
  }

  async purchase(itemId: string): Promise<boolean> {
    const item = this.getItem(itemId);
    if (!item) {
      logger.warn(`[Shop] Item not found: ${itemId}`);
      return false;
    }

    const store = usePlatformStore.getState();

    if (item.type === 'skin' && this.isOwned(itemId)) {
      return false;
    }

    if (item.currency === 'iap' && item.iapProductId) {
      try {
        const purchase = await iap.purchase(item.iapProductId);
        this.grantItem(item);
        eventBus.emit('shop:purchase', { itemId, price: item.price });
        eventBus.emit('iap:purchase', { productId: purchase.productId });
        return true;
      } catch (e) {
        logger.error('[Shop] IAP purchase failed', e);
        return false;
      }
    }

    const spent =
      item.currency === 'coins'
        ? store.spendCoins(item.price)
        : item.currency === 'gems'
          ? store.spendGems(item.price)
          : false;

    if (!spent) return false;

    this.grantItem(item);
    eventBus.emit('shop:purchase', { itemId, price: item.price });
    return true;
  }

  async restore(): Promise<number> {
    const purchases = await iap.restore();
    let restored = 0;

    for (const purchase of purchases) {
      const item = this.items.find((i) => i.iapProductId === purchase.productId);
      if (item) {
        this.grantItem(item);
        restored++;
      }
    }

    eventBus.emit('shop:restore', undefined);
    return restored;
  }

  private grantItem(item: ShopItem): void {
    const store = usePlatformStore.getState();

    if (item.type === 'skin' || item.type === 'boost') {
      store.addItem(item.id);
    }

    if (item.reward?.coins) store.addCoins(item.reward.coins);
    if (item.reward?.gems) store.addGems(item.reward.gems);
  }
}

export const shop = new ShopService();
