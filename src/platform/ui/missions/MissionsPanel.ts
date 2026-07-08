import Phaser from 'phaser';

import { toast } from '../toast/ToastManager';
import { eventBus } from '@platform/core/events';
import { FREDOKA_FONT } from '@platform/ui/fonts';
import { t } from '@platform/modules/i18n/i18n.service';
import type { MissionProgress } from '@platform/core/state';
import { saveService } from '@platform/modules/save/save.service';
import { missions } from '@platform/modules/missions/mission.service';
import { getPanelLayoutMetrics } from '@platform/ui/layout/panelLayout';

const ROW_GAP = 8;
const ROW_HEIGHT = 72;
/** Rewarded placement used for WATCH_AD mission progress. */
const MISSION_AD_PLACEMENT = 'DOUBLE_COIN';

/**
 * Missions list UI — lives in platform/ui so game scenes stay event-driven.
 */
export class MissionsPanel extends Phaser.GameObjects.Container {
  private readonly rowWidth: number;

  private listContainer?: Phaser.GameObjects.Container;
  private unsubscribers: Array<() => void> = [];

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.rowWidth = getPanelLayoutMetrics(scene.cameras.main).innerWidth;
    scene.add.existing(this);
    this.build();
    if (missions.applyResets()) {
      void saveService.saveLocal();
    }
    this.renderMissions();
    this.bindEvents();
  }

  destroy(fromScene?: boolean): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
    super.destroy(fromScene);
  }

  private bindEvents(): void {
    this.unsubscribers.push(
      eventBus.on('mission:update', () => this.renderMissions()),
      eventBus.on('mission:complete', () => this.renderMissions()),
      eventBus.on('ad:reward:result', ({ success, message }) => {
        if (success) {
          this.renderMissions();
          return;
        }
        if (message) {
          toast.show({ message, type: 'error' });
        }
      })
    );
  }

  private build(): void {
    const { height } = this.scene.cameras.main;
    const metrics = getPanelLayoutMetrics(this.scene.cameras.main);

    const panel = this.scene.add.rectangle(
      metrics.centerX,
      height / 2,
      metrics.panelWidth,
      height * 0.72,
      0x2a2a4a,
      1
    );
    panel.setStrokeStyle(2, 0x4a90d9);
    this.add(panel);

    this.listContainer = this.scene.add.container(metrics.centerX, height * 0.2);
    this.add(this.listContainer);
  }

  private renderMissions(): void {
    if (!this.listContainer) return;
    this.listContainer.removeAll(true);

    let offsetY = 0;

    for (const mission of missions.getMissions()) {
      const row = this.createMissionRow(mission, offsetY);
      this.listContainer.add(row);
      offsetY += ROW_HEIGHT + ROW_GAP;
    }
  }

  private createMissionRow(mission: MissionProgress, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, y);
    const def = missions.getDefinition(mission.id);
    const title = def ? t(def.titleKey) : mission.id;
    const coins = def?.reward.type === 'coins' ? def.reward.amount : 0;
    const progress = Math.min(mission.progress, mission.target);
    const ratio = mission.target > 0 ? progress / mission.target : 0;
    const rowHalf = this.rowWidth / 2;
    const titleWrapWidth = Math.max(140, this.rowWidth * 0.52);
    const barWidth = Math.max(160, this.rowWidth * 0.42);

    const bg = this.scene.add.rectangle(0, ROW_HEIGHT / 2, this.rowWidth, ROW_HEIGHT, 0x1a1a2e, 1);
    bg.setStrokeStyle(1, 0x4a90d9);
    container.add(bg);

    const titleText = this.scene.add.text(-rowHalf + 14, 10, title, {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: FREDOKA_FONT,
      wordWrap: { width: titleWrapWidth },
    });
    container.add(titleText);

    if (def?.resetPolicy === 'daily') {
      const dailyLabel = this.scene.add.text(-rowHalf + 14, 28, t('missions.dailyMission'), {
        fontSize: '11px',
        color: '#888888',
        fontFamily: FREDOKA_FONT,
      });
      container.add(dailyLabel);
    }

    const barX = -rowHalf + 14;
    const barY = 36;
    const barHeight = 10;

    const barBg = this.scene.add.rectangle(
      barX + barWidth / 2,
      barY,
      barWidth,
      barHeight,
      0x333355
    );
    container.add(barBg);

    if (ratio > 0) {
      const barFill = this.scene.add.rectangle(
        barX + (barWidth * ratio) / 2,
        barY,
        barWidth * ratio,
        barHeight,
        mission.status === 'completed' || mission.status === 'claimed' ? 0x4caf50 : 0x6c5ce7
      );
      barFill.setOrigin(0, 0.5);
      container.add(barFill);
    }

    const progressText = this.scene.add.text(
      barX + barWidth + 10,
      barY,
      t('missions.progress', { current: progress, target: mission.target }),
      {
        fontSize: '13px',
        color: '#aaaaaa',
        fontFamily: FREDOKA_FONT,
      }
    );
    progressText.setOrigin(0, 0.5);
    container.add(progressText);

    const rewardText = this.scene.add.text(rowHalf - 14, 14, t('missions.reward', { coins }), {
      fontSize: '13px',
      color: '#ffd700',
      fontFamily: FREDOKA_FONT,
    });
    rewardText.setOrigin(1, 0);
    container.add(rewardText);

    if (mission.status === 'completed') {
      const claimBtn = this.scene.add.rectangle(rowHalf - 52, 46, 88, 30, 0x4a90d9);
      claimBtn.setStrokeStyle(1, 0xffffff);
      claimBtn.setInteractive({ useHandCursor: true });

      const claimLabel = this.scene.add.text(rowHalf - 52, 46, t('missions.claim'), {
        fontSize: '13px',
        color: '#ffffff',
        fontFamily: FREDOKA_FONT,
      });
      claimLabel.setOrigin(0.5);

      claimBtn.on('pointerdown', () => {
        this.handleClaim(mission.id, coins);
      });

      container.add([claimBtn, claimLabel]);
    } else if (mission.status === 'active' && def?.type === 'WATCH_AD') {
      const watchBtn = this.scene.add.rectangle(rowHalf - 58, 46, 100, 30, 0x6c5ce7);
      watchBtn.setStrokeStyle(1, 0xffffff);
      watchBtn.setInteractive({ useHandCursor: true });

      const watchLabel = this.scene.add.text(rowHalf - 58, 46, t('missions.watchAd'), {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: FREDOKA_FONT,
      });
      watchLabel.setOrigin(0.5);

      watchBtn.on('pointerdown', () => {
        eventBus.emit('ad:reward:request', { placement: MISSION_AD_PLACEMENT });
      });

      container.add([watchBtn, watchLabel]);
    } else if (mission.status === 'claimed') {
      const claimedText = this.scene.add.text(rowHalf - 14, 46, t('missions.claimed'), {
        fontSize: '13px',
        color: '#4caf50',
        fontFamily: FREDOKA_FONT,
      });
      claimedText.setOrigin(1, 0.5);
      container.add(claimedText);
    }

    return container;
  }

  private handleClaim(missionId: string, coins: number): void {
    const success = missions.claimMission(missionId);
    if (success) {
      toast.show({
        message: t('missions.claimSuccess', { coins }),
        type: 'success',
      });
      void saveService.saveLocal();
      this.renderMissions();
    } else {
      toast.show({ message: t('missions.claimFailed'), type: 'error' });
    }
  }
}
