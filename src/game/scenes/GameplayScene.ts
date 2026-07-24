import Phaser from 'phaser';

import { gameConfig } from '@game/config';
import { eventBus } from '@platform/core/events';
import { getHighScore } from '@platform/ui';
import { randomSpawnLevel } from '@game/fruits';
import { GameplayHUD } from '@game/ui/GameplayHUD';
import {
  CONTAINER_INSET,
  DangerLineSystem,
  DropController,
  FruitFactory,
  MergeSystem,
  SkillBarView,
  SkillController,
  clearGameRunSave,
  isMeaningfulRun,
  loadGameRunSave,
  saveGameRun,
  type FruitBody,
  type GameRunSnapshot,
} from '@game/gameplay';

/**
 * Suika-style merge gameplay — composition root for gameplay systems.
 */
export class GameplayScene extends Phaser.Scene {
  private hud!: GameplayHUD;
  private score = 0;
  private merges = 0;
  private startTime = 0;
  private gameActive = true;
  private returnTo = 'Home';
  private sessionEnded = false;
  private sessionStarted = false;
  private startingHighScore = 0;
  private canDrop = true;

  private currentLevel = 0;
  private nextLevel = 0;
  private dangerY = 0;

  private readonly fruits = new Set<FruitBody>();
  private factory!: FruitFactory;
  private mergeSystem!: MergeSystem;
  private dropController!: DropController;
  private dangerLine!: DangerLineSystem;
  private skillBar!: SkillBarView;
  private skills!: SkillController;
  private undoSnapshot: GameRunSnapshot | null = null;

  private unsubscribers: Array<() => void> = [];
  private readonly onPointerMove = (pointer: Phaser.Input.Pointer) =>
    this.handlePointerMove(pointer);
  private readonly onPointerUp = (pointer: Phaser.Input.Pointer) => this.handlePointerUp(pointer);
  private readonly onPointerDown = (pointer: Phaser.Input.Pointer) =>
    this.skillBar.onPointerDown(pointer);
  private readonly onCollision = (
    _event: Phaser.Physics.Matter.Events.CollisionStartEvent,
    bodyA: MatterJS.BodyType,
    bodyB: MatterJS.BodyType
  ) => this.mergeSystem.handleCollision(bodyA, bodyB);

  constructor() {
    super({ key: 'Gameplay' });
  }

  init(data: { returnTo?: string } = {}): void {
    this.returnTo = data.returnTo ?? 'Home';
  }

  create(): void {
    this.cleanupEventListeners();
    this.fruits.clear();

    const { width, height } = this.cameras.main;
    const saved = loadGameRunSave();

    this.startTime = Date.now();
    this.score = 0;
    this.merges = 0;
    this.gameActive = true;
    this.sessionEnded = false;
    this.sessionStarted = false;
    this.canDrop = true;
    this.startingHighScore = getHighScore();
    this.undoSnapshot = null;

    this.factory = new FruitFactory(this, this.fruits);
    this.factory.reset();

    this.mergeSystem = new MergeSystem(this.fruits, this.factory, {
      isActive: () => this.gameActive,
      onScore: (points) => this.addScore(points),
      onMerge: () => {
        this.merges += 1;
      },
    });
    this.mergeSystem.reset();

    this.dropController = new DropController(this, {
      isActive: () => this.gameActive,
      canDrop: () => this.canDrop,
      setCanDrop: (value) => {
        this.canDrop = value;
      },
      hasActiveSkill: () => this.skills.active !== null,
      onBeforeDrop: () => this.pushUndoCheckpoint(),
      onFirstDrop: () => {
        if (this.sessionStarted) return;
        this.sessionStarted = true;
        this.startTime = Date.now();
        eventBus.emit('game:start', { gameId: gameConfig.id });
      },
      onDropped: (level) => {
        this.factory.spawn(this.dropController.x, this.dropController.y, level);
      },
      getCurrentLevel: () => this.currentLevel,
      advanceLevels: () => {
        this.currentLevel = this.nextLevel;
        this.nextLevel = randomSpawnLevel();
      },
    });

    this.dangerLine = new DangerLineSystem(this.fruits, {
      isActive: () => this.gameActive,
      canDrop: () => this.canDrop,
      onGameOver: (violators) => this.triggerGameOver(violators),
    });

    this.skillBar = new SkillBarView(this, {
      onSkillPressed: (id) => this.skills.onSkillPressed(id),
      getSelectedSkillId: () => this.skills.selectedSkillId,
    });

    this.skills = new SkillController(this, this.factory, this.skillBar, {
      isActive: () => this.gameActive,
      canDrop: () => this.canDrop,
      getCurrentLevel: () => this.currentLevel,
      getNextLevel: () => this.nextLevel,
      setLevels: (current, next) => {
        this.currentLevel = current;
        this.nextLevel = next;
      },
      refreshDropper: () => this.dropController.refreshVisual(),
      hideDropper: () => this.dropController.hide(),
      pushUndoCheckpoint: () => this.pushUndoCheckpoint(),
      canUndo: () => this.undoSnapshot != null,
      undoLastMove: () => this.applyUndo(),
    });
    this.skills.reset();

    this.matter.world.setBounds(0, 0, width, height, 64, false, false, false, false);

    this.addBackgroundImage(width, height);
    this.factory.ensureTextures();
    this.createContainer(width, height);
    this.skillBar.create(width, height);

    this.hud = new GameplayHUD(this, {
      onBack: () => {
        if (this.gameActive) {
          this.abortSession();
          this.scene.start(this.returnTo);
        }
      },
      onQuit: () => {
        if (this.gameActive) {
          this.quitSession();
          this.scene.start(this.returnTo);
        }
      },
    });

    if (saved && isMeaningfulRun(saved)) {
      this.restoreRun(saved);
    } else {
      this.hud.setScore(0);
      this.currentLevel = randomSpawnLevel();
      this.nextLevel = randomSpawnLevel();
      this.dropController.refreshVisual();
    }

    this.input.on('pointerdown', this.onPointerDown);
    this.input.on('pointermove', this.onPointerMove);
    this.input.on('pointerup', this.onPointerUp);
    this.matter.world.on('collisionstart', this.onCollision);
    this.matter.world.on('collisionactive', this.onCollision);

    eventBus.emit('ad:context:change', { context: 'GAMEPLAY' });

    this.unsubscribers.push(
      eventBus.on('app:back', () => {
        if (!this.gameActive) return;
        if (this.skills.active) {
          this.skills.clear();
          return;
        }
        this.abortSession();
        this.scene.start(this.returnTo);
      }),
      eventBus.on('app:pause', () => {
        if (!this.gameActive || this.sessionEnded) return;
        this.persistRun();
      })
    );
  }

