import Phaser from 'phaser';

import { FREDOKA_FONT } from '../typography';

export type Size = {
  width: number;
  height: number;
};

export type Position = {
  x: number;
  y: number;
};

export type TextStyle = {
  color?: string;
  stroke?: string;
  fontSize?: number;
  fontStyle?: string;
  fontFamily?: string;
  strokeThickness?: number;
};

export interface UIButtonText {
  content: string;
  offset?: Position;
  style?: TextStyle;
}

export interface UIButtonIcon {
  key: string;
  size?: Size;
  offset?: Position;
}

export interface UIButtonBadge {
  depth?: number;
  content?: string;
  visible?: boolean;
  minSize?: {
    width?: number;
    height?: number;
  };
  background?: {
    color: number;
    radius?: number;
    border?: {
      color: number;
      width: number;
    };
  };
  position?: Position;
  padding?: {
    vertical: number;
    horizontal: number;
  };
  textStyle?: TextStyle;
}

export interface UIButtonOptions {
  size?: Size;
  origin?: {
    x: number;
    y: number;
  };
  background: {
    key: string;
  };
  depth?: number;
  disabled?: boolean;
  position: Position;
  icon?: UIButtonIcon;
  scene: Phaser.Scene;
  text?: UIButtonText;
  onClick?: () => void;
  onHover?: () => void;
  onPress?: () => void;
  badge?: UIButtonBadge;
}

export const UIButtonBackgroundKey = {
  Primary: '__ui-button-primary',
  Rounded: '__ui-button-rounded',
} as const;

const PRESS_SCALE = 0.95;
const DEFAULT_SIZE: Size = { width: 200, height: 50 };

function applyTextStyle(textObject: Phaser.GameObjects.Text, style?: TextStyle): void {
  const fontSize = style?.fontSize !== undefined ? `${style.fontSize}px` : '20px';
  const fontFamily = style?.fontFamily ?? FREDOKA_FONT;

  textObject.setColor(style?.color ?? '#ffffff');
  textObject.setFontSize(fontSize);
  textObject.setFontFamily(fontFamily);

  if (style?.fontStyle !== undefined) {
    textObject.setFontStyle(style.fontStyle);
  }

  if (style?.stroke !== undefined) {
    textObject.setStroke(style.stroke, style.strokeThickness ?? 0);
  }
}

function ensureDefaultButtonTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(UIButtonBackgroundKey.Primary)) {
    const width = DEFAULT_SIZE.width;
    const height = DEFAULT_SIZE.height;
    const graphics = scene.add.graphics();

    graphics.fillStyle(0x4a90d9, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeRect(0, 0, width, height);
    graphics.generateTexture(UIButtonBackgroundKey.Primary, width, height);
    graphics.destroy();
  }

  if (!scene.textures.exists(UIButtonBackgroundKey.Rounded)) {
    const width = DEFAULT_SIZE.width;
    const height = DEFAULT_SIZE.height;
    const radius = 16;
    const graphics = scene.add.graphics();

    graphics.fillStyle(0xffffff, 1);
    graphics.fillRoundedRect(0, 0, width, height, radius);
    graphics.fillStyle(0x4a90d9, 1);
    graphics.fillRoundedRect(2, 2, width - 4, height - 4, radius - 2);
    graphics.generateTexture(UIButtonBackgroundKey.Rounded, width, height);
    graphics.destroy();
  }
}

function getButtonLayout(options: UIButtonOptions): {
  width: number;
  height: number;
  originX: number;
  originY: number;
  offsetX: number;
  offsetY: number;
} {
  const width = options.size?.width ?? DEFAULT_SIZE.width;
  const height = options.size?.height ?? DEFAULT_SIZE.height;
  const originX = options.origin?.x ?? 0.5;
  const originY = options.origin?.y ?? 0.5;

  return {
    width,
    height,
    originX,
    originY,
    offsetX: -width * originX,
    offsetY: -height * originY,
  };
}

function addButtonText(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  text: UIButtonText
): void {
  const textObject = scene.add.text(
    text.offset?.x ?? 0,
    text.offset?.y ?? 0,
    text.content
  );
  applyTextStyle(textObject, text.style);
  textObject.setOrigin(0.5);
  container.add(textObject);
}

