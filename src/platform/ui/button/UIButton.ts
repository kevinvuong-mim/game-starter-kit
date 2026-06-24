import Phaser from 'phaser';

import { FREDOKA_FONT } from '../typography';

export type UIButtonSize = {
  width: number;
  height: number;
};

export type UIButtonPosition = {
  x: number;
  y: number;
};

export type UIButtonTextStyle = {
  color?: string;
  stroke?: string;
  fontSize?: number;
  fontStyle?: string;
  fontFamily?: string;
  strokeThickness?: number;
};

export interface UIButtonText {
  content: string;
  offset?: UIButtonPosition;
  style?: UIButtonTextStyle;
}

export interface UIButtonIcon {
  key: string;
  size?: UIButtonSize;
  offset?: UIButtonPosition;
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
  position?: UIButtonPosition;
  padding?: {
    vertical: number;
    horizontal: number;
  };
  textStyle?: UIButtonTextStyle;
}

export interface UIButtonOptions {
  size?: UIButtonSize;
  origin?: {
    x: number;
    y: number;
  };
  background: {
    key: string;
  };
  depth?: number;
  disabled?: boolean;
  icon?: UIButtonIcon;
  scene: Phaser.Scene;
  text?: UIButtonText;
  onClick?: () => void;
  badge?: UIButtonBadge;
  position: UIButtonPosition;
}

export type UIButton = Phaser.GameObjects.Container & {
  setText(content: string): void;
  setEnabled(enabled: boolean): void;
  setBadgeContent(content: string): void;
  setBadgeVisible(visible: boolean): void;
};

export const UIButtonBackgroundKey = {
  Primary: '__ui-button-primary',
  Rounded: '__ui-button-rounded',
} as const;

const PRESS_SCALE = 0.95;
const DEFAULT_SIZE: UIButtonSize = { width: 200, height: 50 };

