import { guest } from './guest.service';
import { usePlatformStore } from '@platform/core/state';

export function syncGuestToStore(): void {
  const guestId = guest.getGuestId();
  if (!guestId) return;

  // Only overwrite displayName when guest credentials carry a real name.
  // Falling back to 'Player' would wipe a hydrated custom name from save data.
  const guestName = guest.getName();
  usePlatformStore.getState().setUser({
    id: guestId,
    ...(guestName ? { displayName: guestName } : {}),
  });
}

export function bindGuestStoreSync(): () => void {
  return guest.onReady(() => syncGuestToStore());
}
