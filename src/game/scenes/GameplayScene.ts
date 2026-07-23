import Phaser from 'phaser';

import { gameConfig } from '@game/config';
import { HUD } from '@platform/ui/hud/HUD';
import { eventBus } from '@platform/core/events';
import { FREDOKA_FONT } from '@platform/ui/fonts';
import { createUIButton } from '@platform/ui/button/UIButton';
import type { UIButton } from '@platform/ui/types';
import { drawRoundedRect } from '@platform/ui/panel/graphics';
import {
  PANEL_BG,
  TEXT_COLOR,
  PANEL_BORDER,
  PANEL_CORNER_RADIUS,
} from '@platform/ui/panel/panelTheme';
import {
  SKILL_IDS,
  type SkillId,
  getHighScore,
  getSkillQuantity,
  consumeSkill,
  t,
} from '@platform/ui';
import { FRUIT_TYPES, fruitTextureKey, randomSpawnLevel } from '@game/fruits';

type FruitBody = Phaser.Physics.Matter.Image & {
  fruitLevel: number;
  isMerging: boolean;
  scoreMultiplier: number;
};

type ActiveSkill =
  | { kind: 'hammer' }
  | { kind: 'swap'; selected?: FruitBody }
  | { kind: 'double' }
  | { kind: 'size' }
  | null;

const SKILL_ICONS: Record<SkillId, string> = {
  boost_hammer: 'shop-item-1',
  boost_change: 'shop-item-2',
  boost_swap: 'shop-item-3',
  boost_double: 'shop-item-4',
  boost_size: 'shop-item-5',
};

const SKILL_PILL_HEIGHT = 40;
const SKILL_PILL_RADIUS = 18;
const SKILL_PILL_OVERLAP = 18;
const SKILL_TAB_GREEN = 0x1f6b32;
const SKILL_TAB_GREEN_BORDER = 0x145024;

/** Inner play-area ratios relative to glass-container.png display size. */
const CONTAINER_INSET = {
  left: 0.09,
  right: 0.09,
  top: 0.06,
  bottom: 0.1,
};

/**
 * Suika-style merge gameplay — drop fruits, merge matches, use shop skills.
 */
export class GameplayScene extends Phaser.Scene {
  private hud!: HUD;
  private score = 0;
  private merges = 0;
  private startTime = 0;
  private gameActive = true;
  private returnTo = 'Home';
  private sessionEnded = false;
  private startingHighScore = 0;

  private currentLevel = 0;
  private nextLevel = 0;
  private canDrop = true;
  private dropperFruit?: Phaser.GameObjects.Image;
  private dropGuide?: Phaser.GameObjects.Graphics;
  private dropperX = 0;
  private dropY = 0;

  private containerBounds = { left: 0, right: 0, top: 0, bottom: 0, centerX: 0 };
  private dangerY = 0;
  private fruits = new Set<FruitBody>();
  private pendingMerges = new Set<string>();
  private mergeQueue: Array<{ a: FruitBody; b: FruitBody }> = [];
  private fruitSeq = 0;

  private skillButtons = new Map<SkillId, UIButton>();
  private ownedSkillIds: SkillId[] = [];
  private activeSkill: ActiveSkill = null;
  private skillHint?: Phaser.GameObjects.Text;
  private skillTrack?: Phaser.GameObjects.Container;
  private skillTrackBaseX = 0;
  private skillLeftArrow?: Phaser.GameObjects.Text;
  private skillRightArrow?: Phaser.GameObjects.Text;
  private skillScrollIndex = 0;
  private skillSlotSpacing = 110;
  private skillBtnSize = 72;
  private skillBarTop = 0;
  private skillBarBottom = 0;
  private skillSwipeStartX = 0;
  private skillSwipeActive = false;
  private skillDidSwipe = false;
  private readonly skillVisibleCount = 4;

  private unsubscribers: Array<() => void> = [];
  private readonly onPointerMove = (pointer: Phaser.Input.Pointer) =>
    this.handlePointerMove(pointer);
  private readonly onPointerUp = (pointer: Phaser.Input.Pointer) => this.handlePointerUp(pointer);
  private readonly onCollision = (
    _event: Phaser.Physics.Matter.Events.CollisionStartEvent,
    bodyA: MatterJS.BodyType,
    bodyB: MatterJS.BodyType
  ) => this.handleCollision(bodyA, bodyB);