function applyTextStyle(textObject: Phaser.GameObjects.Text, style?: UIButtonTextStyle): void {
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
): Phaser.GameObjects.Text {
  const textObject = scene.add.text(
    text.offset?.x ?? 0,
    text.offset?.y ?? 0,
    text.content
  );
  applyTextStyle(textObject, text.style);
  textObject.setOrigin(0.5);
  container.add(textObject);
  return textObject;
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

function measureBadge(
  textObject: Phaser.GameObjects.Text,
  badge: UIButtonBadge
): { width: number; height: number } {
  const paddingH = badge.padding?.horizontal ?? 8;
  const paddingV = badge.padding?.vertical ?? 4;
  const minWidth = badge.minSize?.width ?? 0;
  const minHeight = badge.minSize?.height ?? 0;

  return {
    width: Math.max(textObject.width + paddingH * 2, minWidth),
    height: Math.max(textObject.height + paddingV * 2, minHeight),
  };
}

function drawBadgeBackground(
  background: Phaser.GameObjects.Graphics,
  badge: UIButtonBadge,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  background.clear();

  if (!badge.background) return;

  const radius = badge.background.radius ?? height / 2;

  background.fillStyle(badge.background.color, 1);
  background.fillRoundedRect(x, y, width, height, radius);

  if (badge.background.border) {
    background.lineStyle(badge.background.border.width, badge.background.border.color, 1);
    background.strokeRoundedRect(x, y, width, height, radius);
  }
}

function addButtonBadge(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  badge: UIButtonBadge,
  offsetX: number,
  offsetY: number
): { textObject: Phaser.GameObjects.Text; background?: Phaser.GameObjects.Graphics } {
  const content = badge.content ?? '';
  const textObject = scene.add.text(0, 0, content);
  applyTextStyle(textObject, badge.textStyle);
  textObject.setOrigin(0.5);

  const { width: badgeWidth, height: badgeHeight } = measureBadge(textObject, badge);
  const badgeX = offsetX + (badge.position?.x ?? 0);
  const badgeY = offsetY + (badge.position?.y ?? 0);

  let background: Phaser.GameObjects.Graphics | undefined;
  if (badge.background) {
    background = scene.add.graphics();
    drawBadgeBackground(background, badge, badgeX, badgeY, badgeWidth, badgeHeight);

    if (badge.depth !== undefined) {
      background.setDepth(badge.depth);
    }

    container.add(background);
  }

  textObject.setPosition(badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);

  if (badge.depth !== undefined) {
    textObject.setDepth(badge.depth);
  }

  const visible = badge.visible !== false;
  textObject.setVisible(visible);
  background?.setVisible(visible);

  container.add(textObject);

  return { textObject, background };
}

function bindButtonInteractions(
  scene: Phaser.Scene,
  inputTarget: Phaser.GameObjects.GameObject,
  visualTarget: Phaser.GameObjects.GameObject,
  onClick?: () => void
): void {
  let isPressed = false;

  const release = (shouldClick: boolean) => {
    if (!isPressed) return;
    isPressed = false;
    if (shouldClick) {
      onClick?.();
    }
    scene.tweens.killTweensOf(visualTarget);
    scene.tweens.add({
      targets: visualTarget,
      scale: 1,
      duration: 100,
      ease: 'Back.easeOut',
    });
  };

  inputTarget.on('pointerdown', () => {
    if (scene.sound.locked) {
      scene.sound.unlock();
    }

    isPressed = true;
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

function createHitZone(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number
): Phaser.GameObjects.Zone {
  const hitZone = scene.add.zone(offsetX + width / 2, offsetY + height / 2, width, height);
  hitZone.setInteractive({ useHandCursor: true });
  container.add(hitZone);
  return hitZone;
}

export function createUIButton(options: UIButtonOptions): UIButton {
  const { scene, position, background, text, icon, badge, depth, disabled, onClick } = options;

  ensureDefaultButtonTextures(scene);

  const { width, height, offsetX, offsetY } = getButtonLayout(options);
  const container = scene.add.container(position.x, position.y) as UIButton;

  if (depth !== undefined) {
    container.setDepth(depth);
  }

  const backgroundImage = scene.add.image(offsetX + width / 2, offsetY + height / 2, background.key);
  backgroundImage.setDisplaySize(width, height);
  container.add(backgroundImage);

  const textObject = text ? addButtonText(scene, container, text) : undefined;

  if (icon) {
    addButtonIcon(scene, container, icon);
  }

  const badgeParts = badge ? addButtonBadge(scene, container, badge, offsetX, offsetY) : undefined;

  let hitZone: Phaser.GameObjects.Zone | undefined;
  let enabled = !disabled;

  const ensureInteractive = () => {
    if (!hitZone) {
      hitZone = createHitZone(scene, container, offsetX, offsetY, width, height);
      bindButtonInteractions(scene, hitZone, container, onClick);
    } else {
      hitZone.setInteractive({ useHandCursor: true });
    }
  };

  const disableInteractive = () => {
    hitZone?.disableInteractive();
    scene.tweens.killTweensOf(container);
    container.setScale(1);
  };

  if (enabled) {
    ensureInteractive();
  } else {
    container.setAlpha(0.5);
  }

  container.setEnabled = (nextEnabled: boolean) => {
    if (nextEnabled === enabled) return;
    enabled = nextEnabled;

    if (enabled) {
      container.setAlpha(1);
      ensureInteractive();
      return;
    }

    disableInteractive();
    container.setAlpha(0.5);
  };

  container.setText = (content: string) => {
    if (!textObject) return;
    textObject.setText(content);
  };

  container.setBadgeContent = (content: string) => {
    if (!badgeParts || !badge) return;

    badgeParts.textObject.setText(content);

    const { width: badgeWidth, height: badgeHeight } = measureBadge(badgeParts.textObject, badge);
    const badgeX = offsetX + (badge.position?.x ?? 0);
    const badgeY = offsetY + (badge.position?.y ?? 0);

    badgeParts.textObject.setPosition(badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);

    if (badgeParts.background) {
      drawBadgeBackground(badgeParts.background, badge, badgeX, badgeY, badgeWidth, badgeHeight);
    }
  };

  container.setBadgeVisible = (visible: boolean) => {
    if (!badgeParts) return;
    badgeParts.textObject.setVisible(visible);
    badgeParts.background?.setVisible(visible);
  };

  return container;
}
