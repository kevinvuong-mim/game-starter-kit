/** IAP event names — subscribe via eventBus in Phaser scenes / UI. */
export const IAP_EVENTS = {
  PURCHASE_SUCCESS: 'iap:purchase:success',
  PURCHASE_FAILED: 'iap:purchase:failed',
  PURCHASE_RESTORED: 'iap:restore:success',
  ENTITLEMENT_CHANGED: 'iap:entitlement:changed',
} as const;

export type IapEventName = (typeof IAP_EVENTS)[keyof typeof IAP_EVENTS];

export interface IapPurchaseSuccessPayload {
  productId: string;
  entitlement: string;
}

export interface IapPurchaseFailedPayload {
  productId: string;
  cancelled: boolean;
  error?: string;
}

export interface IapRestoreSuccessPayload {
  restoredEntitlements: string[];
}

export interface IapEntitlementChangedPayload {
  entitlement: string;
  active: boolean;
  entitlements: string[];
}
