import {
  trackAdReward,
  trackGameOver,
  trackPurchase,
  trackGameStart,
  trackSessionEnd,
  trackMissionComplete,
} from '@platform/core/analytics/events';
import { Capacitor } from '@capacitor/core';
import { logger } from '@platform/core/error';
import { services } from '@platform/core/services';
import { usePlatformStore } from '@platform/core/state';
import { shop } from '@platform/modules/shop/shop.service';
import { hideNativeSplash } from '@platform/bootstrap/capacitor';
import { saveService } from '@platform/modules/save/save.service';

const { events, analytics } = services;

export function bindAppEvents(): () => void {
  const unsubs = [
    events.on('analytics', ({ event, params }) => {
      analytics.track(event, params);
    }),

    events.on('app:ready', () => {
      logger.info('[App] Game shell ready');
      void hideNativeSplash();
      events.emit('ad:show:request', { placement: 'APP_START' });
      events.emit('ad:show:request', { placement: 'HOME' });
    }),

    events.on('coin:add', ({ amount }) => {
      const multiplier = shop.getActiveCoinMultiplier();
      usePlatformStore.getState().addCoins(amount * multiplier);
    }),

    events.on('coin:spend', ({ amount }) => {
      usePlatformStore.getState().spendCoins(amount);
    }),

    events.on('score:update', ({ score }) => {
      usePlatformStore.getState().setHighScore(score);
    }),

    events.on('game:start', () => {
      usePlatformStore.getState().incrementGamesPlayed();
      trackGameStart();
    }),

    events.on('game:over', async ({ score, duration, jumps }) => {
      // Apply score before save — do not rely on a later score:update ordering.
      usePlatformStore.getState().setHighScore(score);
      trackGameOver({ score, duration, jumps });
      events.emit('ad:show:request', { placement: 'GAME_OVER' });
      await saveService.saveLocal();
    }),

    events.on('mission:complete', ({ missionId }) => {
      trackMissionComplete({ missionId });
    }),

    events.on('settings:change', () => {
      void saveService.saveLocal();
    }),

    events.on('shop:purchase', ({ itemId, price }) => {
      trackPurchase({ itemId, price });
      void saveService.saveLocal();
    }),

    events.on('shop:equip', () => {
      void saveService.saveLocal();
    }),

    events.on('shop:restore', () => {
      void saveService.saveLocal();
    }),

    events.on('game:destroy', () => {
      void saveService.saveLocal();
    }),

    events.on('ad:reward', ({ placement, reward }) => {
      trackAdReward({ placement, reward: JSON.stringify(reward) });
    }),
  ];

  return () => {
    for (const unsub of unsubs) unsub();
  };
}

export function bindAppLifecycle(): () => void {
  if (typeof document === 'undefined' || Capacitor.isNativePlatform()) {
    return () => {};
  }

  const onVisibilityChange = () => {
    if (document.hidden) {
      trackSessionEnd();
      events.emit('app:pause', undefined);
      void saveService.saveLocal();
      void analytics.flush();
    } else {
      events.emit('app:resume', undefined);
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
