import Phaser from 'phaser';

import { FREDOKA_FONT } from '../typography';
import type { UIToastType, ToastOptions } from '../types';

const TOAST_COLORS: Record<UIToastType, number> = {
  info: 0x4a90d9,
  error: 0xf44336,
  success: 0x4caf50,
  warning: 0xff9800,
};

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

      const container = scene.add.container(width / 2, height - 80);
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
        y: height - 100,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
          scene.time.delayedCall(duration, () => {
            scene.tweens.add({
              targets: container,
              alpha: 0,
              y: height - 60,
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