  shutdown(): void {
    // Leaving via back already aborted; leaving via GameOver already completed.
    // Any other teardown should not fire interstitial / sync as a finished match.
    this.abortSession();
    this.cleanupEventListeners();
    this.fruits.clear();
  }

  update(): void {
    if (!this.gameActive) return;
    this.mergeSystem.flushMergeQueue();
    this.mergeSystem.queueProximityMerges();
    this.mergeSystem.flushMergeQueue();
    this.dropController.updateGuide();
    this.dangerLine.check();
  }

  private cleanupEventListeners(): void {
    this.input.off('pointermove', this.onPointerMove);
    this.input.off('pointerup', this.onPointerUp);
    this.input.off('pointerdown', this.onPointerDown);
    this.matter.world?.off('collisionstart', this.onCollision);
    this.matter.world?.off('collisionactive', this.onCollision);
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
  }

  /** Leave mid-run and persist progress — keep high-score checkpoint, not a finished match. */
  private abortSession(): void {
    if (this.sessionEnded) return;
    this.sessionEnded = true;
    this.gameActive = false;

    this.persistRun();

    if (!this.sessionStarted) return;
    eventBus.emit('score:update', { score: this.score });
  }

  /** Explicit quit — discard run save and return home without restoring later. */
  private quitSession(): void {
    if (this.sessionEnded) return;
    this.sessionEnded = true;
    this.gameActive = false;
    clearGameRunSave();

    if (!this.sessionStarted) return;
    eventBus.emit('score:update', { score: this.score });
  }

  /** Real game-over — analytics, interstitial, offline score sync. */
  private completeSession(): void {
    if (this.sessionEnded) return;
    this.sessionEnded = true;
    this.gameActive = false;
    clearGameRunSave();

    if (!this.sessionStarted) return;

    const duration = Date.now() - this.startTime;
    eventBus.emit('score:update', { score: this.score });
    eventBus.emit('game:over', {
      score: this.score,
      duration,
      jumps: this.merges,
    });
  }

  private captureRun(): GameRunSnapshot {
    const fruits = [...this.fruits]
      .filter((fruit) => fruit.active && !fruit.isMerging)
      .map((fruit) => {
        const body = fruit.body as MatterJS.BodyType;
        return {
          x: fruit.x,
          y: fruit.y,
          level: fruit.fruitLevel,
          scoreMultiplier: fruit.scoreMultiplier,
          vx: body.velocity?.x ?? 0,
          vy: body.velocity?.y ?? 0,
          angularVelocity: body.angularVelocity ?? 0,
        };
      });

    return {
      version: 1,
      score: this.score,
      merges: this.merges,
      elapsedMs: this.sessionStarted ? Date.now() - this.startTime : 0,
      sessionStarted: this.sessionStarted,
      currentLevel: this.currentLevel,
      nextLevel: this.nextLevel,
      dropperX: this.dropController.x,
      fruits,
    };
  }

