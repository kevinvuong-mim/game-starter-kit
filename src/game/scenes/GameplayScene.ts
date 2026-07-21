import Phaser from 'phaser';

import { gameConfig } from '@game/config';
import { HUD } from '@platform/ui/hud/HUD';
import { eventBus } from '@platform/core/events';
import { ObjectPool } from '@game/utils/ObjectPool';
import { getEquippedPlayerColor } from '@platform/ui';

interface FallingObject {
  speed: number;
  sprite: Phaser.GameObjects.Arc;
}

/**
 * Example gameplay — tap to jump (double jump), collect coins, avoid obstacles.
 * Replace this scene with your own game mechanics.
 */
export class GameplayScene extends Phaser.Scene {
  private readonly maxJumps = 5;
  private readonly gravity = 1500;
  private readonly jumpVelocity = -600;

  private hud!: HUD;
  private jumps = 0;
  private score = 0;
  private groundY = 0;
  private startTime = 0;
  private velocityY = 0;
  private gameActive = true;
  private jumpsRemaining = 0;
  private sessionEnded = false;
  private player!: Phaser.GameObjects.Arc;
  private pool!: ObjectPool<FallingObject>;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private unsubscribers: Array<() => void> = [];
  private activeObjects = new Set<FallingObject>();
  private readonly onPointerDown = () => this.jump();
  private readonly onSpaceKeyDown = () => this.jump();

  constructor() {
    super({ key: 'Gameplay' });
  }

  create(): void {
    this.cleanupEventListeners();

    const { width, height } = this.cameras.main;
    this.startTime = Date.now();
    this.score = 0;
    this.jumps = 0;
    this.jumpsRemaining = this.maxJumps;
    this.gameActive = true;
    this.sessionEnded = false;

    this.addBackgroundImage(width, height);

    this.player = this.add.circle(120, height - 160, 24, getEquippedPlayerColor());
    this.player.setStrokeStyle(3, 0xffffff);
    this.groundY = height - 140;
    this.velocityY = 0;

    this.hud = new HUD(this);
    this.hud.setScore(0);

    this.pool = new ObjectPool<FallingObject>(
      () => {
        const sprite = this.add.circle(0, 0, 16, 0xffd700);
        sprite.setVisible(false);
        sprite.setActive(false);
        return { sprite, speed: 0 };
      },
      (obj) => {
        obj.sprite.setVisible(false);
        obj.sprite.setActive(false);
      },
      20
    );

    this.input.on('pointerdown', this.onPointerDown);
    this.input.keyboard?.on('keydown-SPACE', this.onSpaceKeyDown);

    this.spawnTimer = this.time.addEvent({
      delay: 1200,
      callback: () => this.spawnObject(),
      loop: true,
    });

    eventBus.emit('game:start', { gameId: gameConfig.id });
    eventBus.emit('ad:context:change', { context: 'GAMEPLAY' });

    this.unsubscribers.push(
      eventBus.on('app:back', () => {
        if (this.gameActive) {
          this.endSession();
          this.scene.start('Home');
        }
      })
    );
  }

  shutdown(): void {
    this.endSession();
    this.spawnTimer?.destroy();
    for (const obj of this.activeObjects) {
      this.pool.release(obj);
    }
    this.activeObjects.clear();
    this.cleanupEventListeners();
  }

  private cleanupEventListeners(): void {
    this.input.off('pointerdown', this.onPointerDown);
    this.input.keyboard?.off('keydown-SPACE', this.onSpaceKeyDown);
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
  }

  private endSession(): void {
    if (this.sessionEnded) return;
    this.sessionEnded = true;
    this.gameActive = false;
    this.spawnTimer?.destroy();

    const duration = Date.now() - this.startTime;
    // score:update before game:over so save handlers see the final highScore.
    eventBus.emit('score:update', { score: this.score });
    eventBus.emit('game:over', { score: this.score, duration, jumps: this.jumps });
  }

  update(_time: number, delta: number): void {
    if (!this.gameActive) return;

    this.updatePlayer(delta);

    for (const obj of [...this.activeObjects]) {
      const child = obj.sprite;
      if (!child.active || !child.visible) continue;

      child.x -= obj.speed * (delta / 1000);
      if (child.x < -20) {
        this.releaseObject(obj);
        continue;
      }

      if (Phaser.Math.Distance.Between(child.x, child.y, this.player.x, this.player.y) < 40) {
        if (child.fillColor === 0xffd700) {
          this.collectCoin(obj);
        } else if (child.fillColor === 0xf44336) {
          this.gameOver();
        }
      }
    }
  }

  private updatePlayer(delta: number): void {
    const dt = delta / 1000;

    this.velocityY += this.gravity * dt;
    this.player.y += this.velocityY * dt;

    if (this.player.y >= this.groundY) {
      this.player.y = this.groundY;
      this.velocityY = 0;
      this.jumpsRemaining = this.maxJumps;
    }
  }

  private jump(): void {
    if (!this.gameActive || this.jumpsRemaining <= 0) return;

    this.jumpsRemaining--;
    this.jumps++;
    eventBus.emit('jump', { count: 1 });
    this.velocityY = this.jumpVelocity;
  }

  private spawnObject(): void {
    if (!this.gameActive) return;
    const { width, height } = this.cameras.main;
    const isCoin = Math.random() > 0.3;

    const obj = this.pool.acquire();
    this.activeObjects.add(obj);
    obj.speed = 150 + Math.random() * 100;
    obj.sprite.setFillStyle(isCoin ? 0xffd700 : 0xf44336);
    obj.sprite.setPosition(width + 20, height - 160 - Math.random() * 100);
    obj.sprite.setVisible(true);
    obj.sprite.setActive(true);
  }

  private releaseObject(obj: FallingObject): void {
    this.activeObjects.delete(obj);
    this.pool.release(obj);
  }

  private collectCoin(obj: FallingObject): void {
    this.score += 10;
    this.hud.setScore(this.score);
    eventBus.emit('score:update', { score: this.score });
    eventBus.emit('coin:add', { amount: 1, source: 'gameplay' });
    eventBus.emit('collect', { itemId: 'coin', count: 1 });
    this.releaseObject(obj);
  }

  private addBackgroundImage(width: number, height: number): void {
    const bg = this.add.image(width / 2, height / 2, 'background-image');
    const scale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(scale).setDepth(-1);
  }

  private gameOver(): void {
    if (!this.gameActive) return;
    this.endSession();

    this.time.delayedCall(500, () => {
      this.scene.start('GameOver', { score: this.score, jumps: this.jumps });
    });
  }
}
