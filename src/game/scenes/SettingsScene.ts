import { BasePanelScene } from './BasePanelScene';
import { SettingsPanel } from '@platform/ui';

export class SettingsScene extends BasePanelScene {
  private panel?: SettingsPanel;

  constructor() {
    super({
      sceneKey: 'Settings',
      defaultReturnTo: 'Home',
    });
  }

  protected createPanel(): void {
    this.panel = new SettingsPanel(this, {
      onBack: () => this.goBack(),
      onNavigate: (sceneKey, data) => this.openScreen(sceneKey, data),
    });
  }

  protected handleAppBack(): void {
    if (this.panel?.isPurchaseModalOpen()) {
      this.panel.hidePurchaseModal();
      return;
    }
    this.goBack();
  }

  protected onPanelShutdown(): void {
    this.panel?.destroy();
    this.panel = undefined;
  }
}
