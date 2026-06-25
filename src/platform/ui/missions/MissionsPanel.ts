import Phaser from 'phaser';

import { toast } from '../toast/ToastManager';
import { eventBus } from '@platform/core/events';
import { FREDOKA_FONT } from '@platform/ui/index';
import { t } from '@platform/modules/i18n/i18n.service';
import { saveService } from '@platform/modules/save/save.service';
import { missions } from '@platform/modules/missions/mission.service';
import type { MissionProgress, MissionType } from '@platform/core/state';

const ROW_GAP = 8;
const ROW_HEIGHT = 76;
const ROW_WIDTH = 620;
const SECTION_GAP = 16;

const SECTIONS: {
  type: MissionType;
  labelKey: 'missions.daily' | 'missions.weekly' | 'missions.permanent';
}[] = [
  { type: 'daily', labelKey: 'missions.daily' },
  { type: 'weekly', labelKey: 'missions.weekly' },
  { type: 'permanent', labelKey: 'missions.permanent' },
];

/**
 * Missions list UI — lives in platform/ui so game scenes stay event-driven.
 */
export class MissionsPanel extends Phaser.GameObjects.Container {
  private listContainer?: Phaser.GameObjects.Container;
  private unsubscribers: Array<() => void> = [];

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.build();
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
      eventBus.on('mission:complete', () => this.renderMissions())
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
    panel.setStrokeStyle(2, 0x4a90d9);
    this.add(panel);

    this.listContainer = this.scene.add.container(width / 2, height * 0.2);
    this.add(this.listContainer);
  }

  private renderMissions(): void {
    if (!this.listContainer) return;
    this.listContainer.removeAll(true);

    let offsetY = 0;

    for (const section of SECTIONS) {
      const sectionMissions = missions.getMissions(section.type);
      if (sectionMissions.length === 0) continue;

      const header = this.scene.add.text(0, offsetY, t(section.labelKey), {
        fontSize: '20px',
        color: '#ffd700',
        fontStyle: 'bold',
        fontFamily: FREDOKA_FONT,
      });
      header.setOrigin(0.5, 0);
      this.listContainer.add(header);
      offsetY += 32;

      sectionMissions.forEach((mission) => {
        const row = this.createMissionRow(mission, offsetY);
        this.listContainer!.add(row);
        offsetY += ROW_HEIGHT + ROW_GAP;
      });

      offsetY += SECTION_GAP;
    }
  }

  private createMissionRow(mission: MissionProgress, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, y);
    const def = missions.getDefinition(mission.id);
    const title = def ? t(def.titleKey) : mission.id;
    const coins = def?.reward.coins ?? 0;
    const progress = Math.min(mission.progress, mission.target);
    const ratio = mission.target > 0 ? progress / mission.target : 0;

    const bg = this.scene.add.rectangle(0, ROW_HEIGHT / 2, ROW_WIDTH, ROW_HEIGHT, 0x1a1a2e, 1);
    bg.setStrokeStyle(1, 0x4a90d9);
    container.add(bg);

    const titleText = this.scene.add.text(-ROW_WIDTH / 2 + 16, 10, title, {
      fontSize: '17px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: FREDOKA_FONT,
      wordWrap: { width: 360 },
    });
    container.add(titleText);

    const barX = -ROW_WIDTH / 2 + 16;
    const barY = 38;
    const barWidth = 280;
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
      barX + barWidth + 12,
      barY,
      t('missions.progress', { current: progress, target: mission.target }),
      {
        fontSize: '14px',
        color: '#aaaaaa',
        fontFamily: FREDOKA_FONT,
      }
    );
    progressText.setOrigin(0, 0.5);
    container.add(progressText);

    const rewardText = this.scene.add.text(
      ROW_WIDTH / 2 - 16,
      14,
      t('missions.reward', { coins }),
      {
        fontSize: '14px',
        color: '#ffd700',
        fontFamily: FREDOKA_FONT,
      }
    );
    rewardText.setOrigin(1, 0);
    container.add(rewardText);

    if (mission.status === 'completed') {
      const claimBtn = this.scene.add.rectangle(ROW_WIDTH / 2 - 56, 48, 96, 32, 0x4a90d9);
      claimBtn.setStrokeStyle(1, 0xffffff);
      claimBtn.setInteractive({ useHandCursor: true });

      const claimLabel = this.scene.add.text(ROW_WIDTH / 2 - 56, 48, t('missions.claim'), {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: FREDOKA_FONT,
      });
      claimLabel.setOrigin(0.5);

      claimBtn.on('pointerdown', () => {
        this.handleClaim(mission.id, coins);
      });

      container.add([claimBtn, claimLabel]);
    } else if (mission.status === 'claimed') {
      const claimedText = this.scene.add.text(ROW_WIDTH / 2 - 16, 48, t('missions.claimed'), {
        fontSize: '14px',
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
