import { eventBus } from '@platform/core/events';
import { BasePanelScene } from './BasePanelScene';
import { ShopPanel } from '@platform/ui/shop/ShopPanel';

export class ShopScene extends BasePanelScene {
  constructor() {
    super({
      titleY: 0.1,
      sceneKey: 'Shop',
      titleKey: 'shop.title',
      defaultReturnTo: 'Home',
    });
  }

  protected onBeforePanel(): void {
    eventBus.emit('ad:context:change', { context: 'SHOP' });
  }

  protected createPanel(): void {
    new ShopPanel(this);
  }
}
