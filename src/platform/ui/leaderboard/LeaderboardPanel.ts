import Phaser from 'phaser';

import { FREDOKA_FONT } from '@platform/ui/index';
import { t } from '@platform/modules/i18n/i18n.service';
import { usePlatformStore } from '@platform/core/state';
import type { LeaderboardEntry } from '@platform/core/state';
import { leaderboard } from '@platform/modules/leaderboard/leaderboard.service';

const MAX_ROWS = 8;
const ROW_HEIGHT = 52;

/**
 * Leaderboard UI — lives in platform/ui so game scenes stay event-driven.
 */
export class LeaderboardPanel extends Phaser.GameObjects.Container {
  private rankText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private listContainer?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.build();
    void this.refresh();
  }

  private build(): void {
    const { width, height } = this.scene.cameras.main;

    const panel = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width * 0.92,
      height * 0.82,
      0x2a2a4a,
      1
    );
    panel.setStrokeStyle(2, 0x4a90d9);
    this.add(panel);

    this.rankText = this.scene.add
      .text(width / 2, height * 0.22, '', {
        fontSize: '18px',
        color: '#ffd700',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);
    this.add(this.rankText);

    this.statusText = this.scene.add
      .text(width / 2, height * 0.5, '', {
        fontSize: '18px',
        color: '#aaaaaa',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);
    this.add(this.statusText);

    this.listContainer = this.scene.add.container(width / 2, height * 0.3);
    this.add(this.listContainer);
  }

  private async refresh(): Promise<void> {
    this.setStatus(t('common.loading'));
    this.clearList();

    const [entries, rank] = await Promise.all([
      leaderboard.getLeaderboard(),
      leaderboard.getRank(),
    ]);

    this.updateRank(rank);
    this.renderEntries(entries);
  }

  private updateRank(rank: number): void {
    if (!this.rankText) return;

    if (rank > 0) {
      this.rankText.setText(t('leaderboard.rank', { rank }));
      return;
    }

    this.rankText.setText(t('leaderboard.rankUnavailable'));
  }

  private setStatus(message: string): void {
    this.statusText?.setText(message);
    this.statusText?.setVisible(true);
  }

  private clearList(): void {
    this.listContainer?.removeAll(true);
  }

  private renderEntries(entries: LeaderboardEntry[]): void {
    if (!this.listContainer) return;

    this.clearList();
    this.statusText?.setVisible(false);

    if (entries.length === 0) {
      this.setStatus(t('leaderboard.empty'));
      return;
    }

    const userId = usePlatformStore.getState().user.id;
    const visibleEntries = entries.slice(0, MAX_ROWS);

    visibleEntries.forEach((entry, index) => {
      const row = this.createEntryRow(entry, index * ROW_HEIGHT, entry.playerId === userId);
      this.listContainer!.add(row);
    });
  }

  private createEntryRow(
    entry: LeaderboardEntry,
    y: number,
    isCurrentPlayer: boolean
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, y);
    const bgColor = isCurrentPlayer ? 0x3d5a80 : 0x1a1a2e;

    const bg = this.scene.add.rectangle(0, 0, 620, 46, bgColor, 1);
    bg.setStrokeStyle(1, isCurrentPlayer ? 0xffd700 : 0x4a90d9);
    container.add(bg);

    const rankLabel = this.formatRank(entry.rank);
    const rankText = this.scene.add.text(-280, 0, rankLabel, {
      fontSize: '18px',
      color: isCurrentPlayer ? '#ffd700' : '#ffffff',
      fontStyle: 'bold',
      fontFamily: FREDOKA_FONT,
    });
    rankText.setOrigin(0, 0.5);
    container.add(rankText);

    const name = isCurrentPlayer
      ? `${entry.displayName} ${t('leaderboard.you')}`
      : entry.displayName;
    const nameText = this.scene.add.text(-220, 0, name, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: FREDOKA_FONT,
      wordWrap: { width: 320 },
    });
    nameText.setOrigin(0, 0.5);
    container.add(nameText);

    const scoreText = this.scene.add.text(280, 0, String(entry.score), {
      fontSize: '18px',
      color: '#4a90d9',
      fontStyle: 'bold',
      fontFamily: FREDOKA_FONT,
    });
    scoreText.setOrigin(1, 0.5);
    container.add(scoreText);

    return container;
  }

  private formatRank(rank: number): string {
    if (rank <= 0) return '-';
    return `#${rank}`;
  }
}
