import Phaser from 'phaser';

import { FREDOKA_FONT } from '../typography';

export type UIButtonVariant = 'primary' | 'rounded';

export interface UIButtonOptions {
  x: number;
  y: number;
  label: string;
  width?: number;
  height?: number;
  fontSize?: string;
  onClick: () => void;
  variant?: UIButtonVariant;
}

export function createUIButton(
  scene: Phaser.Scene,
  options: UIButtonOptions
): Phaser.GameObjects.GameObject {
  const {
    x,
    y,
    label,
    onClick,
    height = 50,
    width = 200,
    fontSize = '20px',
    variant = 'primary',
  } = options;

  if (variant === 'rounded') {
    const radius = 16;
    const bg = scene.add.graphics({ x, y });
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    bg.fillStyle(0x4a90d9, 1);
    bg.fillRoundedRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, radius - 2);
    bg.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains
    );
    bg.input!.cursor = 'pointer';

    scene.add
      .text(x, y, label, {
        color: '#ffffff',
        fontSize,
        fontStyle: 'bold',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);

    bg.on('pointerdown', onClick);
    return bg;
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

  bg.on('pointerdown', onClick);
  container.add([bg, text]);
  return container;
}
