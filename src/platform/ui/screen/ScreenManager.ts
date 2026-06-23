import Phaser from 'phaser';

import { createUIButton } from '../button/UIButton';
import type { IUIScreen, UIScreenId } from '../types';

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
    screenManager.close(this.id);
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
  ): Phaser.GameObjects.GameObject {
    const button = createUIButton(this.scene, {
      x,
      y,
      label: text,
      onClick,
      width,
      height,
    });
    this.add(button);
    return button;
  }
}

export class ScreenManager {
  private screens = new Map<UIScreenId, IUIScreen>();
  private activeStack: UIScreenId[] = [];

  register(screen: IUIScreen): void {
    const existing = this.screens.get(screen.id);
    if (existing) {
      existing.destroy();
      const idx = this.activeStack.indexOf(screen.id);
      if (idx >= 0) this.activeStack.splice(idx, 1);
    }
    this.screens.set(screen.id, screen);
  }

  unregisterForScene(scene: Phaser.Scene): void {
    for (const [id, screen] of this.screens) {
      if (screen instanceof BaseScreen && screen.scene === scene) {
        screen.destroy();
        this.screens.delete(id);
        const idx = this.activeStack.indexOf(id);
        if (idx >= 0) this.activeStack.splice(idx, 1);
      }
    }
  }

  open(id: UIScreenId, data?: Record<string, unknown>): void {
    const screen = this.screens.get(id);
    if (!screen) return;

    const current = this.activeStack[this.activeStack.length - 1];
    if (current === id) {
      screen.open(data);
      return;
    }

    if (current) {
      this.screens.get(current)?.hide();
    }

    screen.open(data);
    this.activeStack.push(id);
  }

  close(id?: UIScreenId): void {
    const targetId = id ?? this.activeStack[this.activeStack.length - 1];
    if (!targetId) return;

    const wasTop = this.activeStack[this.activeStack.length - 1] === targetId;
    const idx = this.activeStack.lastIndexOf(targetId);
    if (idx >= 0) this.activeStack.splice(idx, 1);

    this.screens.get(targetId)?.hide();

    if (wasTop) {
      const previous = this.activeStack[this.activeStack.length - 1];
      if (previous) {
        this.screens.get(previous)?.show();
      }
    }
  }

  replace(id: UIScreenId, data?: Record<string, unknown>): void {
    const current = this.activeStack.pop();
    if (current) this.screens.get(current)?.hide();
    this.open(id, data);
  }

  getActive(): UIScreenId | undefined {
    return this.activeStack[this.activeStack.length - 1];
  }
}

export const screenManager = new ScreenManager();
