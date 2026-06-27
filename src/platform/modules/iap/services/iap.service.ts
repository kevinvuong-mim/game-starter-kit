import { logger } from '@platform/core/error';
import { eventBus } from '@platform/core/events';
import type { IEventBus } from '@platform/core/events';
import { getConfig } from '@platform/core/config';
import { IAP_PURCHASE_TIMEOUT_MS, PRODUCTS, getProductById } from '../config/iap.config';
import { MockIapAdapter } from '../adapters/mock.adapter';
import { purchaseStorage, type PurchaseStorage } from '../storage/purchase.storage';
import { IAP_EVENTS } from '../events/iap.events';
import type {
  IAPProvider,
  IapInitState,
  ProductDefinition,
  PurchaseResult,
  RestoreResult,
} from '../types/iap.types';
import { IapError } from '../types/iap.types';

export interface IapServiceDeps {
  storage?: PurchaseStorage;
  emit?: IEventBus['emit'];
}

export class IapService {
  private provider: IAPProvider | null = null;
  private enabled = true;
  private ready = false;
  private initPromise: Promise<void> | null = null;
  private purchasing = false;
  private restoring = false;
  private authorityWarningLogged = false;
  private entitlements = new Set<string>();
  private initState: IapInitState = { loading: false, ready: false, error: null };

  private readonly storage: PurchaseStorage;
  private readonly emit: typeof eventBus.emit;

  constructor(deps: IapServiceDeps = {}) {
    this.storage = deps.storage ?? purchaseStorage;
    this.emit = deps.emit ?? eventBus.emit.bind(eventBus);
  }

  setProvider(provider: IAPProvider): void {
    this.provider = provider;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled && getConfig().iapEnabled;
  }

  getInitState(): IapInitState {
    return { ...this.initState };
  }

