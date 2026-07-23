import { shop } from '@platform/modules/shop';

/** Equipped skin fill color for the demo player — game layer reads via @platform/ui. */
export function getEquippedPlayerColor(): number {
  return shop.getEquippedSkinColor();
}