  constructor() {
    super({ key: 'Gameplay' });
  }

  init(data: { returnTo?: string } = {}): void {
    this.returnTo = data.returnTo ?? 'Home';
  }

  create(): void {
    this.cleanupEventListeners();
    this.fruits.clear();
    this.pendingMerges.clear();
    this.mergeQueue = [];
    this.skillButtons.clear();
    this.ownedSkillIds = [];
    this.skillTrack = undefined;
    this.skillLeftArrow = undefined;
    this.skillRightArrow = undefined;
    this.skillScrollIndex = 0;
    this.skillSwipeActive = false;
    this.skillDidSwipe = false;
    this.activeSkill = null;

    const { width, height } = this.cameras.main;
    this.startTime = Date.now();
    this.score = 0;
    this.merges = 0;
    this.gameActive = true;
    this.sessionEnded = false;
    this.canDrop = true;
    this.startingHighScore = getHighScore();

    this.matter.world.setBounds(0, 0, width, height, 64, false, false, false, false);

    this.addBackgroundImage(width, height);
    this.ensureFruitTextures();
    this.createContainer(width, height);
    this.createDropper();
    this.createSkillBar(width, height);

    this.hud = new HUD(this, {
      onBack: () => {
        if (this.gameActive) {
          this.endSession();
          this.scene.start(this.returnTo);
        }
      },
    });
    this.hud.setScore(0);

    this.currentLevel = randomSpawnLevel();
    this.nextLevel = randomSpawnLevel();
    this.refreshDropperVisual();
    this.hud.setNextFruit(fruitTextureKey(this.nextLevel), 40);

    this.skillHint = this.add
      .text(width / 2, this.skillBarBottom + 16, '', {
        color: '#ffffff',
        fontSize: '18px',
        fontStyle: 'bold',
        fontFamily: FREDOKA_FONT,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(520);

    this.input.on('pointerdown', this.onSkillPointerDown);
    this.input.on('pointermove', this.onPointerMove);
    this.input.on('pointerup', this.onPointerUp);
    this.matter.world.on('collisionstart', this.onCollision);
    this.matter.world.on('collisionactive', this.onCollision);

    eventBus.emit('game:start', { gameId: gameConfig.id });
    eventBus.emit('ad:context:change', { context: 'GAMEPLAY' });

    this.unsubscribers.push(
      eventBus.on('app:back', () => {
        if (!this.gameActive) return;
        if (this.activeSkill) {
          this.clearActiveSkill();
          return;
        }
        this.endSession();
        this.scene.start(this.returnTo);
      })
    );
  }

  shutdown(): void {
    this.endSession();
    this.cleanupEventListeners();
    this.fruits.clear();
  }

  update(): void {
    if (!this.gameActive) return;
    // Collision-queued merges first, then catch any same-type pairs that are
    // overlapping without a fresh collisionstart (common once fruits settle).
    this.flushMergeQueue();
    this.queueProximityMerges();
    this.flushMergeQueue();
    this.updateDropGuide();
    this.checkDangerLine();
  }

  private cleanupEventListeners(): void {
    this.input.off('pointermove', this.onPointerMove);
    this.input.off('pointerup', this.onPointerUp);
    this.input.off('pointerdown', this.onSkillPointerDown);
    this.matter.world?.off('collisionstart', this.onCollision);
    this.matter.world?.off('collisionactive', this.onCollision);
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
  }

  private endSession(): void {
    if (this.sessionEnded) return;
    this.sessionEnded = true;
    this.gameActive = false;

    const duration = Date.now() - this.startTime;
    eventBus.emit('score:update', { score: this.score });
    eventBus.emit('game:over', {
      score: this.score,
      duration,
      jumps: this.merges,
    });
  }

  private addBackgroundImage(width: number, height: number): void {
    const bg = this.add.image(width / 2, height / 2, 'general-background-image');
    const scale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(scale).setDepth(-1);
  }

  private ensureFruitTextures(): void {
    for (let level = 0; level < FRUIT_TYPES.length; level++) {
      const key = fruitTextureKey(level);
      if (this.textures.exists(key)) continue;

      const fruit = FRUIT_TYPES[level];
      const r = Math.ceil(fruit.radius);
      const size = r * 2;
      const g = this.make.graphics({ x: 0, y: 0 });

      g.fillStyle(fruit.color, 1);
      g.fillCircle(r, r, r);
      g.lineStyle(Math.max(2, r * 0.06), 0xffffff, 0.35);
      g.strokeCircle(r, r, r - 1);

      // Simple face so colored placeholders feel fruit-like
      const eyeR = Math.max(2, r * 0.12);
      const eyeY = r - r * 0.12;
      g.fillStyle(0x1a1a1a, 1);
      g.fillCircle(r - r * 0.28, eyeY, eyeR);
      g.fillCircle(r + r * 0.28, eyeY, eyeR);
      g.lineStyle(Math.max(2, r * 0.08), 0x1a1a1a, 1);
      g.beginPath();
      g.arc(r, r + r * 0.18, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI, false);
      g.strokePath();

      g.generateTexture(key, size, size);
      g.destroy();
    }
  }

  private createContainer(width: number, height: number): void {
    const displayW = Math.min(width * 0.78, 560);
    const texture = this.textures.get('glass-container').getSourceImage() as HTMLImageElement;
    const aspect = texture.height / texture.width;
    const displayH = displayW * aspect;
    const centerX = width / 2;
    // Leave room for the bottom skills panel (~220px).
    const centerY = Math.min(height * 0.46, height - 220 - displayH / 2);

    const container = this.add.image(centerX, centerY, 'glass-container');
    container.setDisplaySize(displayW, displayH);
    container.setDepth(2);

    const left = centerX - displayW / 2 + displayW * CONTAINER_INSET.left;
    const right = centerX + displayW / 2 - displayW * CONTAINER_INSET.right;
    const top = centerY - displayH / 2 + displayH * CONTAINER_INSET.top;
    const bottom = centerY + displayH / 2 - displayH * CONTAINER_INSET.bottom;

    this.containerBounds = { left, right, top, bottom, centerX };
    this.dangerY = top + 36;
    this.dropY = top - 28;
    this.dropperX = centerX;

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
  }

  private createDropper(): void {
    this.dropGuide = this.add.graphics().setDepth(15);
    this.dropperFruit = this.add.image(this.dropperX, this.dropY, fruitTextureKey(0)).setDepth(20);
  }

  private createSkillBar(width: number, height: number): void {
    const visible = this.skillVisibleCount;
    const btnSize = 72;
    const nameGap = 34;
    const slotHeight = btnSize + nameGap;
    const arrowPad = 36;
    const panelPadTop = SKILL_PILL_OVERLAP + 16;
    const panelPadBottom = 18;
    const panelWidth = Math.min(width * 0.94, 560);
    const panelLeft = width / 2 - panelWidth / 2;
    const innerWidth = panelWidth - arrowPad * 2;
    const spacing = innerWidth / visible;
    this.skillSlotSpacing = spacing;

    const panelHeight = panelPadTop + slotHeight + panelPadBottom;
    const panelTop = height - panelHeight - 120;
    this.skillBarTop = panelTop - SKILL_PILL_HEIGHT + SKILL_PILL_OVERLAP;
    this.skillBarBottom = panelTop + panelHeight;

    // Same section panel + overlapping green pill as LeaderboardPanel
    const panelGfx = this.add.graphics().setDepth(400);
    drawRoundedRect(
      panelGfx,
      panelLeft,
      panelTop,
      panelWidth,
      panelHeight,
      PANEL_CORNER_RADIUS,
      PANEL_BG,
      PANEL_BORDER
    );

    const pillWidth = Math.min(220, panelWidth * 0.58);
    const pillY = panelTop - SKILL_PILL_HEIGHT + SKILL_PILL_OVERLAP;
    const pillGfx = this.add.graphics().setDepth(401);
    drawRoundedRect(
      pillGfx,
      width / 2 - pillWidth / 2,
      pillY,
      pillWidth,
      SKILL_PILL_HEIGHT,
      SKILL_PILL_RADIUS,
      SKILL_TAB_GREEN,
      SKILL_TAB_GREEN_BORDER,
      2
    );
    this.add
      .text(width / 2, pillY + SKILL_PILL_HEIGHT / 2 - 1, t('game.skillsTitle').toUpperCase(), {
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5)
      .setDepth(402);

    const trackCenterY = panelTop + panelPadTop + slotHeight / 2 - 4;
    this.skillTrackBaseX = width / 2;
    this.skillTrack = this.add.container(this.skillTrackBaseX, trackCenterY).setDepth(403);
    this.skillBtnSize = btnSize;
    this.rebuildSkillTrack();

    const windowWidth = spacing * visible;
    const windowHeight = slotHeight + 8;
    const maskShape = this.add.graphics();
    maskShape.setPosition(width / 2, trackCenterY);
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(-windowWidth / 2, -windowHeight / 2, windowWidth, windowHeight);
    maskShape.setVisible(false);
    this.skillTrack.setMask(maskShape.createGeometryMask());

    const arrowStyle = {
      color: '#9e9e9e',
      fontSize: '42px',
      fontStyle: 'bold',
      fontFamily: FREDOKA_FONT,
    };
    this.skillLeftArrow = this.add
      .text(panelLeft + 22, trackCenterY - 10, '‹', arrowStyle)
      .setOrigin(0.5)
      .setDepth(404)
      .setInteractive({ useHandCursor: true });
    this.skillRightArrow = this.add
      .text(panelLeft + panelWidth - 22, trackCenterY - 10, '›', arrowStyle)
      .setOrigin(0.5)
      .setDepth(404)
      .setInteractive({ useHandCursor: true });
    this.skillLeftArrow.on('pointerup', () => {
      if (this.skillDidSwipe) return;
      this.scrollSkills(-1);
    });
    this.skillRightArrow.on('pointerup', () => {
      if (this.skillDidSwipe) return;
      this.scrollSkills(1);
    });

    this.applySkillScroll(false);
  }

  /** Skills the player currently owns (quantity > 0). */
  private getOwnedSkillIds(): SkillId[] {
    return SKILL_IDS.filter((id) => getSkillQuantity(id) > 0);
  }

  private rebuildSkillTrack(): void {
    if (!this.skillTrack) return;

    this.skillTrack.removeAll(true);
    this.skillButtons.clear();
    this.ownedSkillIds = this.getOwnedSkillIds();

    this.ownedSkillIds.forEach((id, index) => {
      const slot = this.createSkillSlot(id, this.skillBtnSize);
      slot.setPosition(this.skillSlotX(index), 0);
      this.skillTrack!.add(slot);
    });

    this.skillScrollIndex = Phaser.Math.Clamp(this.skillScrollIndex, 0, this.maxSkillScrollIndex());
    this.applySkillScroll(false);
  }

  private createSkillSlot(id: SkillId, btnSize: number): Phaser.GameObjects.Container {
    const slot = this.add.container(0, 0);
    const qty = getSkillQuantity(id);

    const button = createUIButton({
      scene: this,
      position: { x: 0, y: -14 },
      size: { width: btnSize, height: btnSize },
      background: { key: SKILL_ICONS[id] },
      badge: {
        content: String(qty),
        visible: true,
        position: { x: btnSize - 24, y: btnSize - 24 },
        minSize: { width: 26, height: 26 },
        padding: { horizontal: 4, vertical: 2 },
        background: { color: '#e53935', radius: 13 },
        textStyle: {
          fontSize: 13,
          fontStyle: 'bold',
          color: '#ffffff',
          border: { width: 2, color: '#000000' },
        },
      },
      onClick: () => {
        if (this.skillDidSwipe) return;
        this.onSkillPressed(id);
      },
    });
    slot.add(button);
    this.skillButtons.set(id, button);

    const label = this.add
      .text(0, btnSize / 2 - 2, t(`shop.items.${id}.name`), {
        color: TEXT_COLOR,
        fontSize: '14px',
        fontStyle: 'bold',
        fontFamily: FREDOKA_FONT,
        align: 'center',
        wordWrap: { width: this.skillSlotSpacing - 6 },
      })
      .setOrigin(0.5, 0);
    slot.add(label);

    return slot;
  }

  private readonly onSkillPointerDown = (pointer: Phaser.Input.Pointer) => {
    if (!this.isPointerOnSkillBar(pointer)) return;
    this.skillSwipeStartX = pointer.x;
    this.skillSwipeActive = true;
    this.skillDidSwipe = false;
  };

  private isPointerOnSkillBar(pointer: Phaser.Input.Pointer): boolean {
    const { width } = this.cameras.main;
    return (
      pointer.y >= this.skillBarTop &&
      pointer.y <= this.skillBarBottom &&
      pointer.x > 20 &&
      pointer.x < width - 20
    );
  }

  private skillSlotX(index: number): number {
    const owned = this.ownedSkillIds.length;
    const alignCount =
      owned <= this.skillVisibleCount ? Math.max(owned, 1) : this.skillVisibleCount;
    const leftmost = alignCount <= 1 ? 0 : -((alignCount - 1) * this.skillSlotSpacing) / 2;
    return leftmost + index * this.skillSlotSpacing;
  }

  private maxSkillScrollIndex(): number {
    return Math.max(0, this.ownedSkillIds.length - this.skillVisibleCount);
  }

  private applySkillScroll(animate: boolean): void {
    if (!this.skillTrack) return;
    this.skillScrollIndex = Phaser.Math.Clamp(this.skillScrollIndex, 0, this.maxSkillScrollIndex());
    const targetX = this.skillTrackBaseX - this.skillScrollIndex * this.skillSlotSpacing;

    this.tweens.killTweensOf(this.skillTrack);
    if (animate) {
      this.tweens.add({
        targets: this.skillTrack,
        x: targetX,
        duration: 220,
        ease: 'Cubic.easeOut',
      });
    } else {
      this.skillTrack.x = targetX;
    }

    const canScroll = this.maxSkillScrollIndex() > 0;
    const atStart = this.skillScrollIndex <= 0;
    const atEnd = this.skillScrollIndex >= this.maxSkillScrollIndex();
    this.skillLeftArrow?.setVisible(canScroll);
    this.skillRightArrow?.setVisible(canScroll);
    this.skillLeftArrow?.setAlpha(atStart ? 0.35 : 0.9);
    this.skillRightArrow?.setAlpha(atEnd ? 0.35 : 0.9);
  }

  private scrollSkills(delta: number): void {
    const next = Phaser.Math.Clamp(this.skillScrollIndex + delta, 0, this.maxSkillScrollIndex());
    if (next === this.skillScrollIndex) return;
    this.skillScrollIndex = next;
    this.applySkillScroll(true);
  }

  /** Update badge counts; drop skills that hit 0 from the bar. */
  private refreshSkillInventory(id?: SkillId): void {
    if (id !== undefined) {
      const qty = getSkillQuantity(id);
      if (qty <= 0) {
        this.rebuildSkillTrack();
        return;
      }
      const button = this.skillButtons.get(id);
      if (button) {
        button.setBadgeContent(String(qty));
        button.setBadgeVisible(true);
      }
      return;
    }
    this.rebuildSkillTrack();
  }

  private refreshDropperVisual(): void {
    if (!this.dropperFruit) return;
    const fruit = FRUIT_TYPES[this.currentLevel];
    this.dropperFruit.setTexture(fruitTextureKey(this.currentLevel));
    this.dropperFruit.setDisplaySize(fruit.radius * 2, fruit.radius * 2);
    this.dropperFruit.setPosition(this.dropperX, this.dropY);
    this.dropperFruit.setVisible(this.canDrop && this.gameActive);
  }

  private updateDropGuide(): void {
    if (!this.dropGuide) return;
    this.dropGuide.clear();
    if (!this.canDrop || !this.gameActive || this.activeSkill) return;

    const fruit = FRUIT_TYPES[this.currentLevel];
    this.dropGuide.lineStyle(2, 0xe53935, 0.85);
    this.dropGuide.beginPath();
    const startY = this.dropY + fruit.radius + 4;
    const endY = this.containerBounds.bottom - 8;
    const dash = 10;
    const gap = 8;
    let y = startY;
    let draw = true;
    while (y < endY) {
      const next = Math.min(y + (draw ? dash : gap), endY);
      if (draw) {
        this.dropGuide.moveTo(this.dropperX, y);
        this.dropGuide.lineTo(this.dropperX, next);
      }
      y = next;
      draw = !draw;
    }
    this.dropGuide.strokePath();
  }

  private clampDropperX(x: number): number {
    const radius = FRUIT_TYPES[this.currentLevel].radius;
    return Phaser.Math.Clamp(
      x,
      this.containerBounds.left + radius + 2,
      this.containerBounds.right - radius - 2
    );
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.skillSwipeActive && pointer.isDown) {
      if (Math.abs(pointer.x - this.skillSwipeStartX) > 14) {
        this.skillDidSwipe = true;
      }
      return;
    }

    if (!this.gameActive || !this.canDrop || this.activeSkill) return;
    if (pointer.y > this.containerBounds.bottom + 20) return;
    this.dropperX = this.clampDropperX(pointer.x);
    this.dropperFruit?.setX(this.dropperX);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.skillSwipeActive) {
      const dx = pointer.x - this.skillSwipeStartX;
      this.skillSwipeActive = false;
      if (this.skillDidSwipe && Math.abs(dx) > 40) {
        // Swipe left → next skills; swipe right → previous
        this.scrollSkills(dx < 0 ? 1 : -1);
      }
      // skillDidSwipe stays until next pointerdown so late button clicks are ignored.
      return;
    }

    if (!this.gameActive) return;

    if (this.activeSkill) {
      this.handleSkillPointer(pointer);
      return;
    }

    if (!this.canDrop) return;
    if (pointer.y > this.containerBounds.bottom + 20) return;

    this.dropperX = this.clampDropperX(pointer.x);
    this.dropFruit();
  }

  private dropFruit(): void {
    if (!this.canDrop || !this.gameActive) return;

    this.canDrop = false;
    this.dropperFruit?.setVisible(false);
    this.dropGuide?.clear();

    const level = this.currentLevel;
    this.spawnPhysicsFruit(this.dropperX, this.dropY, level);

    this.currentLevel = this.nextLevel;
    this.nextLevel = randomSpawnLevel();
    this.hud.setNextFruit(fruitTextureKey(this.nextLevel), 40);

    this.time.delayedCall(600, () => {
      if (!this.gameActive) return;
      this.canDrop = true;
      this.refreshDropperVisual();
    });
  }

  private spawnPhysicsFruit(x: number, y: number, level: number, scoreMultiplier = 1): FruitBody {
    const def = FRUIT_TYPES[level];
    const image = this.matter.add.image(x, y, fruitTextureKey(level)) as FruitBody;

    // Texture is already sized to diameter — avoid setDisplaySize (it can rescale the body).
    image.setCircle(def.radius, {
      restitution: 0.12,
      friction: 0.08,
      frictionAir: 0.012,
      density: 0.002,
      label: `fruit_${level}`,
      slop: 0.05,
    });

    image.setDepth(5);
    image.setName(`fruit_${this.fruitSeq++}`);
    image.fruitLevel = level;
    image.isMerging = false;
    image.scoreMultiplier = scoreMultiplier;
    image.setInteractive({ useHandCursor: true });
    this.fruits.add(image);
    return image;
  }

  private handleCollision(bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType): void {
    if (!this.gameActive) return;

    const fruitA = this.bodyToFruit(bodyA);
    const fruitB = this.bodyToFruit(bodyB);
    if (!fruitA || !fruitB) return;
    this.tryQueueMerge(fruitA, fruitB);
  }

  /** Distance-based merge detection — works even when collisionstart was missed. */
  private queueProximityMerges(): void {
    const list = [...this.fruits];
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a.active || a.isMerging) continue;

      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!b.active || b.isMerging) continue;
        if (a.fruitLevel !== b.fruitLevel) continue;
        if (a.fruitLevel >= FRUIT_TYPES.length - 1) continue;

