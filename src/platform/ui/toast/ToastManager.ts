import Phaser from 'phaser';

import { FREDOKA_FONT } from '@platform/ui/index';
import type { UIToastType, ToastOptions, ToastPosition } from '@platform/ui/types';

const TOAST_EDGE_MARGIN = 80;
const TOAST_ANIMATION_OFFSET = 20;
const TOAST_COLORS: Record<UIToastType, number> = {
  info: 0x4a90d9,
  error: 0xf44336,
  success: 0x4caf50,
  warning: 0xff9800,
};

function resolveToastCoords(
  width: number,
  height: number,
  position: ToastPosition,
  offsetX = 0,
  offsetY = 0
): { x: number; startY: number; restY: number; exitY: number } {
  const x = width / 2 + offsetX;

  switch (position) {
    case 'bottom':
      return {
        x,
        startY: height - TOAST_EDGE_MARGIN + offsetY,
        restY: height - TOAST_EDGE_MARGIN - TOAST_ANIMATION_OFFSET + offsetY,
        exitY: height - TOAST_EDGE_MARGIN + TOAST_ANIMATION_OFFSET + offsetY,
      };
    case 'top':
    default:
      return {
        x,
        restY: TOAST_EDGE_MARGIN + offsetY,
        exitY: TOAST_EDGE_MARGIN + TOAST_ANIMATION_OFFSET + offsetY,
        startY: TOAST_EDGE_MARGIN - TOAST_ANIMATION_OFFSET + offsetY,
      };
  }
}

export class ToastManager {
  private showing = false;
  private queue: ToastOptions[] = [];
  private game: Phaser.Game | null = null;

  init(game: Phaser.Game): void {
    this.game = game;
  }

  show(options: ToastOptions): void {
    this.queue.push(options);
    if (!this.showing) void this.processQueue();
  }

  private getActiveScene(): Phaser.Scene | null {
    if (!this.game) return null;
    const scenes = this.game.scene.getScenes(true);
    return scenes[scenes.length - 1] ?? null;
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.showing = false;
      return;
    }

    this.showing = true;
    const options = this.queue.shift()!;
    await this.displayToast(options);
    void this.processQueue();
  }

  private displayToast(options: ToastOptions): Promise<void> {
    return new Promise((resolve) => {
      const scene = this.getActiveScene();
      if (!scene) {
        resolve();
        return;
      }

      const { width, height } = scene.cameras.main;
      const type = options.type ?? 'info';
      const duration = options.duration ?? 2500;
      const position = options.position ?? 'top';
      const { x, startY, restY, exitY } = resolveToastCoords(
        width,
        height,
        position,
        options.offset?.x,
        options.offset?.y
      );

      const container = scene.add.container(x, startY);
      container.setDepth(2000);

      const bg = scene.add.rectangle(0, 0, width * 0.85, 48, TOAST_COLORS[type], 0.95);
      bg.setStrokeStyle(1, 0xffffff, 0.3);

      const text = scene.add.text(0, 0, options.message, {
        color: '#ffffff',
        fontSize: '16px',
        fontFamily: FREDOKA_FONT,
      });
      text.setOrigin(0.5);

      container.add([bg, text]);
      container.setAlpha(0);

      scene.tweens.add({
        targets: container,
        alpha: 1,
        y: restY,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
          scene.time.delayedCall(duration, () => {
            scene.tweens.add({
              targets: container,
              alpha: 0,
              y: exitY,
              duration: 200,
              onComplete: () => {
                container.destroy();
                resolve();
              },
            });
          });
        },
      });
    });
  }
}

export const toast = new ToastManager();
