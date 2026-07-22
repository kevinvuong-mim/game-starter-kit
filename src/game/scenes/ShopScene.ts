import { eventBus } from '@platform/core/events';
import { BasePanelScene } from './BasePanelScene';
import { ShopPanel } from '@platform/ui/shop/ShopPanel';

export class ShopScene extends BasePanelScene {
  private panel?: ShopPanel;

  constructor() {
    super({
      sceneKey: 'Shop',
      defaultReturnTo: 'Home',
    });
  }

  protected onBeforePanel(): void {
    eventBus.emit('ad:context:change', { context: 'SHOP' });
  }

  protected createPanel(): void {
    this.panel = new ShopPanel(this, {
      onBack: () => this.goBack(),
      onNavigate: (sceneKey) => this.openScreen(sceneKey),
    });
  }

  protected handleAppBack(): void {
    if (this.panel?.isGetCoinsModalOpen()) {
      this.panel.hideGetCoinsModal();
      return;
    }
    this.goBack();
  }

  protected onPanelShutdown(): void {
    this.panel?.destroy();
    this.panel = undefined;
  }
}
