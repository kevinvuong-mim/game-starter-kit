import { Capacitor } from '@capacitor/core';

import { services } from '@platform/core/services';
import { saveService } from '@platform/modules/save/save.service';
import { trackSessionEnd } from '@platform/core/analytics/events';

const { events, analytics } = services;

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
