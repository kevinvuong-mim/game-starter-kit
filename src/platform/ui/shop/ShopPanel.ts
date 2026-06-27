import Phaser from 'phaser';

import { toast } from '../toast/ToastManager';
import { FREDOKA_FONT } from '@platform/ui/index';
import { t } from '@platform/modules/i18n/i18n.service';
import { shop } from '@platform/modules/shop/shop.service';
import type { ShopItem } from '@platform/modules/shop/shop.service';
import { createUIButton, UIButtonBackgroundKey } from '../button/UIButton';

/**
 * Shop UI — lives in platform/ui so game scenes stay event-driven.
 */
export class ShopPanel extends Phaser.GameObjects.Container {
  private listContainer?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.build();
    this.renderItems();
  }

  private build(): void {
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

    this.listContainer = this.scene.add.container(width / 2, height * 0.22);
    this.add(this.listContainer);

    const restoreButton = createUIButton({
      scene: this.scene,
      position: { x: width / 2, y: height * 0.82 },
      size: { width: 200, height: 48 },
      background: { key: UIButtonBackgroundKey.Primary },
      text: {
        content: t('shop.restore'),
      },
      onClick: () => {
        void this.restorePurchases();
      },
    });
    this.add(restoreButton);
  }

  private renderItems(): void {
    if (!this.listContainer) return;
    this.listContainer.removeAll(true);

    const items = shop.getItems();
    const rowHeight = 72;

    items.forEach((item, index) => {
      const row = this.createItemRow(item, index * rowHeight);
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

    if (!owned || item.type === 'boost') {
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
