import type Phaser from 'phaser';

export type FruitBody = Phaser.Physics.Matter.Image & {
  fruitLevel: number;
  isMerging: boolean;
  scoreMultiplier: number;
};

export type ActiveSkill =
  | { kind: 'hammer' }
  | { kind: 'swap'; selected?: FruitBody }
  | { kind: 'double' }
  | { kind: 'size' }
  | null;

/** Inner play-area ratios relative to glass-container.png display size. */
export const CONTAINER_INSET = {
  left: 0.09,
  right: 0.09,
  top: 0.06,
  bottom: 0.1,
};

export const SKILL_PILL_HEIGHT = 40;
export const SKILL_PILL_RADIUS = 18;
export const SKILL_PILL_OVERLAP = 18;
export const SKILL_TAB_GREEN = 0x1f6b32;
export const SKILL_TAB_GREEN_BORDER = 0x145024;

export type ContainerBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
};
