import { logger } from '@platform/core/error';
import type { IEventBus } from '@platform/core/events';
import { saveService } from '@platform/modules/save/save.service';
import { missions, type MissionService } from './mission.service';
import { missionTracker, type MissionTracker } from './mission.tracker';

export class MissionController {
  constructor(
    private readonly service: MissionService = missions,
    private readonly tracker: MissionTracker = missionTracker
  ) {}

  bind(events: IEventBus): () => void {
    const unsubs = [
      this.tracker.bind(events, (type, amount) => {
        void this.handleProgress(type, amount);
      }),

      events.on('app:resume', () => {
        void this.handleResets();
      }),
    ];

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }

  private async handleProgress(type: string, amount: number): Promise<void> {
    const updated = this.service.incrementProgressByType(type, amount);
    if (!updated) return;

    await saveService.saveLocal();
    logger.debug('[MissionController] Progress saved', { type, amount });
  }

  private async handleResets(): Promise<void> {
    const changed = this.service.applyResets();
    if (!changed) return;

    await saveService.saveLocal();
    logger.debug('[MissionController] Reset saved');
  }
}

export const missionController = new MissionController();
