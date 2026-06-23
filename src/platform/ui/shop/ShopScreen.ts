import Phaser from 'phaser';

import { t } from '../i18n';
import { FREDOKA_FONT } from '../typography';
import { toast } from '../toast/ToastManager';
import { BaseScreen } from '../screen/ScreenManager';
import { shop } from '@platform/modules/shop/shop.service';
import type { ShopItem } from '@platform/modules/shop/shop.service';

export class ShopScreen extends BaseScreen {
  readonly id = 'shop';
  private listContainer?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    super(scene);
    this.createOverlay(0.75);
    this.buildUI();
  }

  private buildUI(): void {
    const { width, height } = this.scene.cameras.main;

    const panel = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width * 0.9,
      height * 0.75,
      0x2a2a4a,
      1
    );
    panel.setStrokeStyle(2, 0x4a90d9);
    this.add(panel);

    const title = this.scene.add.text(width / 2, height * 0.16, t('shop.title'), {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: FREDOKA_FONT,
    });
    title.setOrigin(0.5);
    this.add(title);

    this.listContainer = this.scene.add.container(width / 2, height * 0.22);
    this.add(this.listContainer);

    this.createButton(width / 2, height * 0.82, t('shop.restore'), () => {
      void this.restorePurchases();
    });

    this.createButton(width / 2, height * 0.9, t('common.close'), () => this.close());
  }

  show(data?: Record<string, unknown>): void {
    void data;
    this.renderItems();
    super.show(data);
  }

  private renderItems(): void {
    if (!this.listContainer) return;
    this.listContainer.removeAll(true);

    const items = shop.getItems();
    const rowHeight = 72;
    const startY = 0;

    items.forEach((item, index) => {
      const row = this.createItemRow(item, startY + index * rowHeight);
      this.listContainer!.add(row);
    });
  }

  private createItemRow(item: ShopItem, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, y);
    const owned = shop.isOwned(item.id);
    const itemName = t(`shop.items.${item.id}.name`);
    const itemDesc = t(`shop.items.${item.id}.description`);
    const priceLabel = owned
      ? t('shop.owned')
      : `${item.price} ${t(`shop.currency.${item.currency}`)}`;

    const bg = this.scene.add.rectangle(0, 0, 600, 64, 0x1a1a2e, 1);
    bg.setStrokeStyle(1, 0x4a90d9);
    container.add(bg);

    const nameText = this.scene.add.text(-270, -10, itemName, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: FREDOKA_FONT,
    });
    container.add(nameText);

    const descText = this.scene.add.text(-270, 12, itemDesc, {
      fontSize: '14px',
      color: '#aaaaaa',
      fontFamily: FREDOKA_FONT,
      wordWrap: { width: 360 },
    });
    container.add(descText);

    if (!owned || item.type === 'boost' || item.type === 'currency') {
      const buyBtn = this.scene.add.rectangle(220, 0, 100, 40, 0x4a90d9);
      buyBtn.setStrokeStyle(1, 0xffffff);
      buyBtn.setInteractive({ useHandCursor: true });

      const buyLabel = this.scene.add.text(220, 0, t('shop.buy'), {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: FREDOKA_FONT,
      });
      buyLabel.setOrigin(0.5);

      buyBtn.on('pointerdown', () => {
        void this.purchaseItem(item);
      });

      container.add([buyBtn, buyLabel]);
    } else {
      const ownedText = this.scene.add.text(220, 0, priceLabel, {
        fontSize: '14px',
        color: '#ffd700',
        fontFamily: FREDOKA_FONT,
      });
      ownedText.setOrigin(0.5);
      container.add(ownedText);
    }

    return container;
  }

  private async purchaseItem(item: ShopItem): Promise<void> {
    const itemName = t(`shop.items.${item.id}.name`);
    const success = await shop.purchase(item.id);
    if (success) {
      toast.show({
        message: t('shop.purchaseSuccess', { name: itemName }),
        type: 'success',
      });
      this.renderItems();
    } else {
      toast.show({ message: t('shop.purchaseFailed'), type: 'error' });
    }
  }

  private async restorePurchases(): Promise<void> {
    const count = await shop.restore();
    toast.show({
      message: count > 0 ? t('shop.restoreSuccess', { count }) : t('shop.restoreEmpty'),
      type: count > 0 ? 'success' : 'info',
    });
    this.renderItems();
  }
}
