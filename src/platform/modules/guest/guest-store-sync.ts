import { guest } from './guest.service';
import { usePlatformStore } from '@platform/core/state';

export function syncGuestToStore(): void {
  const guestId = guest.getGuestId();
  if (!guestId) return;

  usePlatformStore.getState().setUser({
    id: guestId,
    displayName: guest.getName() ?? 'Player',
  });
}

export function bindGuestStoreSync(): () => void {
  return guest.onReady(() => syncGuestToStore());
}
