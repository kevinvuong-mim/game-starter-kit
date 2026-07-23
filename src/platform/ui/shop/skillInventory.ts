import { shop } from '@platform/modules/shop/shop.service';

export const SKILL_IDS = [
  'boost_hammer',
  'boost_change',
  'boost_swap',
  'boost_double',
  'boost_size',
] as const;

export type SkillId = (typeof SKILL_IDS)[number];

export function getSkillQuantity(id: SkillId): number {
  return shop.getQuantity(id);
}

export function consumeSkill(id: SkillId): boolean {
  return shop.consumeBoost(id);
}
