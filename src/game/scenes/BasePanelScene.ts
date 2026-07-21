import Phaser from 'phaser';

import { t } from '@platform/ui/index';
import { eventBus } from '@platform/core/events';
import { FREDOKA_FONT } from '@platform/ui/fonts';
import { createUIButton, UIButtonBackgroundKey } from '@platform/ui/button/UIButton';

export interface PanelSceneData {
  returnTo?: string;
  returnData?: Record<string, unknown>;
}

export interface PanelSceneOptions {
  titleY?: number;
  sceneKey: string;
  titleKey: string;
  closeButtonY?: number;
  backgroundKey?: string;
  defaultReturnTo: string;
}

export abstract class BasePanelScene extends Phaser.Scene {
  private readonly options: PanelSceneOptions;

  protected returnTo: string;
  private unsubscribers: Array<() => void> = [];
  protected returnData?: Record<string, unknown>;

  protected constructor(options: PanelSceneOptions) {
    super({ key: options.sceneKey });
    this.options = options;
    this.returnTo = options.defaultReturnTo;
  }

  init(data: PanelSceneData = {}): void {
    this.returnTo = data.returnTo ?? this.options.defaultReturnTo;
    this.returnData = this.resolveReturnData(data);
    this.onSceneInit(data);
  }

  create(): void {
    this.cleanupEventListeners();

    const { width, height } = this.cameras.main;

    this.onBeforePanel();

    this.addBackgroundImage(
      width,
      height,
      this.options.backgroundKey ?? 'general-background-image'
    );

    const titleY = this.options.titleY ?? 0.12;
    this.add
      .text(width / 2, height * titleY, t(this.options.titleKey), {
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);

    this.createPanel();

    const closeY = this.options.closeButtonY ?? 0.9;
    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * closeY },
      size: { width: 200, height: 48 },
      background: { key: UIButtonBackgroundKey.Primary },
      text: {
        content: t('common.close'),
      },
      onClick: () => this.goBack(),
    });

    this.unsubscribers.push(eventBus.on('app:back', () => this.goBack()));
    this.onAfterPanel();
  }

  shutdown(): void {
    this.cleanupEventListeners();
    this.onPanelShutdown();
  }

  protected cleanupEventListeners(): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
  }

  protected resolveReturnData(data: PanelSceneData): Record<string, unknown> | undefined {
    return data.returnData;
  }

  protected abstract createPanel(): void;

  protected onSceneInit(_data: PanelSceneData): void {}

  protected onBeforePanel(): void {}

  protected onAfterPanel(): void {}

  protected onPanelShutdown(): void {}

  private addBackgroundImage(width: number, height: number, key: string): void {
    const bg = this.add.image(width / 2, height / 2, key);
    const scale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(scale).setDepth(-1);
  }

  private goBack(): void {
    this.scene.start(this.returnTo, this.returnData);
  }
}
