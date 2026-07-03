import Phaser from 'phaser';

import { eventBus } from '@platform/core/events';
import { t, FREDOKA_FONT } from '@platform/ui/index';
import { ShopPanel } from '@platform/ui/shop/ShopPanel';
import { createUIButton, UIButtonBackgroundKey } from '@platform/ui/button/UIButton';

interface ShopSceneData {
  returnTo?: string;
  returnData?: Record<string, unknown>;
}

export class ShopScene extends Phaser.Scene {
  private returnTo = 'Home';
  private returnData?: Record<string, unknown>;
  private unsubscribers: Array<() => void> = [];

  constructor() {
    super({ key: 'Shop' });
  }

  init(data: ShopSceneData = {}): void {
    this.returnTo = data.returnTo ?? 'Home';
    this.returnData = data.returnData;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.add
      .text(width / 2, height * 0.12, t('shop.title'), {
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);

    new ShopPanel(this);

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.9 },
      size: { width: 200, height: 48 },
      background: { key: UIButtonBackgroundKey.Primary },
      text: {
        content: t('common.close'),
      },
      onClick: () => this.goBack(),
    });

    this.unsubscribers.push(eventBus.on('app:back', () => this.goBack()));
  }

  shutdown(): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
  }

  private goBack(): void {
    this.scene.start(this.returnTo, this.returnData);
  }
}
