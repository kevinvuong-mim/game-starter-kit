import Phaser from 'phaser';

import { FONT_FAMILY } from '../typography';
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
  private scene: Phaser.Scene | null = null;

  init(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  show(options: ToastOptions): void {
    this.queue.push(options);
    if (!this.showing) void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (!this.scene || this.queue.length === 0) {
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
      if (!this.scene) {
        resolve();
        return;
      }

      const { width, height } = this.scene.cameras.main;
      const type = options.type ?? 'info';
      const duration = options.duration ?? 2500;

      const container = this.scene.add.container(width / 2, height - 80);
      container.setDepth(2000);

      const bg = this.scene.add.rectangle(0, 0, width * 0.85, 48, TOAST_COLORS[type], 0.95);
      bg.setStrokeStyle(1, 0xffffff, 0.3);

      const text = this.scene.add.text(0, 0, options.message, {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: FONT_FAMILY,
      });
      text.setOrigin(0.5);

      container.add([bg, text]);
      container.setAlpha(0);

      this.scene.tweens.add({
        targets: container,
        alpha: 1,
        y: height - 100,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
          this.scene?.time.delayedCall(duration, () => {
            this.scene?.tweens.add({
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
