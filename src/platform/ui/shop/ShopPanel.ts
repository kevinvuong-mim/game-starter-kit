import Phaser from 'phaser';

import { toast } from '../toast/ToastManager';
import { FREDOKA_FONT } from '@platform/ui/index';
import { t } from '@platform/modules/i18n/i18n.service';
import { shop } from '@platform/modules/shop/shop.service';
import type { ShopItem } from '@platform/modules/shop/shop.service';
import { getPanelLayoutMetrics } from '@platform/ui/layout/panelLayout';
import { createUIButton, UIButtonBackgroundKey } from '../button/UIButton';

/**
 * Shop UI — lives in platform/ui so game scenes stay event-driven.
 */
export class ShopPanel extends Phaser.GameObjects.Container {
  private readonly rowWidth: number;

  private listContainer?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    const metrics = getPanelLayoutMetrics(scene.cameras.main);
    this.rowWidth = metrics.innerWidth;
    scene.add.existing(this);
    this.build();
    this.renderItems();
  }

  private build(): void {
    const { height } = this.scene.cameras.main;
    const metrics = getPanelLayoutMetrics(this.scene.cameras.main);

    const panel = this.scene.add.rectangle(
      metrics.centerX,
      height / 2,
      metrics.panelWidth,
      height * 0.75,
      0x2a2a4a,
      1
    );
    panel.setStrokeStyle(2, 0x4a90d9);
    this.add(panel);

    this.listContainer = this.scene.add.container(metrics.centerX, height * 0.22);
    this.add(this.listContainer);

    const restoreButton = createUIButton({
      scene: this.scene,
      position: { x: metrics.centerX, y: height * 0.82 },
      size: { width: 180, height: 44 },
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
    const rowHeight = 68;

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
    const rowHalf = this.rowWidth / 2;
    const textWrapWidth = Math.max(140, this.rowWidth * 0.52);
    const actionX = rowHalf - 56;

    const bg = this.scene.add.rectangle(0, 0, this.rowWidth, 58, 0x1a1a2e, 1);
    bg.setStrokeStyle(1, 0x4a90d9);
    container.add(bg);

    const nameText = this.scene.add.text(-rowHalf + 14, -10, itemName, {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: FREDOKA_FONT,
    });
    container.add(nameText);

    const descText = this.scene.add.text(-rowHalf + 14, 10, itemDesc, {
      fontSize: '13px',
      color: '#aaaaaa',
      fontFamily: FREDOKA_FONT,
      wordWrap: { width: textWrapWidth },
    });
    container.add(descText);

    if (!owned || item.type === 'boost') {
      const buyBtn = this.scene.add.rectangle(actionX, 0, 92, 36, 0x4a90d9);
      buyBtn.setStrokeStyle(1, 0xffffff);
      buyBtn.setInteractive({ useHandCursor: true });

      const buyLabel = this.scene.add.text(actionX, 0, t('shop.buy'), {
        fontSize: '15px',
        color: '#ffffff',
        fontFamily: FREDOKA_FONT,
      });
      buyLabel.setOrigin(0.5);

      buyBtn.on('pointerdown', () => {
        void this.purchaseItem(item);
      });

      container.add([buyBtn, buyLabel]);
    } else {
      const ownedText = this.scene.add.text(actionX, 0, priceLabel, {
        fontSize: '13px',
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
