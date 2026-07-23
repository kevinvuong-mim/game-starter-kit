import type Phaser from 'phaser';

import { FRUIT_TYPES } from '@game/fruits';
import type { FruitBody } from './types';

export type DangerLineCallbacks = {
  isActive: () => boolean;
  canDrop: () => boolean;
  onGameOver: (violators: FruitBody[]) => void;
};

export class DangerLineSystem {
  private dangerY = 0;

  constructor(
    private readonly fruits: Set<FruitBody>,
    private readonly callbacks: DangerLineCallbacks
  ) {}

  setDangerY(y: number): void {
    this.dangerY = y;
  }

  check(): void {
    if (!this.callbacks.isActive() || !this.callbacks.canDrop()) return;

    const violators: FruitBody[] = [];
    for (const fruit of this.fruits) {
      if (fruit.isMerging || !fruit.active || !fruit.body) continue;
      const body = fruit.body as MatterJS.BodyType;
      if (!body.velocity) continue;
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      if (speed > 0.35) continue;
      if (fruit.y - FRUIT_TYPES[fruit.fruitLevel].radius < this.dangerY) {
        violators.push(fruit);
      }
    }

    if (violators.length > 0) {
      this.callbacks.onGameOver(violators);
    }
  }

  flashViolators(scene: Phaser.Scene, violators: FruitBody[], flashMs = 3000): void {
    const blinkMs = 180;
    const targets = violators.filter((fruit) => fruit.active);
    for (const fruit of targets) {
      fruit.setTint(0xff3b3b);
      scene.tweens.add({
        targets: fruit,
        alpha: 0.2,
        duration: blinkMs,
        yoyo: true,
        repeat: Math.ceil(flashMs / (blinkMs * 2)) - 1,
      });
    }
  }
}
