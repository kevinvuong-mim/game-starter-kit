import Phaser from 'phaser';

import {
  PANEL_BG,
  TEXT_COLOR,
  PANEL_BORDER,
  PANEL_CORNER_RADIUS,
  PANEL_LIST_PADDING,
} from '../panel/panelTheme';
import type { UIButton } from '../types';
import { toast } from '../toast/ToastManager';
import { FREDOKA_FONT } from '@platform/ui/fonts';
import { PanelHeader } from '../panel/PanelHeader';
import { createUIButton } from '../button/UIButton';
import { formatNumber } from '@platform/core/utils';
import { t } from '@platform/modules/i18n/i18n.service';
import { usePlatformStore } from '@platform/core/state';
import { drawRoundedRect, measureTextWidth } from '../panel/graphics';
import { shop, type ShopItem } from '@platform/modules/shop/shop.service';

const ITEM_ROW_HEIGHT = 120;
const RESTORE_ROW_HEIGHT = 56;

const PRICE_BTN_GAP = 6;
const PRICE_BTN_PAD_X = 14;
const PRICE_ICON_SIZE = 22;
const PRICE_BTN_HEIGHT = 60;
const PRICE_BTN_MIN_WIDTH = 100;
const PRICE_BTN_RIGHT_MARGIN = 4;
const FALLBACK_ITEM_ICON = 'shop-item-1';

/**
 * Shop UI — lives in platform/ui so game scenes stay event-driven.
 */
export class ShopPanel extends Phaser.GameObjects.Container {
  private readonly onBack: () => void;
  private readonly onNavigate: (sceneKey: string) => void;

  private header?: PanelHeader;
  private listContainer?: Phaser.GameObjects.Container;
  private restoring = false;

  constructor(
    scene: Phaser.Scene,
    options: {
      onBack: () => void;
      onNavigate: (sceneKey: string) => void;
    }
  ) {
    super(scene, 0, 0);
    this.onBack = options.onBack;
    this.onNavigate = options.onNavigate;
    scene.add.existing(this);
    this.build();
    this.renderItems();
  }

  destroy(fromScene?: boolean): void {
    this.header = undefined;
    super.destroy(fromScene);
  }

  isGetCoinsModalOpen(): boolean {
    return !!this.header?.isGetCoinsModalOpen();
  }

  hideGetCoinsModal(): void {
    this.header?.hideGetCoinsModal();
  }

  private build(): void {
    const { width, height } = this.scene.cameras.main;
    const panelWidth = Math.min(width * 0.97, 460);
    const itemCount = Math.max(shop.getItems().length, 1);
    const panelHeight =
      PANEL_LIST_PADDING * 2 +
      ITEM_ROW_HEIGHT * (itemCount - 1) +
      ITEM_ROW_HEIGHT * 0.85 +
      RESTORE_ROW_HEIGHT;
    const panelTop = height * 0.24;
    const panelY = panelTop + panelHeight / 2;

    const panel = this.scene.add.graphics();
    drawRoundedRect(
      panel,
      width / 2 - panelWidth / 2,
      panelY - panelHeight / 2,
      panelWidth,
      panelHeight,
      PANEL_CORNER_RADIUS,
      PANEL_BG,
      PANEL_BORDER
    );
    this.add(panel);

    this.header = new PanelHeader(this.scene, {
      onBack: this.onBack,
      onNavigate: this.onNavigate,
      titleKey: 'shop.title',
    });
    this.add(this.header);

    this.listContainer = this.scene.add.container(
      width / 2,
      panelTop + PANEL_LIST_PADDING + ITEM_ROW_HEIGHT * 0.4
    );
    this.add(this.listContainer);
  }

  private renderItems(): void {
    if (!this.listContainer) return;
    this.listContainer.removeAll(true);

    const { width } = this.scene.cameras.main;
    const items = shop.getItems();
    const rowWidth = Math.min(width * 0.91, 430);

    items.forEach((item, index) => {
      const y = index * ITEM_ROW_HEIGHT;
      this.listContainer!.add(this.createItemRow(item, y, rowWidth));

      if (index < items.length - 1) {
        this.listContainer!.add(
          this.scene.add.rectangle(
            0,
            y + ITEM_ROW_HEIGHT / 2,
            rowWidth * 0.92,
            2,
            PANEL_BORDER,
            0.55
          )
        );
      }
    });

    this.listContainer.add(this.createRestoreButton(items.length * ITEM_ROW_HEIGHT - 20, rowWidth));
  }

  private createItemRow(item: ShopItem, y: number, rowWidth: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, y);
    const rowHalf = rowWidth / 2;
    const iconSize = 100;
    const iconX = -rowHalf + iconSize / 2 + 4;
    const iconKey = this.scene.textures.exists(item.icon) ? item.icon : FALLBACK_ITEM_ICON;

    const icon = this.scene.add.image(iconX, 0, iconKey);
    icon.setDisplaySize(iconSize, iconSize);
    container.add(icon);

