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

const DEFAULT_PLAYER_COLOR = 0x4a90d9;

const SKIN_COLORS: Record<string, number> = {
  skin_blue: 0x4a90d9,
  skin_gold: 0xffd700,
};

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

    if (item.type === 'boost') {
      return this.getQuantity(id) > 0;
    }

    return !!usePlatformStore.getState().inventory.items[id];
  }

  isEquipped(id: string): boolean {
    return !!usePlatformStore.getState().inventory.items[id]?.equipped;
  }

  getQuantity(id: string): number {
    return usePlatformStore.getState().inventory.items[id]?.quantity ?? 0;
  }

  /** Consume one use of a boost skill. Returns false if none left. */
  consumeBoost(id: string): boolean {
    if (this.getQuantity(id) <= 0) return false;
    usePlatformStore.getState().removeItem(id, 1);
    return true;
  }

  /** Timed coin multiplier is unused; skills are quantity-based. */
  getActiveCoinMultiplier(_now = Date.now()): number {
    return 1;
  }

  getEquippedSkinColor(): number {
    const items = usePlatformStore.getState().inventory.items;
    for (const [id, item] of Object.entries(items)) {
      if (item.equipped && SKIN_COLORS[id] !== undefined) {
        return SKIN_COLORS[id];
      }
    }
    return DEFAULT_PLAYER_COLOR;
  }

  equipSkin(id: string): boolean {
    const item = this.getItem(id);
    if (!item || item.type !== 'skin' || !this.isOwned(id)) {
      return false;
    }
    usePlatformStore.getState().equipItem(id);
    eventBus.emit('shop:equip', { itemId: id });
    return true;
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

    if (item.type === 'skin') {
      store.addItem(item.id);
      store.equipItem(item.id);
      return;
    }

    if (item.type === 'boost') {
      store.addItem(item.id, 1);
    }
  }
}

export const shop = new ShopService();
