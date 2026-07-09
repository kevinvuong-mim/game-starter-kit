import { BasePanelScene } from './BasePanelScene';
import { MissionsPanel } from '@platform/ui/missions/MissionsPanel';

export class MissionsScene extends BasePanelScene {
  private panel?: MissionsPanel;

  constructor() {
    super({
      sceneKey: 'Missions',
      defaultReturnTo: 'Home',
      titleKey: 'missions.title',
    });
  }

  protected createPanel(): void {
    this.panel = new MissionsPanel(this);
  }

  protected onPanelShutdown(): void {
    this.panel?.destroy();
    this.panel = undefined;
  }
}
