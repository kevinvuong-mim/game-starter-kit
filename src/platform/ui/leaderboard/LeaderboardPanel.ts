import Phaser from 'phaser';

import { eventBus } from '@platform/core/events';
import { t, FREDOKA_FONT } from '@platform/ui/index';
import { createUIButton, UIButtonBackgroundKey } from '@platform/ui/button/UIButton';
import { getLeaderboardDisplayName } from '@platform/modules/leaderboard';
import type { UIButton } from '@platform/ui/types';
import type { LeaderboardEntry, LeaderboardView } from '@platform/modules/leaderboard';

const MAX_ROWS = 7;
const ROW_HEIGHT = 64;
const SKELETON_ROWS = 5;
const AUTO_REFRESH_MS = 30_000;

/**
 * Leaderboard UI. Fully event-driven: it emits `leaderboard:request` /
 * `leaderboard:refresh` and renders whatever `leaderboard:update` delivers.
 * It never touches the API or the store directly.
 */
export class LeaderboardPanel extends Phaser.GameObjects.Container {
  private refreshButton!: UIButton;
  private retryButton!: UIButton;
  private prevPageButton!: UIButton;
  private nextPageButton!: UIButton;
  private statusText!: Phaser.GameObjects.Text;
  private rankText!: Phaser.GameObjects.Text;
  private updatedText!: Phaser.GameObjects.Text;
  private pageText!: Phaser.GameObjects.Text;
  private listContainer!: Phaser.GameObjects.Container;
  private skeletonContainer!: Phaser.GameObjects.Container;
  private unsubscribers: Array<() => void> = [];
  private autoRefreshTimer?: Phaser.Time.TimerEvent;
  private currentPage = 1;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.build();
    this.bindEvents();
    this.request();
  }

  private get layout() {
    const { width, height } = this.scene.cameras.main;
    return { width, height };
  }

  private build(): void {
    const { width, height } = this.layout;

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

    this.buildRefresh();
    this.buildPagination();

    this.listContainer = this.scene.add.container(width / 2, height * 0.3);
    this.add(this.listContainer);

    this.skeletonContainer = this.scene.add.container(width / 2, height * 0.3);
    this.skeletonContainer.setVisible(false);
    this.add(this.skeletonContainer);
    this.buildSkeleton();

    this.statusText = this.scene.add
      .text(width / 2, height * 0.5, '', {
        fontSize: '20px',
        color: '#cfd3ff',
        align: 'center',
        fontFamily: FREDOKA_FONT,
        wordWrap: { width: width * 0.7 },
      })
      .setOrigin(0.5);
    this.add(this.statusText);

    this.rankText = this.scene.add
      .text(width / 2, height * 0.82, '', {
        fontSize: '18px',
        color: '#ffd700',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);
    this.add(this.rankText);

    this.updatedText = this.scene.add
      .text(width / 2, height * 0.86, '', {
        fontSize: '13px',
        color: '#8a8fb5',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);
    this.add(this.updatedText);

    this.pageText = this.scene.add
      .text(width / 2, height * 0.9, '', {
        fontSize: '14px',
        color: '#cfd3ff',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);
    this.add(this.pageText);

    this.buildRetry();
  }

  private buildPagination(): void {
    const { width, height } = this.layout;

    this.prevPageButton = createUIButton({
      scene: this.scene,
      position: { x: width * 0.28, y: height * 0.9 },
      size: { width: 90, height: 40 },
      background: { key: UIButtonBackgroundKey.Rounded },
      text: { content: t('leaderboard.prevPage'), style: { fontSize: 14 } },
      onClick: () => this.goToPage(this.currentPage - 1),
    });
    this.prevPageButton.setVisible(false);
    this.add(this.prevPageButton);

    this.nextPageButton = createUIButton({
      scene: this.scene,
      position: { x: width * 0.72, y: height * 0.9 },
      size: { width: 90, height: 40 },
      background: { key: UIButtonBackgroundKey.Rounded },
      text: { content: t('leaderboard.nextPage'), style: { fontSize: 14 } },
      onClick: () => this.goToPage(this.currentPage + 1),
    });
    this.nextPageButton.setVisible(false);
    this.add(this.nextPageButton);
  }

  private buildRefresh(): void {
    const { width, height } = this.layout;
    this.refreshButton = createUIButton({
      scene: this.scene,
      position: { x: width * 0.82, y: height * 0.2 },
      size: { width: 110, height: 46 },
      background: { key: UIButtonBackgroundKey.Rounded },
      text: { content: t('leaderboard.refresh'), style: { fontSize: 15 } },
      onClick: () => this.refresh(),
    });
    this.add(this.refreshButton);
  }

  private buildRetry(): void {
    const { width, height } = this.layout;
    this.retryButton = createUIButton({
      scene: this.scene,
      position: { x: width / 2, y: height * 0.58 },
      size: { width: 180, height: 48 },
      background: { key: UIButtonBackgroundKey.Primary },
      text: { content: t('leaderboard.retry'), style: { fontSize: 18 } },
      onClick: () => this.refresh(),
    });
    this.retryButton.setVisible(false);
    this.add(this.retryButton);
  }

  private buildSkeleton(): void {
    for (let i = 0; i < SKELETON_ROWS; i++) {
      const row = this.scene.add.rectangle(0, i * ROW_HEIGHT, 620, 52, 0x35355c, 1);
      row.setStrokeStyle(1, 0x3f3f6b);
      this.skeletonContainer.add(row);
    }
  }

  private bindEvents(): void {
    this.unsubscribers.push(
      eventBus.on('leaderboard:update', (view) => {
        this.render(view);
      })
    );

    this.autoRefreshTimer = this.scene.time.addEvent({
      delay: AUTO_REFRESH_MS,
      loop: true,
      callback: () => {
        if (typeof navigator === 'undefined' || navigator.onLine !== false) this.refresh();
      },
    });
  }

  private request(): void {
    eventBus.emit('leaderboard:request', undefined);
  }

  private refresh(): void {
    eventBus.emit('leaderboard:refresh', { page: this.currentPage });
  }

  private goToPage(page: number): void {
    if (page < 1) return;
    this.currentPage = page;
    eventBus.emit('leaderboard:page', { page });
  }

  private render(view: LeaderboardView): void {
    const loading = view.status === 'loading';
    const refreshing = view.status === 'refreshing';
    const errored = view.status === 'error';
    this.currentPage = view.pagination.page;

    this.skeletonContainer.setVisible(loading);
    this.retryButton.setVisible(errored);
    this.refreshButton.setEnabled(!loading && !refreshing);

    if (loading) {
      this.listContainer.removeAll(true);
      this.setStatus(t('common.loading'));
      this.rankText.setText('');
      this.updatedText.setText('');
      this.pageText.setText('');
      return;
    }

    if (errored) {
      this.listContainer.removeAll(true);
      this.setStatus(t(view.error ?? 'leaderboard.error'));
      this.rankText.setText('');
      this.updatedText.setText('');
      this.pageText.setText('');
      this.renderPagination(view, false);
      return;
    }

    if (view.isEmpty) {
      this.listContainer.removeAll(true);
      this.setStatus(t('leaderboard.empty'));
    } else {
      this.statusText.setVisible(false);
      this.renderEntries(view);
    }

    this.renderMyRank(view);
    this.renderUpdated(view);
    this.renderPagination(view, true);
  }

  private renderEntries(view: LeaderboardView): void {
    this.listContainer.removeAll(true);

    view.entries.slice(0, MAX_ROWS).forEach((entry, index) => {
      const isMe = !!view.myGuestId && entry.guestId === view.myGuestId;
      this.listContainer.add(this.createEntryRow(entry, index * ROW_HEIGHT, isMe));
    });

    this.scene.tweens.add({
      targets: this.listContainer,
      alpha: { from: 0.35, to: 1 },
      duration: 220,
      ease: 'Quad.easeOut',
    });
  }

  private createEntryRow(
    entry: LeaderboardEntry,
    y: number,
    isCurrentPlayer: boolean
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, y);
    const bgColor = isCurrentPlayer ? 0x3d5a80 : 0x1a1a2e;

    const bg = this.scene.add.rectangle(0, 0, 620, 52, bgColor, 1);
    bg.setStrokeStyle(1, isCurrentPlayer ? 0xffd700 : 0x4a90d9);
    container.add(bg);

    const rankText = this.scene.add.text(-285, 0, `#${entry.rank}`, {
      fontSize: '18px',
      color: isCurrentPlayer ? '#ffd700' : '#ffffff',
      fontStyle: 'bold',
      fontFamily: FREDOKA_FONT,
    });
    rankText.setOrigin(0, 0.5);
    container.add(rankText);

    const displayName = getLeaderboardDisplayName(entry, t('leaderboard.anonymous'));
    const label = isCurrentPlayer ? `${displayName} ${t('leaderboard.you')}` : displayName;
    const nameText = this.scene.add.text(-200, 0, label, {
      fontSize: '17px',
      color: '#ffffff',
      fontFamily: FREDOKA_FONT,
      wordWrap: { width: 340 },
    });
    nameText.setOrigin(0, 0.5);
    container.add(nameText);

    const scoreText = this.scene.add.text(285, 0, String(entry.score), {
      fontSize: '18px',
      color: '#4a90d9',
      fontStyle: 'bold',
      fontFamily: FREDOKA_FONT,
    });
    scoreText.setOrigin(1, 0.5);
    container.add(scoreText);

    return container;
  }

  private renderMyRank(view: LeaderboardView): void {
    if (view.myRank && view.myRank > 0) {
      this.rankText.setText(t('leaderboard.rank', { rank: view.myRank }));
      this.rankText.setVisible(true);
      return;
    }

    if (view.myGuestId) {
      this.rankText.setText(t('leaderboard.rankUnavailable'));
      this.rankText.setVisible(true);
      return;
    }

    this.rankText.setVisible(false);
  }

  private renderUpdated(view: LeaderboardView): void {
    if (!view.lastUpdated) {
      this.updatedText.setText('');
      return;
    }

    const seconds = Math.max(0, Math.round((Date.now() - view.lastUpdated) / 1000));
    const when = t('leaderboard.updatedAgo', { seconds });
    this.updatedText.setText(view.fromCache ? `${t('leaderboard.cached')} · ${when}` : when);
  }

  private renderPagination(view: LeaderboardView, visible: boolean): void {
    const { pagination } = view;
    const hasPages = pagination.totalPages > 1;

    this.pageText.setVisible(visible && hasPages);
    this.prevPageButton.setVisible(visible && hasPages);
    this.nextPageButton.setVisible(visible && hasPages);

    if (!visible || !hasPages) {
      this.pageText.setText('');
      return;
    }

    this.pageText.setText(
      t('leaderboard.pageInfo', {
        page: pagination.page,
        totalPages: pagination.totalPages,
      })
    );
    this.prevPageButton.setEnabled(pagination.page > 1);
    this.nextPageButton.setEnabled(pagination.page < pagination.totalPages);
  }

  private setStatus(message: string): void {
    this.statusText.setText(message);
    this.statusText.setVisible(true);
  }

  destroy(fromScene?: boolean): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
    this.autoRefreshTimer?.destroy();
    this.autoRefreshTimer = undefined;
    super.destroy(fromScene);
  }
}
