import { logger } from '@platform/core/error';
import type { IEventBus } from '@platform/core/events';
import { navigationService } from '@platform/modules/navigation/navigation.service';

import { deepLinkService } from './deep-link.service';
import { buildDeepLinkSceneData } from './deep-link.model';

export class DeepLinkController {
  bind(events: IEventBus): () => void {
    const unsubs = [
      events.on('deeplink:open', (payload) => {
        logger.info('[DeepLink] Navigating from deeplink', {
          path: payload.path,
          scene: payload.scene,
        });
        navigationService.navigateToScene(payload.scene, buildDeepLinkSceneData(payload));
      }),

      events.on('boot:preload-complete', () => {
        deepLinkService.markBootComplete();
        deepLinkService.flushPendingDeepLink();
      }),
    ];

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }
}

export const deepLinkController = new DeepLinkController();
