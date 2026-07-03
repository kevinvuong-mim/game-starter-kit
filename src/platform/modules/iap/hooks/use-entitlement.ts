import { iap } from '../services/iap.service';
import { eventBus } from '@platform/core/events';
import { IAP_EVENTS } from '../events/iap.events';

/**
 * Subscribe to entitlement changes — useful for Phaser UI that must react without polling storage.
 */
export function useEntitlement(
  entitlement: string,
  listener: (active: boolean) => void
): () => void {
  listener(iap.has(entitlement));

  return eventBus.on(IAP_EVENTS.ENTITLEMENT_CHANGED, ({ entitlement: changed, active }) => {
    if (changed === entitlement) {
      listener(active);
    }
  });
}

/**
 * Subscribe to all entitlement changes.
 */
export function onEntitlementsChanged(listener: (entitlements: string[]) => void): () => void {
  listener(iap.getEntitlements());

  return eventBus.on(IAP_EVENTS.ENTITLEMENT_CHANGED, ({ entitlements }) => {
    listener(entitlements);
  });
}