    const textX = iconX + iconSize / 2 + 12;
    container.add(
      this.scene.add.text(textX, -14, t(`shop.items.${item.id}.name`), {
        fontSize: '20px',
        fontStyle: 'bold',
        color: TEXT_COLOR,
        fontFamily: FREDOKA_FONT,
      })
    );
    container.add(
      this.scene.add.text(textX, 10, t(`shop.items.${item.id}.description`), {
        fontSize: '13px',
        color: TEXT_COLOR,
        fontFamily: FREDOKA_FONT,
        wordWrap: { width: rowWidth * 0.42 },
      })
    );

    if (item.type === 'entitlement' && shop.isOwned(item.id)) {
      container.add(
        this.scene.add
          .text(rowHalf - PRICE_BTN_RIGHT_MARGIN, 0, t('shop.owned'), {
            fontSize: '16px',
            fontStyle: 'bold',
            color: TEXT_COLOR,
            fontFamily: FREDOKA_FONT,
          })
          .setOrigin(1, 0.5)
      );
    } else {
      container.add(this.createPriceButton(item, rowHalf));
    }

    return container;
  }

  private createPriceButton(item: ShopItem, rowHalf: number): UIButton {
    const isIap = item.currency === 'iap';
    const priceLabel = isIap ? t('shop.buy') : formatNumber(item.price);
    const priceTextWidth = measureTextWidth(this.scene, priceLabel, {
      fontSize: '16px',
      fontStyle: 'bold',
      fontFamily: FREDOKA_FONT,
      stroke: '#000000',
      strokeThickness: 2,
    });

    const priceButtonWidth = Math.max(
      PRICE_BTN_MIN_WIDTH,
      isIap
        ? PRICE_BTN_PAD_X * 2 + priceTextWidth
        : PRICE_BTN_PAD_X + PRICE_ICON_SIZE + PRICE_BTN_GAP + priceTextWidth + PRICE_BTN_PAD_X
    );

    return createUIButton({
      scene: this.scene,
      position: {
        x: rowHalf - PRICE_BTN_RIGHT_MARGIN - priceButtonWidth / 2,
        y: 0,
      },
      size: { width: priceButtonWidth, height: PRICE_BTN_HEIGHT },
      background: { key: 'leaderboard-button-background' },
      ...(isIap
        ? {}
        : {
            icon: {
              key: 'coin-icon',
              size: { width: PRICE_ICON_SIZE, height: PRICE_ICON_SIZE },
              offset: { x: PRICE_BTN_PAD_X + PRICE_ICON_SIZE / 2, y: PRICE_BTN_HEIGHT / 2 },
            },
          }),
      text: {
        content: priceLabel,
        offset: {
          x: isIap
            ? priceButtonWidth / 2
            : PRICE_BTN_PAD_X + PRICE_ICON_SIZE + PRICE_BTN_GAP + priceTextWidth / 2,
          y: PRICE_BTN_HEIGHT / 2,
        },
        style: {
          fontSize: 16,
          fontStyle: 'bold',
          border: { width: 2, color: '#000000' },
        },
      },
      onClick: () => {
        void this.purchaseItem(item);
      },
    });
  }

  private createRestoreButton(y: number, rowWidth: number): UIButton {
    const label = t('shop.restore');
    const textWidth = measureTextWidth(this.scene, label, {
      fontSize: '15px',
      fontStyle: 'bold',
      fontFamily: FREDOKA_FONT,
      stroke: '#000000',
      strokeThickness: 2,
    });
    const buttonWidth = Math.min(rowWidth * 0.72, Math.max(180, textWidth + 40));

    return createUIButton({
      scene: this.scene,
      position: { x: 0, y },
      size: { width: buttonWidth, height: 48 },
      background: { key: 'leaderboard-button-background' },
      text: {
        content: label,
        offset: { x: buttonWidth / 2, y: 24 },
        style: {
          fontSize: 15,
          fontStyle: 'bold',
          border: { width: 2, color: '#000000' },
        },
      },
      onClick: () => {
        void this.restorePurchases();
      },
    });
  }

  private async purchaseItem(item: ShopItem): Promise<void> {
    const itemName = t(`shop.items.${item.id}.name`);
    const coins = usePlatformStore.getState().currency.coins;

    if (item.currency === 'coins' && coins < item.price) {
      toast.show({ message: t('shop.notEnoughCoins'), type: 'error' });
      return;
    }

    const success = await shop.purchase(item.id);
    toast.show(
      success
        ? { type: 'success', message: t('shop.purchaseSuccess', { name: itemName }) }
        : { message: t('shop.purchaseFailed'), type: 'error' }
    );

    if (success) {
      this.renderItems();
    }
  }

  private async restorePurchases(): Promise<void> {
    if (this.restoring) return;
    this.restoring = true;

    try {
      const count = await shop.restore();
      toast.show(
        count > 0
          ? { type: 'success', message: t('shop.restoreSuccess', { count }) }
          : { type: 'info', message: t('shop.restoreEmpty') }
      );
      this.renderItems();
    } catch {
      toast.show({ message: t('shop.purchaseFailed'), type: 'error' });
    } finally {
      this.restoring = false;
    }
  }
}
