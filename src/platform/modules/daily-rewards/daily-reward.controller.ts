import { trackDailyClaim } from '@platform/core/analytics/events';
import { logger } from '@platform/core/error';
import type { IEventBus } from '@platform/core/events';
import { saveService } from '@platform/modules/save/save.service';

import { dailyRewards, type DailyRewardService } from './daily-reward.service';

export class DailyRewardController {
  constructor(private readonly service: DailyRewardService = dailyRewards) {}

  bind(events: IEventBus): () => void {
    const unsubs = [
      events.on('daily:status:request', () => {
        this.emitStatus(events);
      }),

      events.on('daily:progress:request', () => {
        this.emitProgress(events);
      }),

      events.on('daily:claim:request', async () => {
        await this.handleClaim(events);
      }),

      events.on('app:resume', () => {
        this.service.refreshSessionTimestamp();
        this.emitStatus(events);
        this.emitProgress(events);
      }),
    ];

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }

  private emitStatus(events: IEventBus): void {
    events.emit('daily:status', {
      canClaim: this.service.canClaim(),
      timeManipulated: this.service.getRewardProgress().timeManipulated,
    });
  }

  private emitProgress(events: IEventBus): void {
    events.emit('daily:progress', this.service.getRewardProgress());
  }

  private async handleClaim(events: IEventBus): Promise<void> {
    const result = await this.service.claim();

    if (!result) {
      const progress = this.service.getRewardProgress();
      events.emit('daily:claim:result', {
        success: false,
        message: progress.timeManipulated
          ? 'time_manipulated'
          : progress.canClaim
            ? 'claim_failed'
            : 'already_claimed',
      });
      this.emitProgress(events);
      return;
    }

    trackDailyClaim({
      day: result.day,
      coins: result.coins,
      rewardType: result.rewardType,
      itemId: result.itemId,
    });

    await saveService.saveLocal();

    events.emit('daily:claim:result', {
      success: true,
      day: result.day,
      coins: result.coins,
      rewardType: result.rewardType,
      itemId: result.itemId,
    });

    this.emitStatus(events);
    this.emitProgress(events);
    logger.info('[DailyRewardController] Claim handled', result);
  }
}

export const dailyRewardController = new DailyRewardController();
