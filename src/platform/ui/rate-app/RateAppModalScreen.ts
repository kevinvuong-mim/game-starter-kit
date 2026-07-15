import Phaser from 'phaser';

import { FREDOKA_FONT } from '@platform/ui/fonts';
import { BaseScreen } from '../screen/ScreenManager';
import { t } from '@platform/modules/i18n/i18n.service';
import { appReview } from '@platform/modules/app-review';
import type { ModalScreenLayout } from '../modal/ModalScreen';

type ResolvedModalLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export class RateAppModalScreen extends BaseScreen {
  readonly id = 'rate-app';

  private submitting = false;
  private defaultLayout: ModalScreenLayout;
  private panel!: Phaser.GameObjects.Rectangle;
  private messageText?: Phaser.GameObjects.Text;
  private rateButton!: Phaser.GameObjects.Container;
  private dismissButton!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, defaultLayout: ModalScreenLayout = {}) {
    super(scene);
    this.defaultLayout = defaultLayout;
    this.createOverlay(0.7);
    this.buildUI();
  }

  private getCameraDefaults(): ResolvedModalLayout {
    const { width, height } = this.scene.cameras.main;
    return {
      x: width / 2,
      y: height / 2,
      height: height / 2,
      width: (2 * width) / 3,
    };
  }

  private resolveLayout(overrides?: ModalScreenLayout): ResolvedModalLayout {
    const camera = this.getCameraDefaults();
    return {
      x: overrides?.x ?? this.defaultLayout.x ?? camera.x,
      y: overrides?.y ?? this.defaultLayout.y ?? camera.y,
      width: overrides?.width ?? this.defaultLayout.width ?? camera.width,
      height: overrides?.height ?? this.defaultLayout.height ?? camera.height,
    };
  }

  private extractLayout(data?: Record<string, unknown>): ModalScreenLayout | undefined {
    if (!data) return undefined;

    const nested = data.layout as ModalScreenLayout | undefined;
    const flat: ModalScreenLayout = {
      x: typeof data.x === 'number' ? data.x : undefined,
      y: typeof data.y === 'number' ? data.y : undefined,
      width: typeof data.width === 'number' ? data.width : undefined,
      height: typeof data.height === 'number' ? data.height : undefined,
    };

    const merged: ModalScreenLayout = { ...nested, ...flat };
    const hasValue = Object.values(merged).some((value) => value !== undefined);
    return hasValue ? merged : undefined;
  }

  private buildUI(): void {
    this.panel = this.scene.add.rectangle(0, 0, 0, 0, 0x2a2a4a, 1);
    this.panel.setStrokeStyle(2, 0x4a90d9);
    this.add(this.panel);

    this.messageText = this.scene.add.text(0, 0, t('rateApp.message'), {
      align: 'center',
      fontSize: '26px',
      color: '#ffffff',
      wordWrap: { width: 0 },
      fontFamily: FREDOKA_FONT,
    });
    this.messageText.setOrigin(0.5);
    this.add(this.messageText);

    this.rateButton = this.createButton(0, 0, t('rateApp.rate'), () => {
      void this.handleRate();
    }) as Phaser.GameObjects.Container;

    this.dismissButton = this.createButton(0, 0, t('rateApp.notNow'), () => {
      this.close();
    }) as Phaser.GameObjects.Container;

    this.applyLayout(this.resolveLayout());
  }

  private applyLayout(layout: ResolvedModalLayout): void {
    this.panel.setPosition(layout.x, layout.y);
    this.panel.setSize(layout.width, layout.height);

    if (this.messageText) {
      this.messageText.setPosition(layout.x, layout.y - 40);
      this.messageText.setWordWrapWidth(layout.width * 0.875);
    }

    this.rateButton.setPosition(layout.x, layout.y + 50);
    this.dismissButton.setPosition(layout.x, layout.y + 120);
  }

  private async handleRate(): Promise<void> {
    if (this.submitting) return;

    this.submitting = true;
    try {
      await appReview.submitReview();
    } finally {
      this.submitting = false;
      this.close();
    }
  }

  show(data?: Record<string, unknown>): void {
    this.submitting = false;
    this.applyLayout(this.resolveLayout(this.extractLayout(data)));

    if (this.messageText) {
      this.messageText.setText(t('rateApp.message'));
    }

    super.show(data);
  }
}