  /** Initialize IAP once — safe to call multiple times. */
  async initialize(): Promise<void> {
    if (this.ready) return;
    if (this.initPromise) return this.initPromise;

    this.initState = { loading: true, ready: false, error: null };
    this.initPromise = this.doInitialize();

    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async doInitialize(): Promise<void> {
    try {
      logger.info('[IAP] Initializing...');

      const stored = await this.storage.load();
      this.applyEntitlements(stored, { emitChanges: false });
      this.logClientAuthorityWarning();

      if (!this.provider) {
        this.provider = new MockIapAdapter();
      }

      await this.provider.initialize();

      if (this.provider instanceof MockIapAdapter) {
        for (const entitlement of stored) {
          const product = Object.values(PRODUCTS).find((p) => p.entitlement === entitlement);
          if (product) this.provider.seedPurchase(product.id);
        }
      }

      const remoteEntitlements = await this.provider.fetchEntitlements();
      for (const entitlement of remoteEntitlements) {
        if (!this.has(entitlement)) {
          await this.grantEntitlement(entitlement, { emitChange: false });
        }
      }

      this.ready = true;
      this.initState = { loading: false, ready: true, error: null };
      logger.info('[IAP] Ready', { provider: this.provider.name, entitlements: stored });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'IAP initialization failed';
      this.initState = { loading: false, ready: false, error: message };
      logger.error('[IAP] Initialization failed', error);
      throw error;
    }
  }

  has(entitlement: string): boolean {
    return this.entitlements.has(entitlement);
  }

  getEntitlements(): string[] {
    return [...this.entitlements];
  }

  /** Convenience — true when remove_ads entitlement is active. */
  isPremium(): boolean {
    return this.has('remove_ads');
  }

  async purchase(product: ProductDefinition): Promise<PurchaseResult> {
    if (!this.isEnabled()) {
      return { success: false, cancelled: false, error: 'IAP not available' };
    }

    if (!this.ready || !this.provider) {
      return { success: false, cancelled: false, error: 'IAP not initialized' };
    }

    if (this.purchasing) {
      return { success: false, cancelled: false, error: 'Purchase already in progress' };
    }

    if (product.type === 'non_consumable' && this.has(product.entitlement)) {
      return { success: false, cancelled: false, error: 'Already owned' };
    }

    this.purchasing = true;
    logger.info('[IAP] Purchase started', { productId: product.id });

    try {
      const providerPurchase = await this.withTimeout(
        this.provider.purchase(product.id),
        IAP_PURCHASE_TIMEOUT_MS,
        'Purchase timed out'
      );

      await this.grantEntitlement(product.entitlement);

      this.emit(IAP_EVENTS.PURCHASE_SUCCESS, {
        productId: providerPurchase.productId,
        entitlement: product.entitlement,
      });

      logger.info('[IAP] Purchase succeeded', {
        productId: product.id,
        entitlement: product.entitlement,
      });

      return { success: true, cancelled: false, entitlement: product.entitlement };
    } catch (error) {
      const result = this.normalizePurchaseError(error, product.id);
      this.emit(IAP_EVENTS.PURCHASE_FAILED, {
        productId: product.id,
        cancelled: result.cancelled,
        error: result.error,
      });
      logger.warn('[IAP] Purchase failed', { productId: product.id, ...result });
      return result;
    } finally {
      this.purchasing = false;
    }
  }

  async restore(): Promise<RestoreResult> {
    if (!this.ready || !this.provider) {
      return { success: false, restoredEntitlements: [], error: 'IAP not initialized' };
    }

    if (this.restoring) {
      return { success: false, restoredEntitlements: [], error: 'Restore already in progress' };
    }

    this.restoring = true;
    logger.info('[IAP] Restore started');

    try {
      const purchases = await this.provider.restore();
      const restoredEntitlements: string[] = [];

      for (const purchase of purchases) {
        const product = getProductById(purchase.productId);
        if (!product?.entitlement) continue;

        const wasNew = !this.has(product.entitlement);
        await this.grantEntitlement(product.entitlement, { emitChange: wasNew });
        if (wasNew) restoredEntitlements.push(product.entitlement);
      }

      this.emit(IAP_EVENTS.PURCHASE_RESTORED, { restoredEntitlements });
      logger.info('[IAP] Restore complete', { restoredEntitlements });

      return { success: true, restoredEntitlements };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Restore failed';
      logger.error('[IAP] Restore failed', error);
      return { success: false, restoredEntitlements: [], error: message };
    } finally {
      this.restoring = false;
    }
  }

  isPurchasing(): boolean {
    return this.purchasing;
  }

  isRestoring(): boolean {
    return this.restoring;
  }

  private async grantEntitlement(
    entitlement: string,
    options: { emitChange?: boolean } = {}
  ): Promise<void> {
    const { emitChange = true } = options;
    const wasActive = this.has(entitlement);

    this.entitlements.add(entitlement);
    await this.storage.add(entitlement);

    if (emitChange && !wasActive) {
      this.emitEntitlementChanged(entitlement, true);
    }
  }

  private applyEntitlements(entitlements: string[], options: { emitChanges: boolean }): void {
    for (const entitlement of entitlements) {
      const wasActive = this.entitlements.has(entitlement);
      this.entitlements.add(entitlement);
      if (options.emitChanges && !wasActive) {
        this.emitEntitlementChanged(entitlement, true);
      }
    }
  }

  private emitEntitlementChanged(entitlement: string, active: boolean): void {
    this.emit(IAP_EVENTS.ENTITLEMENT_CHANGED, {
      entitlement,
      active,
      entitlements: this.getEntitlements(),
    });
  }

  private normalizePurchaseError(error: unknown, _productId: string): PurchaseResult {
    if (error instanceof Error && error.name === 'IapError') {
      const iapError = error as IapError;
      return {
        success: false,
        cancelled: iapError.code === 'cancelled',
        error: iapError.message,
      };
    }

    const message = error instanceof Error ? error.message : 'Purchase failed';
    const cancelled =
      /cancel/i.test(message) ||
      /user.*denied/i.test(message) ||
      /SKErrorDomain error 2/i.test(message);

    if (/timed out/i.test(message)) {
      return { success: false, cancelled: false, error: message };
    }

    return { success: false, cancelled, error: message };
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), ms);
      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error: unknown) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private logClientAuthorityWarning(): void {
    if (this.authorityWarningLogged || !this.isEnabled()) {
      return;
    }

    this.authorityWarningLogged = true;
    logger.warn(
      '[IAP] Entitlements are client-authoritative in this starter kit; add backend validation before treating remove_ads as tamper-resistant.'
    );
  }
}

export const iap = new IapService();
