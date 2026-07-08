import Phaser from 'phaser';

import { FREDOKA_FONT } from '@platform/ui/fonts';
import { BaseScreen } from '../screen/ScreenManager';
import { t } from '@platform/modules/i18n/i18n.service';

export interface ModalScreenLayout {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface ModalScreenOptions {
  layout?: ModalScreenLayout;
}

type ResolvedModalLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export class ModalScreen extends BaseScreen {
  readonly id = 'modal';

  private onClose?: () => void;
  private defaultLayout: ModalScreenLayout;
  private content?: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Rectangle;
  private okButton!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, options: ModalScreenOptions = {}) {
    super(scene);
    this.defaultLayout = options.layout ?? {};
    this.createOverlay(0.7);
    this.buildUI();
  }

  private getCameraDefaults(): ResolvedModalLayout {
    const { width, height } = this.scene.cameras.main;
    return {
      x: width / 2,
      y: height / 2,
      width: width * 0.8,
      height: height * 0.4,
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

    this.content = this.scene.add.text(0, 0, '', {
      align: 'center',
      color: '#ffffff',
      fontSize: '22px',
      fontFamily: FREDOKA_FONT,
      wordWrap: { width: 0 },
    });
    this.content.setOrigin(0.5);
    this.add(this.content);

    this.okButton = this.createButton(0, 0, t('common.ok'), () => {
      this.onClose?.();
      this.close();
    }) as Phaser.GameObjects.Container;

    this.applyLayout(this.resolveLayout());
  }

  private applyLayout(layout: ResolvedModalLayout): void {
    this.panel.setPosition(layout.x, layout.y);
    this.panel.setSize(layout.width, layout.height);

    if (this.content) {
      this.content.setPosition(layout.x, layout.y - 30);
      this.content.setWordWrapWidth(layout.width * 0.875);
    }

    this.okButton.setPosition(layout.x, layout.y + 60);
  }

  show(data?: Record<string, unknown>): void {
    this.applyLayout(this.resolveLayout(this.extractLayout(data)));

    if (this.content) {
      this.content.setText(data?.message ? String(data.message) : '');
    }
    this.onClose = data?.onClose as (() => void) | undefined;
    super.show(data);
  }
}