  private pushUndoCheckpoint(): void {
    this.undoSnapshot = this.captureRun();
  }

  private applyUndo(): void {
    const saved = this.undoSnapshot;
    if (!saved) return;

    this.undoSnapshot = null;
    for (const fruit of [...this.fruits]) {
      this.factory.destroy(fruit);
    }
    this.restoreRun(saved);
  }

  private persistRun(): void {
    const snapshot = this.captureRun();
    if (!isMeaningfulRun(snapshot)) {
      clearGameRunSave();
      return;
    }
    saveGameRun(snapshot);
  }

  private restoreRun(saved: GameRunSnapshot): void {
    this.score = saved.score;
    this.merges = saved.merges;
    this.sessionStarted = saved.sessionStarted;
    this.startTime = Date.now() - saved.elapsedMs;
    this.currentLevel = saved.currentLevel;
    this.nextLevel = saved.nextLevel;
    this.canDrop = true;

    this.hud.setScore(this.score);
    this.dropController.setDropperX(saved.dropperX);
    this.dropController.refreshVisual();

    for (const fruit of saved.fruits) {
      const spawned = this.factory.spawn(fruit.x, fruit.y, fruit.level, fruit.scoreMultiplier);
      spawned.setVelocity(fruit.vx, fruit.vy);
      spawned.setAngularVelocity(fruit.angularVelocity);
    }
  }

  private addBackgroundImage(width: number, height: number): void {
    const bg = this.add.image(width / 2, height / 2, 'general-background-image');
    const scale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(scale).setDepth(-1);
  }

  private createContainer(width: number, height: number): void {
    const displayW = Math.min(width * 0.88, 520);
    const texture = this.textures.get('glass-container').getSourceImage() as HTMLImageElement;
    const aspect = texture.height / texture.width;
    const displayH = displayW * aspect;
    const centerX = width / 2;
    const centerY = Math.min(height * 0.50, height - 200 - displayH / 2);

    const container = this.add.image(centerX, centerY, 'glass-container');
    container.setDisplaySize(displayW, displayH);
    container.setDepth(2);

    const left = centerX - displayW / 2 + displayW * CONTAINER_INSET.left;
    const right = centerX + displayW / 2 - displayW * CONTAINER_INSET.right;
    const top = centerY - displayH / 2 + displayH * CONTAINER_INSET.top;
    const bottom = centerY + displayH / 2 - displayH * CONTAINER_INSET.bottom;

    this.dangerY = top + 36;
    this.dangerLine.setDangerY(this.dangerY);

    const wallThickness = 40;
    const wallH = bottom - top + wallThickness;
    const floorW = right - left + wallThickness;

    this.matter.add.rectangle(left - wallThickness / 2, top + wallH / 2, wallThickness, wallH, {
      isStatic: true,
      label: 'wall',
      friction: 0.4,
    });
    this.matter.add.rectangle(right + wallThickness / 2, top + wallH / 2, wallThickness, wallH, {
      isStatic: true,
      label: 'wall',
      friction: 0.4,
    });
    this.matter.add.rectangle(centerX, bottom + wallThickness / 2, floorW, wallThickness, {
      isStatic: true,
      label: 'floor',
      friction: 0.5,
    });

    this.dropController.setupVisuals(
      { left, right, top, bottom, centerX },
      top - 28
    );
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.skillBar.onPointerMove(pointer)) return;
    this.dropController.handlePointerMove(pointer);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.skillBar.onPointerUp(pointer)) return;

    if (!this.gameActive) return;

    if (this.skills.active) {
      this.skills.handlePointer(pointer);
      return;
    }

    this.dropController.tryDrop(pointer);
  }

  private addScore(points: number): void {
    this.score += points;
    this.hud.setScore(this.score);
    eventBus.emit('score:update', { score: this.score });
  }

  private triggerGameOver(violators: FruitBody[]): void {
    if (!this.gameActive) return;

    clearGameRunSave();

    const isNewRecord = this.score > this.startingHighScore;
    this.gameActive = false;
    this.canDrop = false;
    this.skills.clear();
    this.dropController.hide();

    this.matter.world.pause();
    this.dangerLine.flashViolators(this, violators);

    this.time.delayedCall(3000, () => {
      this.completeSession();
      this.scene.start('GameOver', {
        score: this.score,
        jumps: this.merges,
        returnTo: this.returnTo,
        isNewRecord,
      });
    });
  }
}
