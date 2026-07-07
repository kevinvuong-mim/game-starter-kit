import Phaser from 'phaser';

import { eventBus } from '@platform/core/events';
import { t, FREDOKA_FONT } from '@platform/ui/index';
import { HowToPlayPanel } from '@platform/ui/how-to-play/HowToPlayPanel';
import { createUIButton, UIButtonBackgroundKey } from '@platform/ui/button/UIButton';

interface HowToPlaySceneData {
  returnTo?: string;
  returnData?: Record<string, unknown>;
}

export class HowToPlayScene extends Phaser.Scene {
  private returnTo = 'Settings';
  private returnData?: Record<string, unknown>;
  private unsubscribers: Array<() => void> = [];

  constructor() {
    super({ key: 'HowToPlay' });
  }

  init(data: HowToPlaySceneData = {}): void {
    this.returnTo = data.returnTo ?? 'Settings';
    this.returnData = data.returnData;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.add
      .text(width / 2, height * 0.12, t('howToPlay.title'), {
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);

    new HowToPlayPanel(this);

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