        const radius = FRUIT_TYPES[a.fruitLevel].radius;
        // Slight slack so near-touching settled pairs still merge.
        const maxDist = radius * 2 + 2;
        const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        if (dist <= maxDist) {
          this.tryQueueMerge(a, b);
        }
      }
    }
  }

  private tryQueueMerge(fruitA: FruitBody, fruitB: FruitBody): void {
    if (!fruitA.active || !fruitB.active) return;
    if (fruitA.isMerging || fruitB.isMerging) return;
    if (fruitA.fruitLevel !== fruitB.fruitLevel) return;
    if (fruitA.fruitLevel >= FRUIT_TYPES.length - 1) return;
    if (!this.fruits.has(fruitA) || !this.fruits.has(fruitB)) return;

    const key = [fruitA.name, fruitB.name].sort().join(':');
    if (this.pendingMerges.has(key)) return;
    this.pendingMerges.add(key);

    fruitA.isMerging = true;
    fruitB.isMerging = true;
    // Destroy Matter bodies outside the collision callback.
    this.mergeQueue.push({ a: fruitA, b: fruitB });
  }

  private flushMergeQueue(): void {
    if (this.mergeQueue.length === 0) return;
    const queue = this.mergeQueue;
    this.mergeQueue = [];

    for (const { a, b } of queue) {
      if (!a.active || !b.active || !this.fruits.has(a) || !this.fruits.has(b)) {
        // Pair became invalid — unlock survivors so they can merge later.
        if (a.active && this.fruits.has(a)) a.isMerging = false;
        if (b.active && this.fruits.has(b)) b.isMerging = false;
        continue;
      }

      this.mergeFruits(a, b);
    }

    this.pendingMerges.clear();
  }

  private bodyToFruit(body: MatterJS.BodyType): FruitBody | null {
    const typed = body as MatterJS.BodyType & {
      gameObject?: Phaser.GameObjects.GameObject;
      parent?: MatterJS.BodyType & { gameObject?: Phaser.GameObjects.GameObject };
    };
    const go = typed.gameObject ?? typed.parent?.gameObject;
    if (!go || !(go instanceof Phaser.Physics.Matter.Image)) return null;
    const fruit = go as FruitBody;
    if (typeof fruit.fruitLevel !== 'number') return null;
    if (!this.fruits.has(fruit)) return null;
    return fruit;
  }

  private mergeFruits(a: FruitBody, b: FruitBody): void {
    const nextLevel = a.fruitLevel + 1;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const multiplier = Math.max(a.scoreMultiplier, b.scoreMultiplier);

    this.destroyFruit(a);
    this.destroyFruit(b);

    const created = this.spawnPhysicsFruit(midX, midY, nextLevel, 1);
    if (created.body) {
      created.setVelocity(0, -2);
    }

    const points = FRUIT_TYPES[nextLevel].mergeScore * multiplier;
    this.addScore(points);
    this.merges += 1;
    eventBus.emit('merge', { count: 1 });
  }

  private destroyFruit(fruit: FruitBody): void {
    this.fruits.delete(fruit);
    fruit.isMerging = true;
    if (fruit.active) {
      fruit.destroy();
    }
  }

  private addScore(points: number): void {
    this.score += points;
    this.hud.setScore(this.score);
    eventBus.emit('score:update', { score: this.score });
  }

  private checkDangerLine(): void {
    if (!this.gameActive || !this.canDrop) return;

    for (const fruit of this.fruits) {
      if (fruit.isMerging || !fruit.active || !fruit.body) continue;
      const body = fruit.body as MatterJS.BodyType;
      if (!body.velocity) continue;
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      if (speed > 0.35) continue;
      if (fruit.y - FRUIT_TYPES[fruit.fruitLevel].radius < this.dangerY) {
        this.triggerGameOver();
        return;
      }
    }
  }

  private triggerGameOver(): void {
    if (!this.gameActive) return;
    const isNewRecord = this.score > this.startingHighScore;
    this.endSession();

    this.time.delayedCall(400, () => {
      this.scene.start('GameOver', {
        score: this.score,
        jumps: this.merges,
        returnTo: this.returnTo,
        isNewRecord,
      });
    });
  }

  private onSkillPressed(id: SkillId): void {
    if (!this.gameActive) return;
    if (getSkillQuantity(id) <= 0) return;

    if (id === 'boost_change') {
      if (!this.canDrop) return;
      if (!consumeSkill(id)) return;
      const prev = this.currentLevel;
      this.currentLevel = this.nextLevel;
      this.nextLevel = prev;
      this.refreshDropperVisual();
      this.hud.setNextFruit(fruitTextureKey(this.nextLevel), 40);
      this.refreshSkillInventory(id);
      this.setSkillHint('');
      return;
    }

    if (this.activeSkill && this.skillKindToId(this.activeSkill) === id) {
      this.clearActiveSkill();
      return;
    }

    this.activeSkill =
      id === 'boost_hammer'
        ? { kind: 'hammer' }
        : id === 'boost_swap'
          ? { kind: 'swap' }
          : id === 'boost_double'
            ? { kind: 'double' }
            : { kind: 'size' };

    const hints: Record<string, string> = {
      hammer: t('game.skillHintHammer'),
      swap: t('game.skillHintSwap'),
      double: t('game.skillHintDouble'),
      size: t('game.skillHintSize'),
    };
    this.setSkillHint(hints[this.activeSkill.kind] ?? '');
    this.dropperFruit?.setVisible(false);
    this.dropGuide?.clear();
  }

  private skillKindToId(skill: Exclude<ActiveSkill, null>): SkillId {
    switch (skill.kind) {
      case 'hammer':
        return 'boost_hammer';
      case 'swap':
        return 'boost_swap';
      case 'double':
        return 'boost_double';
      case 'size':
        return 'boost_size';
    }
  }

  private clearActiveSkill(): void {
    this.activeSkill = null;
    this.setSkillHint('');
    if (this.canDrop) this.refreshDropperVisual();
  }

  private setSkillHint(text: string): void {
    this.skillHint?.setText(text);
  }

  private handleSkillPointer(pointer: Phaser.Input.Pointer): void {
    if (!this.activeSkill) return;

    const fruit = this.pickFruitAt(pointer.x, pointer.y);
    if (!fruit) return;

    const skillId = this.skillKindToId(this.activeSkill);

    if (this.activeSkill.kind === 'hammer') {
      if (!consumeSkill(skillId)) return;
      this.burstFruit(fruit);
      this.refreshSkillInventory(skillId);
      this.clearActiveSkill();
      return;
    }

    if (this.activeSkill.kind === 'double') {
      if (!consumeSkill(skillId)) return;
      fruit.scoreMultiplier = 2;
      this.tweens.add({
        targets: fruit,
        alpha: { from: 0.5, to: 1 },
        duration: 200,
        yoyo: true,
        repeat: 2,
      });
      this.refreshSkillInventory(skillId);
      this.clearActiveSkill();
      return;
    }

    if (this.activeSkill.kind === 'size') {
      if (fruit.fruitLevel >= FRUIT_TYPES.length - 1) return;
      if (!consumeSkill(skillId)) return;
      const next = fruit.fruitLevel + 1;
      const { x, y } = fruit;
      this.destroyFruit(fruit);
      this.spawnPhysicsFruit(x, y, next);
      this.refreshSkillInventory(skillId);
      this.clearActiveSkill();
      return;
    }

    if (this.activeSkill.kind === 'swap') {
      if (!this.activeSkill.selected) {
        this.activeSkill.selected = fruit;
        fruit.setTint(0x90caf9);
        this.setSkillHint(t('game.skillHintSwapSecond'));
        return;
      }

      if (this.activeSkill.selected === fruit) return;

      if (!consumeSkill(skillId)) {
        this.activeSkill.selected.clearTint();
        this.clearActiveSkill();
        return;
      }

      const a = this.activeSkill.selected;
      a.clearTint();
      const ax = a.x;
      const ay = a.y;
      a.setPosition(fruit.x, fruit.y);
      fruit.setPosition(ax, ay);
      a.setVelocity(0, 0);
      fruit.setVelocity(0, 0);

      this.refreshSkillInventory(skillId);
      this.clearActiveSkill();
    }
  }

  private pickFruitAt(x: number, y: number): FruitBody | null {
    let best: FruitBody | null = null;
    let bestDist = Number.POSITIVE_INFINITY;

    for (const fruit of this.fruits) {
      if (fruit.isMerging) continue;
      const r = FRUIT_TYPES[fruit.fruitLevel].radius;
      const dist = Phaser.Math.Distance.Between(x, y, fruit.x, fruit.y);
      if (dist <= r + 8 && dist < bestDist) {
        best = fruit;
        bestDist = dist;
      }
    }
    return best;
  }

  private burstFruit(fruit: FruitBody): void {
    const { x, y } = fruit;
    this.destroyFruit(fruit);
    const burst = this.add.circle(x, y, 8, 0xffffff, 0.8).setDepth(30);
    this.tweens.add({
      targets: burst,
      scale: 4,
      alpha: 0,
      duration: 250,
      onComplete: () => burst.destroy(),
    });
  }
}
