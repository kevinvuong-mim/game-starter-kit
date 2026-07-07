import Phaser from 'phaser';

import { toast } from '../toast/ToastManager';
import { eventBus } from '@platform/core/events';
import { FREDOKA_FONT } from '@platform/ui/index';
import { t } from '@platform/modules/i18n/i18n.service';
import type {
  RewardProgress,
  RewardDayProgress,
} from '@platform/modules/daily-reward/daily-reward.model';
import { getPanelLayoutMetrics } from '@platform/ui/layout/panelLayout';
import { createUIButton, UIButtonBackgroundKey } from '../button/UIButton';

const CELL_GAP = 10;

export class DailyRewardPopup extends Phaser.GameObjects.Container {
  private readonly cellWidth: number;
  private readonly cellHeight: number;

  private panel?: Phaser.GameObjects.Rectangle;
  private statusText?: Phaser.GameObjects.Text;
  private rewardBurst?: Phaser.GameObjects.Text;
  private unsubscribers: Array<() => void> = [];
  private claimButton?: Phaser.GameObjects.Container;
  private calendarContainer?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    const metrics = getPanelLayoutMetrics(scene.cameras.main);
    this.cellWidth = Math.floor((metrics.innerWidth - CELL_GAP * 3) / 4);
    this.cellHeight = Math.round(this.cellWidth * 0.64);
    scene.add.existing(this);
    this.build();
    this.playOpenAnimation();
    this.bindEvents();
    eventBus.emit('daily:progress:request', undefined);
  }

  destroy(fromScene?: boolean): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
    super.destroy(fromScene);
  }

  private bindEvents(): void {
    this.unsubscribers.push(
      eventBus.on('daily:progress', (progress) => {
        this.render(progress);
      }),
      eventBus.on('daily:claim:result', ({ success, coins, rewardType, itemId, message }) => {
        if (success) {
          this.playClaimAnimation(coins, rewardType, itemId);
          toast.show({
            message: this.getClaimToastMessage(coins, rewardType, itemId),
            type: 'success',
          });
        } else if (message === 'time_manipulated') {
          toast.show({ message: t('dailyReward.timeManipulated'), type: 'error' });
        }
        eventBus.emit('daily:progress:request', undefined);
      })
    );
  }

  private build(): void {
    const { height } = this.scene.cameras.main;
    const metrics = getPanelLayoutMetrics(this.scene.cameras.main);

    this.panel = this.scene.add.rectangle(
      metrics.centerX,
      height / 2,
      metrics.panelWidth,
      height * 0.72,
      0x2a2a4a,
      1
    );
    this.panel.setStrokeStyle(2, 0x6c5ce7);
    this.add(this.panel);

    this.calendarContainer = this.scene.add.container(metrics.centerX, height * 0.38);
    this.add(this.calendarContainer);

    this.statusText = this.scene.add
      .text(metrics.centerX, height * 0.62, '', {
        fontSize: '16px',
        color: '#aaaaaa',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);
    this.add(this.statusText);

    this.rewardBurst = this.scene.add
      .text(metrics.centerX, height * 0.5, '', {
        fontSize: '28px',
        color: '#ffd700',
        fontStyle: 'bold',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.5);
    this.add(this.rewardBurst);

    this.claimButton = createUIButton({
      scene: this.scene,
      position: { x: metrics.centerX, y: height * 0.72 },
      size: { width: 200, height: 50 },
      background: { key: UIButtonBackgroundKey.Primary },
      text: {
        content: t('dailyReward.claim'),
        style: { fontSize: 20, fontStyle: 'bold' },
      },
      sound: 'coin-drop',
      onClick: () => {
        eventBus.emit('daily:claim:request', undefined);
      },
    });
    this.add(this.claimButton);
  }

  private render(progress: RewardProgress): void {
    this.renderCalendar(progress.days, progress.canClaim);

    if (progress.timeManipulated) {
      this.statusText?.setText(t('dailyReward.timeManipulated'));
      this.claimButton?.setVisible(false);
      return;
    }

    if (progress.canClaim) {
      this.statusText?.setText('');
      this.claimButton?.setVisible(true).setAlpha(1);
    } else {
      this.statusText?.setText(t('dailyReward.comeBack'));
      this.claimButton?.setVisible(false);
    }
  }

  private renderCalendar(days: RewardDayProgress[], canClaim: boolean): void {
    if (!this.calendarContainer) return;
    this.calendarContainer.removeAll(true);

    const cellSpan = this.cellWidth + CELL_GAP;
    const row1 = this.scene.add.container(-cellSpan * 1.5, 0);
    const row2 = this.scene.add.container(-cellSpan, this.cellHeight + CELL_GAP);

    days.forEach((entry, index) => {
      const row = index < 4 ? row1 : row2;
      const col = index < 4 ? index : index - 4;
      const cell = this.createDayCell(entry, canClaim);
      cell.setPosition(col * cellSpan, 0);
      row.add(cell);
    });

    this.calendarContainer.add([row1, row2]);
  }

  private createDayCell(entry: RewardDayProgress, canClaim: boolean): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const isClaimed = entry.status === 'claimed';
    const isCurrent = entry.status === 'current';
    const isAvailable = isCurrent && canClaim;

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

    const bg = this.scene.add.rectangle(0, 0, this.cellWidth, this.cellHeight, fill, 1);
    bg.setStrokeStyle(2, stroke);
    container.add(bg);

    const dayLabel = this.scene.add.text(
      0,
      -this.cellHeight * 0.25,
      t('dailyReward.day', { day: entry.day }),
      {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
        fontFamily: FREDOKA_FONT,
      }
    );
    dayLabel.setOrigin(0.5);
    container.add(dayLabel);

    const rewardLabel = this.scene.add.text(
      0,
      this.cellHeight * 0.1,
      isClaimed ? t('dailyReward.claimed') : this.getRewardLabel(entry),
      {
        fontSize: isClaimed ? '12px' : '15px',
        color: isClaimed ? '#4caf50' : '#ffd700',
        fontFamily: FREDOKA_FONT,
        wordWrap: { width: this.cellWidth - 12 },
        align: 'center',
      }
    );
    rewardLabel.setOrigin(0.5);
    container.add(rewardLabel);

    if (isAvailable) {
      this.scene.tweens.add({
        targets: container,
        scaleX: 1.04,
        scaleY: 1.04,
        yoyo: true,
        repeat: -1,
        duration: 700,
        ease: 'Sine.easeInOut',
      });
    }

    return container;
  }

  private getRewardLabel(entry: RewardDayProgress): string {
    if (entry.rewardType === 'random') return t('dailyReward.random');
    if (entry.rewardType === 'chest') return t('dailyReward.chest');
    return t('dailyReward.coins', { coins: entry.coins ?? 0 });
  }

  private getClaimToastMessage(
    coins?: number,
    rewardType?: 'coins' | 'chest',
    itemId?: string
  ): string {
    if (rewardType === 'chest') {
      return t('dailyReward.chestSuccess', { item: itemId ?? t('dailyReward.chest') });
    }
    return t('dailyReward.claimSuccess', { coins: coins ?? 0 });
  }

  private playOpenAnimation(): void {
    this.setAlpha(0);
    this.setScale(0.92);
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 280,
      ease: 'Back.easeOut',
    });
  }

  private playClaimAnimation(
    coins?: number,
    rewardType?: 'coins' | 'chest',
    itemId?: string
  ): void {
    if (!this.rewardBurst) return;

    const label =
      rewardType === 'chest'
        ? t('dailyReward.chestSuccess', { item: itemId ?? t('dailyReward.chest') })
        : t('dailyReward.claimSuccess', { coins: coins ?? 0 });

    this.rewardBurst.setText(label);
    this.rewardBurst.setAlpha(1);
    this.rewardBurst.setScale(0.5);

    this.scene.tweens.add({
      targets: this.rewardBurst,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0,
      y: this.rewardBurst.y - 40,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.rewardBurst?.setAlpha(0);
        if (this.rewardBurst) this.rewardBurst.y += 40;
      },
    });
  }
}