function addButtonIcon(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  icon: UIButtonIcon
): void {
  const iconObject = scene.add.image(icon.offset?.x ?? 0, icon.offset?.y ?? 0, icon.key);

  if (icon.size) {
    iconObject.setDisplaySize(icon.size.width, icon.size.height);
  }

  iconObject.setOrigin(0.5);
  container.add(iconObject);
}

function addButtonBadge(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  badge: UIButtonBadge,
  offsetX: number,
  offsetY: number
): void {
  if (badge.visible === false) return;

  const content = badge.content ?? '';
  const paddingH = badge.padding?.horizontal ?? 8;
  const paddingV = badge.padding?.vertical ?? 4;
  const textObject = scene.add.text(0, 0, content);
  applyTextStyle(textObject, badge.textStyle);
  textObject.setOrigin(0.5);

  const minWidth = badge.minSize?.width ?? 0;
  const minHeight = badge.minSize?.height ?? 0;
  const badgeWidth = Math.max(textObject.width + paddingH * 2, minWidth);
  const badgeHeight = Math.max(textObject.height + paddingV * 2, minHeight);
  const badgeX = offsetX + (badge.position?.x ?? 0);
  const badgeY = offsetY + (badge.position?.y ?? 0);
  const radius = badge.background?.radius ?? badgeHeight / 2;

  const background = scene.add.graphics();
  if (badge.background) {
    background.fillStyle(badge.background.color, 1);
    background.fillRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, radius);

    if (badge.background.border) {
      background.lineStyle(badge.background.border.width, badge.background.border.color, 1);
      background.strokeRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, radius);
    }
  }

  textObject.setPosition(badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);

  if (badge.depth !== undefined) {
    background.setDepth(badge.depth);
    textObject.setDepth(badge.depth);
  }

  container.add([background, textObject]);
}

function bindButtonInteractions(
  scene: Phaser.Scene,
  inputTarget: Phaser.GameObjects.GameObject,
  visualTarget: Phaser.GameObjects.GameObject,
  handlers: {
    onClick?: () => void;
    onHover?: () => void;
    onPress?: () => void;
  }
): void {
  const { onClick, onHover, onPress } = handlers;
  let isPressed = false;

  const release = (shouldClick: boolean) => {
    if (!isPressed) return;
    isPressed = false;
    scene.tweens.killTweensOf(visualTarget);
    scene.tweens.add({
      targets: visualTarget,
      scale: 1,
      duration: 100,
      ease: 'Back.easeOut',
      onComplete: shouldClick ? onClick : undefined,
    });
  };

  inputTarget.on('pointerover', () => {
    onHover?.();
  });

  inputTarget.on('pointerdown', () => {
    if (scene.sound.locked) {
      scene.sound.unlock();
    }

    isPressed = true;
    onPress?.();
    scene.tweens.killTweensOf(visualTarget);
    scene.tweens.add({
      targets: visualTarget,
      scale: PRESS_SCALE,
      duration: 80,
      ease: 'Power2',
    });
  });

  inputTarget.on('pointerup', () => release(true));
  inputTarget.on('pointerout', () => release(false));
}

export function createUIButton(options: UIButtonOptions): Phaser.GameObjects.Container {
  const { scene, position, background, text, icon, badge, depth, disabled, onClick, onHover, onPress } =
    options;

  ensureDefaultButtonTextures(scene);

  const { width, height, offsetX, offsetY } = getButtonLayout(options);
  const container = scene.add.container(position.x, position.y);

  if (depth !== undefined) {
    container.setDepth(depth);
  }

  const backgroundImage = scene.add.image(offsetX + width / 2, offsetY + height / 2, background.key);
  backgroundImage.setDisplaySize(width, height);
  container.add(backgroundImage);

  if (text) {
    addButtonText(scene, container, text);
  }

  if (icon) {
    addButtonIcon(scene, container, icon);
  }

  if (badge) {
    addButtonBadge(scene, container, badge, offsetX, offsetY);
  }

  if (disabled) {
    container.setAlpha(0.5);
    return container;
  }

  const hitZone = scene.add.zone(offsetX + width / 2, offsetY + height / 2, width, height);
  hitZone.setInteractive({ useHandCursor: true });
  container.add(hitZone);

  bindButtonInteractions(scene, hitZone, container, { onClick, onHover, onPress });

  return container;
}
