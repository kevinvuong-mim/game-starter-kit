import Phaser from 'phaser';

import { toast } from '../toast/ToastManager';
import { eventBus } from '@platform/core/events';
import { FREDOKA_FONT } from '@platform/ui/index';
import { t } from '@platform/modules/i18n/i18n.service';
import { usePlatformStore } from '@platform/core/state';
import { createUIButton, UIButtonBackgroundKey } from '../button/UIButton';
import { dailyRewards } from '@platform/modules/daily-rewards/daily-reward.service';

const CELL_GAP = 12;
const CELL_WIDTH = 140;
const CELL_HEIGHT = 88;

function formatCooldown(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Daily reward calendar UI — lives in platform/ui so game scenes stay event-driven.
 */
export class DailyRewardPanel extends Phaser.GameObjects.Container {
  private streakText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private calendarContainer?: Phaser.GameObjects.Container;
  private claimButton?: Phaser.GameObjects.Container;
  private unsubscribers: Array<() => void> = [];

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.build();
    this.refresh();
    this.bindEvents();
  }

  destroy(fromScene?: boolean): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
    super.destroy(fromScene);
  }

  private bindEvents(): void {
    this.unsubscribers.push(
      eventBus.on('daily:claim:result', ({ success, coins, message }) => {
        if (success) {
          toast.show({
            message: message ?? t('dailyReward.claimSuccess', { coins: coins ?? 0 }),
            type: 'success',
          });
        }
        this.refresh();
      })
    );
  }

  private build(): void {
    const { width, height } = this.scene.cameras.main;

    const panel = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width * 0.92,
      height * 0.72,
      0x2a2a4a,
      1
    );
    panel.setStrokeStyle(2, 0x6c5ce7);
    this.add(panel);

    this.streakText = this.scene.add
      .text(width / 2, height * 0.2, '', {
        fontSize: '20px',
        color: '#ffd700',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);
    this.add(this.streakText);

    this.calendarContainer = this.scene.add.container(width / 2, height * 0.38);
    this.add(this.calendarContainer);

    this.statusText = this.scene.add
      .text(width / 2, height * 0.62, '', {
        fontSize: '18px',
        color: '#aaaaaa',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);
    this.add(this.statusText);

    this.claimButton = createUIButton({
      scene: this.scene,
      position: { x: width / 2, y: height * 0.72 },
      size: { width: 220, height: 56 },
      background: { key: UIButtonBackgroundKey.Primary },
      text: {
        content: t('dailyReward.claim'),
        style: { fontSize: 22, fontStyle: 'bold' },
      },
      onClick: () => {
        eventBus.emit('daily:claim:request', undefined);
      },
    });
    this.add(this.claimButton);
  }

  private refresh(): void {
    const { streak, currentDay, claimedDays } = usePlatformStore.getState().dailyRewards;
    const canClaim = dailyRewards.canClaim();
    const calendar = dailyRewards.getCalendar();

    this.streakText?.setText(t('dailyReward.streak', { days: streak }));

    this.renderCalendar(calendar, currentDay, claimedDays, canClaim);

    if (canClaim) {
      this.statusText?.setText('');
      this.claimButton?.setVisible(true).setAlpha(1);
    } else {
      const remaining = dailyRewards.getCooldownRemaining();
      this.statusText?.setText(
        remaining > 0
          ? t('dailyReward.cooldown', { time: formatCooldown(remaining) })
          : t('dailyReward.comeBack')
      );
      this.claimButton?.setVisible(false);
    }
  }

  private renderCalendar(
    calendar: ReturnType<typeof dailyRewards.getCalendar>,
    currentDay: number,
    claimedDays: number[],
    canClaim: boolean
  ): void {
    if (!this.calendarContainer) return;
    this.calendarContainer.removeAll(true);

    const row1 = this.scene.add.container(-(CELL_WIDTH + CELL_GAP) * 1.5, 0);
    const row2 = this.scene.add.container(-(CELL_WIDTH + CELL_GAP), CELL_HEIGHT + CELL_GAP);

    calendar.forEach((entry, index) => {
      const row = index < 4 ? row1 : row2;
      const col = index < 4 ? index : index - 4;
      const cell = this.createDayCell(entry, currentDay, claimedDays, canClaim);
      cell.setPosition(col * (CELL_WIDTH + CELL_GAP), 0);
      row.add(cell);
    });

    this.calendarContainer.add([row1, row2]);
  }

  private createDayCell(
    entry: { day: number; reward: { coins?: number } },
    currentDay: number,
    claimedDays: number[],
    canClaim: boolean
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const isClaimed = claimedDays.includes(entry.day);
    const isCurrent = entry.day === currentDay;
    const isAvailable = isCurrent && canClaim && !isClaimed;

    let fill = 0x1a1a2e;
    let stroke = 0x4a4a6a;
    if (isClaimed) {
      fill = 0x2d5a3d;
      stroke = 0x4caf50;
    } else if (isAvailable) {
      fill = 0x4a3a8a;
      stroke = 0x6c5ce7;
    } else if (isCurrent) {
      fill = 0x3a3a5a;
      stroke = 0x6c5ce7;
    }

    const bg = this.scene.add.rectangle(0, 0, CELL_WIDTH, CELL_HEIGHT, fill, 1);
    bg.setStrokeStyle(2, stroke);
    container.add(bg);

    const dayLabel = this.scene.add.text(0, -22, t('dailyReward.day', { day: entry.day }), {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: FREDOKA_FONT,
    });
    dayLabel.setOrigin(0.5);
    container.add(dayLabel);

    const coins = entry.reward.coins ?? 0;
    const rewardLabel = this.scene.add.text(
      0,
      8,
      isClaimed ? t('dailyReward.claimed') : t('dailyReward.coins', { coins }),
      {
        fontSize: isClaimed ? '14px' : '18px',
        color: isClaimed ? '#4caf50' : '#ffd700',
        fontFamily: FREDOKA_FONT,
      }
    );
    rewardLabel.setOrigin(0.5);
    container.add(rewardLabel);

    return container;
  }
}
