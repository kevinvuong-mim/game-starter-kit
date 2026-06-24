import Phaser from 'phaser';

import { FREDOKA_FONT } from '../typography';

export type UIButtonVariant = 'primary' | 'rounded';

export interface UIButtonOptions {
  x: number;
  y: number;
  label: string;
  width?: number;
  height?: number;
  iconGap?: number;
  fontSize?: string;
  iconSize?: number;
  onClick: () => void;
  iconTexture?: string;
  variant?: UIButtonVariant;
  backgroundTexture?: string;
}

function addButtonContent(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  options: {
    label: string;
    height: number;
    fontSize: string;
    iconGap?: number;
    iconSize?: number;
    iconTexture?: string;
    variant: UIButtonVariant;
  }
): void {
  const { label, fontSize, variant, height, iconTexture, iconSize, iconGap = 10 } = options;

  const text = scene.add.text(0, 0, label, {
    color: '#ffffff',
    fontSize,
    fontStyle: variant === 'rounded' ? 'bold' : undefined,
    fontFamily: FREDOKA_FONT,
  });

  if (!iconTexture) {
    text.setOrigin(0.5);
    container.add(text);
    return;
  }

  const icon = scene.add.image(0, 0, iconTexture);
  const displayHeight = iconSize ?? height * 0.55;
  icon.setDisplaySize(displayHeight * (icon.width / icon.height), displayHeight);

  const rowWidth = icon.displayWidth + iconGap + text.width;
  icon.setPosition(-rowWidth / 2 + icon.displayWidth / 2, 0);
  text.setPosition(-rowWidth / 2 + icon.displayWidth + iconGap, 0);
  text.setOrigin(0, 0.5);

  container.add([icon, text]);
}

const PRESS_SCALE = 0.95;

function bindButtonPressEffect(
  scene: Phaser.Scene,
  inputTarget: Phaser.GameObjects.GameObject,
  visualTarget: Phaser.GameObjects.GameObject,
  onClick: () => void
): void {
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

  inputTarget.on('pointerdown', () => {
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

export function createUIButton(
  scene: Phaser.Scene,
  options: UIButtonOptions
): Phaser.GameObjects.GameObject {
  const {
    x,
    y,
    label,
    iconGap,
    onClick,
    iconSize,
    iconTexture,
    height = 50,
    width = 200,
    backgroundTexture,
    fontSize = '20px',
    variant = 'primary',
  } = options;

  if (backgroundTexture) {
    const container = scene.add.container(x, y);
    const bg = scene.add.image(0, 0, backgroundTexture);
    bg.setDisplaySize(width, height);
    bg.setInteractive({ useHandCursor: true });
    container.add(bg);

    addButtonContent(scene, container, {
      label,
      height,
      variant,
      iconGap,
      fontSize,
      iconSize,
      iconTexture,
    });

    bindButtonPressEffect(scene, bg, container, onClick);
    return container;
  }

  if (variant === 'rounded') {
    const container = scene.add.container(x, y);
    const radius = 16;
    const bg = scene.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    bg.fillStyle(0x4a90d9, 1);
    bg.fillRoundedRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, radius - 2);
    bg.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains
    );
    bg.input!.cursor = 'pointer';

    const text = scene.add
      .text(0, 0, label, {
        color: '#ffffff',
        fontSize,
        fontStyle: 'bold',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);

    container.add([bg, text]);
    bindButtonPressEffect(scene, bg, container, onClick);
    return container;
  }

  const container = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, width, height, 0x4a90d9, 1);
  bg.setStrokeStyle(2, 0xffffff);
  bg.setInteractive({ useHandCursor: true });

  const text = scene.add.text(0, 0, label, {
    color: '#ffffff',
    fontSize,
    fontFamily: FREDOKA_FONT,
  });
  text.setOrigin(0.5);

  container.add([bg, text]);
  bindButtonPressEffect(scene, bg, container, onClick);
  return container;
}
