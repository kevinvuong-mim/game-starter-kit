import type Phaser from 'phaser';

import { t } from '@platform/ui';
import { toast } from '@platform/ui/toast/ToastManager';
import { FRUIT_TYPES } from '@game/fruits';
import { type SkillId, getSkillQuantity, consumeSkill } from '@game/skills/skillInventory';
import type { FruitFactory } from './FruitFactory';
import type { SkillBarView } from './SkillBarView';
import type { ActiveSkill, FruitBody } from './types';

export type SkillControllerCallbacks = {
  isActive: () => boolean;
  canDrop: () => boolean;
  getCurrentLevel: () => number;
  getNextLevel: () => number;
  setLevels: (current: number, next: number) => void;
  refreshDropper: () => void;
  setNextFruitPreview: () => void;
  hideDropper: () => void;
  pushUndoCheckpoint: () => void;
  canUndo: () => boolean;
  undoLastMove: () => void;
};

export class SkillController {
  private activeSkill: ActiveSkill = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly factory: FruitFactory,
    private readonly skillBar: SkillBarView,
    private readonly callbacks: SkillControllerCallbacks
  ) {}

  get active(): ActiveSkill {
    return this.activeSkill;
  }

  get selectedSkillId(): SkillId | null {
    return this.activeSkill ? this.skillKindToId(this.activeSkill) : null;
  }

  reset(): void {
    this.activeSkill = null;
  }

  clear(): void {
    this.activeSkill = null;
    this.skillBar.setHint('');
    this.skillBar.updateSelectionVisual();
    if (this.callbacks.canDrop()) this.callbacks.refreshDropper();
  }

  onSkillPressed(id: SkillId): void {
    if (!this.callbacks.isActive()) return;
    if (getSkillQuantity(id) <= 0) return;

    if (id === 'boost_change') {
      if (!this.callbacks.canDrop()) return;
      this.callbacks.pushUndoCheckpoint();
      if (!consumeSkill(id)) return;
      const prev = this.callbacks.getCurrentLevel();
      this.callbacks.setLevels(this.callbacks.getNextLevel(), prev);
      this.callbacks.refreshDropper();
      this.callbacks.setNextFruitPreview();
      this.skillBar.refreshInventory(id);
      this.skillBar.setHint('');
      return;
    }

    if (id === 'boost_undo') {
      if (!this.callbacks.canUndo()) {
        toast.show({ message: t('game.skillUndoNothing'), type: 'error' });
        return;
      }
      if (!consumeSkill(id)) return;
      this.callbacks.undoLastMove();
      this.clear();
      this.skillBar.refreshInventory(id);
      this.skillBar.setHint('');
      return;
    }

    if (this.activeSkill && this.skillKindToId(this.activeSkill) === id) {
      this.clear();
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

    const hints: Record<Exclude<ActiveSkill, null>['kind'], string> = {
      hammer: t('game.skillHintHammer'),
      swap: t('game.skillHintSwap'),
      double: t('game.skillHintDouble'),
      size: t('game.skillHintSize'),
    };
    this.skillBar.setHint(hints[this.activeSkill.kind]);
    this.callbacks.hideDropper();
    this.skillBar.updateSelectionVisual();
  }

  handlePointer(pointer: Phaser.Input.Pointer): void {
    if (!this.activeSkill) return;

    const fruit = this.factory.pickAt(pointer.x, pointer.y);
    if (!fruit) return;

    const skillId = this.skillKindToId(this.activeSkill);

    if (this.activeSkill.kind === 'hammer') {
      this.callbacks.pushUndoCheckpoint();
      if (!consumeSkill(skillId)) return;
      this.factory.burst(fruit);
      this.skillBar.refreshInventory(skillId);
      this.clear();
      return;
    }

    if (this.activeSkill.kind === 'double') {
      this.callbacks.pushUndoCheckpoint();
      if (!consumeSkill(skillId)) return;
      fruit.scoreMultiplier = 2;
      this.scene.tweens.add({
        targets: fruit,
        alpha: { from: 0.5, to: 1 },
        duration: 200,
        yoyo: true,
        repeat: 2,
      });
      this.skillBar.refreshInventory(skillId);
      this.clear();
      return;
    }

    if (this.activeSkill.kind === 'size') {
      if (fruit.fruitLevel >= FRUIT_TYPES.length - 1) return;
      this.callbacks.pushUndoCheckpoint();
      if (!consumeSkill(skillId)) return;
      const next = fruit.fruitLevel + 1;
      const { x, y } = fruit;
      const multiplier = fruit.scoreMultiplier;
      this.factory.destroy(fruit);
      this.factory.spawn(x, y, next, multiplier);
      this.skillBar.refreshInventory(skillId);
      this.clear();
      return;
    }

    if (this.activeSkill.kind === 'swap') {
      this.handleSwap(fruit, skillId);
    }
  }

  private handleSwap(fruit: FruitBody, skillId: SkillId): void {
    if (!this.activeSkill || this.activeSkill.kind !== 'swap') return;

    if (!this.activeSkill.selected) {
      this.activeSkill.selected = fruit;
      fruit.setTint(0x90caf9);
      this.skillBar.setHint(t('game.skillHintSwapSecond'));
      return;
    }

    if (this.activeSkill.selected === fruit) return;

    this.callbacks.pushUndoCheckpoint();
    if (!consumeSkill(skillId)) {
      this.activeSkill.selected.clearTint();
      this.clear();
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

    this.skillBar.refreshInventory(skillId);
    this.clear();
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
}
