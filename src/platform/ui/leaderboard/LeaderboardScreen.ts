import Phaser from 'phaser';

import { t } from '../i18n';
import { FREDOKA_FONT } from '../typography';
import { BaseScreen } from '../screen/ScreenManager';
import { usePlatformStore } from '@platform/core/state';
import type { LeaderboardEntry } from '@platform/core/state';
import { leaderboard } from '@platform/modules/leaderboard/leaderboard.service';
import type { LeaderboardBoard } from '@platform/modules/leaderboard/leaderboard.service';

const MAX_ROWS = 8;
const ROW_HEIGHT = 52;
const BOARDS: LeaderboardBoard[] = ['daily', 'weekly', 'allTime'];

export class LeaderboardScreen extends BaseScreen {
  readonly id = 'leaderboard';

  private loading = false;
  private rankText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private activeBoard: LeaderboardBoard = 'daily';
  private listContainer?: Phaser.GameObjects.Container;
  private tabButtons = new Map<LeaderboardBoard, Phaser.GameObjects.Rectangle>();

  constructor(scene: Phaser.Scene) {
    super(scene);
    this.createOverlay(0.75);
    this.buildUI();
  }

  private buildUI(): void {
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

    const title = this.scene.add.text(width / 2, height * 0.12, t('leaderboard.title'), {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: FREDOKA_FONT,
    });
    title.setOrigin(0.5);
    this.add(title);

    this.buildTabs(width, height * 0.2);

    this.rankText = this.scene.add.text(width / 2, height * 0.27, '', {
      fontSize: '18px',
      color: '#ffd700',
      fontFamily: FREDOKA_FONT,
    });
    this.rankText.setOrigin(0.5);
    this.add(this.rankText);

    this.statusText = this.scene.add.text(width / 2, height * 0.5, '', {
      fontSize: '18px',
      color: '#aaaaaa',
      fontFamily: FREDOKA_FONT,
    });
    this.statusText.setOrigin(0.5);
    this.add(this.statusText);

    this.listContainer = this.scene.add.container(width / 2, height * 0.34);
    this.add(this.listContainer);

    this.createButton(width / 2, height * 0.9, t('common.close'), () => this.close());
  }

  private buildTabs(width: number, y: number): void {
    const tabWidth = 110;
    const gap = 12;
    const totalWidth = BOARDS.length * tabWidth + (BOARDS.length - 1) * gap;
    const startX = width / 2 - totalWidth / 2 + tabWidth / 2;

    BOARDS.forEach((board, index) => {
      const x = startX + index * (tabWidth + gap);
      const tab = this.scene.add.rectangle(x, y, tabWidth, 40, 0x1a1a2e, 1);
      tab.setStrokeStyle(1, 0x4a90d9);
      tab.setInteractive({ useHandCursor: true });
      this.add(tab);
      this.tabButtons.set(board, tab);

      const label = this.scene.add.text(x, y, t(`leaderboard.${board}`), {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: FREDOKA_FONT,
      });
      label.setOrigin(0.5);
      this.add(label);

      tab.on('pointerdown', () => {
        void this.switchBoard(board);
      });
    });
  }

  show(data?: Record<string, unknown>): void {
    const board = data?.board as LeaderboardBoard | undefined;
    if (board && BOARDS.includes(board)) {
      this.activeBoard = board;
    }
    super.show(data);
    void this.refresh();
  }

  private async switchBoard(board: LeaderboardBoard): Promise<void> {
    if (this.loading || this.activeBoard === board) return;
    this.activeBoard = board;
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    this.loading = true;
    this.updateTabStyles();
    this.setStatus(t('common.loading'));
    this.clearList();

    const [entries, rank] = await Promise.all([
      leaderboard.getLeaderboard(this.activeBoard),
      leaderboard.getRank(this.activeBoard),
    ]);

    this.loading = false;
    this.updateRank(rank);
    this.renderEntries(entries);
  }

  private updateTabStyles(): void {
    for (const [board, tab] of this.tabButtons) {
      const active = board === this.activeBoard;
      tab.setFillStyle(active ? 0x4a90d9 : 0x1a1a2e, 1);
      tab.setStrokeStyle(active ? 2 : 1, active ? 0xffffff : 0x4a90d9);
    }
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
