import Phaser from 'phaser';

import { FREDOKA_FONT } from '../typography';
import type { IUIScreen, UIScreenId, UIScreenConfig } from '../types';

export abstract class BaseScreen extends Phaser.GameObjects.Container implements IUIScreen {
  abstract readonly id: string;
  protected overlay?: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x = 0, y = 0) {
    super(scene, x, y);
    scene.add.existing(this);
    this.setVisible(false);
    this.setDepth(1000);
  }

  open(data?: Record<string, unknown>): void {
    this.show(data);
  }

  close(): void {
    this.hide();
  }

  show(data?: Record<string, unknown>): void {
    void data;
    this.setVisible(true);
    this.setActive(true);
  }

  hide(): void {
    this.setVisible(false);
    this.setActive(false);
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(fromScene?: boolean): void {
    this.overlay?.destroy();
    super.destroy(fromScene);
  }

  protected createOverlay(alpha = 0.6): void {
    const { width, height } = this.scene.cameras.main;
    this.overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, alpha);
    this.overlay.setOrigin(0);
    this.add(this.overlay);
  }

  protected createButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void,
    width = 200,
    height = 50
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x4a90d9, 1);
    bg.setStrokeStyle(2, 0xffffff);
    bg.setInteractive({ useHandCursor: true });

    const label = this.scene.add.text(0, 0, text, {
      color: '#ffffff',
      fontSize: '20px',
      fontFamily: FREDOKA_FONT,
    });
    label.setOrigin(0.5);

    bg.on('pointerdown', onClick);
    container.add([bg, label]);
    this.add(container);
    return container;
  }
}

export class ScreenManager {
  private screens = new Map<UIScreenId, IUIScreen>();
  private activeStack: UIScreenId[] = [];

  register(screen: IUIScreen): void {
    this.screens.set(screen.id, screen);
  }

  open(id: UIScreenId, data?: Record<string, unknown>): void {
    const screen = this.screens.get(id);
    if (!screen) return;

    const current = this.activeStack[this.activeStack.length - 1];
    if (current) {
      this.screens.get(current)?.hide();
    }

    screen.open(data);
    this.activeStack.push(id);
  }

  close(id?: UIScreenId): void {
    const targetId = id ?? this.activeStack.pop();
    if (!targetId) return;

    const screen = this.screens.get(targetId);
    screen?.close();

    if (!id) {
      const previous = this.activeStack[this.activeStack.length - 1];
      if (previous) {
        this.screens.get(previous)?.show();
      }
    } else {
      const idx = this.activeStack.indexOf(targetId);
      if (idx >= 0) this.activeStack.splice(idx, 1);
    }
  }

  replace(id: UIScreenId, data?: Record<string, unknown>): void {
    const current = this.activeStack.pop();
    if (current) this.screens.get(current)?.close();
    this.open(id, data);
  }

  getActive(): UIScreenId | undefined {
    return this.activeStack[this.activeStack.length - 1];
  }
}

export const screenManager = new ScreenManager();

export function registerScreen(config: UIScreenConfig): void {
  if (config.scene) {
    // Screens self-register via scene create
    void config;
  }
}
