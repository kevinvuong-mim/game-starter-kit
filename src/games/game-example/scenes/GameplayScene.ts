import Phaser from 'phaser';
import { eventBus } from '@core/events';
import { HUD } from '@ui/hud/HUD';
import { ObjectPool } from '@core/utils';

interface FallingObject {
  sprite: Phaser.GameObjects.Arc;
  speed: number;
}

/**
 * Example gameplay scene - tap to jump, collect coins, avoid obstacles.
 * Demonstrates game layer rules: only emits events, no platform logic.
 */
export class GameplayScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private score = 0;
  private jumps = 0;
  private hud!: HUD;
  private isJumping = false;
  private gameActive = true;
  private startTime = 0;
  private pool!: ObjectPool<FallingObject>;
  private activeObjects = new Set<FallingObject>();
  private spawnTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'Gameplay' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.startTime = Date.now();
    this.score = 0;
    this.jumps = 0;
    this.gameActive = true;

    this.add.rectangle(width / 2, height / 2, width, height, 0x16213e);

    // Ground
    this.add.rectangle(width / 2, height - 40, width, 80, 0x0f3460);

    // Player
    this.player = this.add.circle(120, height - 80, 24, 0x4a90d9);
    this.player.setStrokeStyle(3, 0xffffff);

    this.hud = new HUD(this);
    this.hud.setScore(0);

    this.pool = new ObjectPool<FallingObject>(
      () => ({
        sprite: this.add.circle(0, 0, 16, 0xffd700),
        speed: 0,
      }),
      (obj) => {
        obj.sprite.setVisible(false);
        obj.sprite.setActive(false);
      },
      20
    );

    this.input.on('pointerdown', () => this.jump());
    this.input.keyboard?.on('keydown-SPACE', () => this.jump());

    this.spawnTimer = this.time.addEvent({
      delay: 1200,
      callback: () => this.spawnObject(),
      loop: true,
    });

    eventBus.emit('game:start', { gameId: 'game-example' });
  }

  update(_time: number, delta: number): void {
    if (!this.gameActive) return;

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

    // Gravity
    const groundY = this.cameras.main.height - 80;
    if (this.isJumping || this.player.y < groundY) {
      this.player.y += 400 * (delta / 1000);
      if (this.player.y >= groundY) {
        this.player.y = groundY;
        this.isJumping = false;
      }
    }
  }

  private jump(): void {
    if (!this.gameActive || this.isJumping) return;
    this.isJumping = true;
    this.jumps++;
    eventBus.emit('jump', { count: 1 });

    this.tweens.add({
      targets: this.player,
      y: this.player.y - 120,
      duration: 300,
      ease: 'Power2',
      yoyo: false,
    });
  }

  private spawnObject(): void {
    if (!this.gameActive) return;
    const { width, height } = this.cameras.main;
    const isCoin = Math.random() > 0.3;

    const obj = this.pool.acquire();
    this.activeObjects.add(obj);
    obj.speed = 150 + Math.random() * 100;
    obj.sprite.setFillStyle(isCoin ? 0xffd700 : 0xf44336);
    obj.sprite.setPosition(width + 20, height - 80 - Math.random() * 100);
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

  private gameOver(): void {
    if (!this.gameActive) return;
    this.gameActive = false;
    this.spawnTimer?.destroy();

    const duration = Date.now() - this.startTime;
    eventBus.emit('game:over', { score: this.score, duration });
    eventBus.emit('score:update', { score: this.score });

    this.time.delayedCall(500, () => {
      this.scene.start('GameOver', { score: this.score, jumps: this.jumps });
    });
  }
}
