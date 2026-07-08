import { BasePanelScene } from './BasePanelScene';
import { MissionsPanel } from '@platform/ui/missions/MissionsPanel';

export class MissionsScene extends BasePanelScene {
  constructor() {
    super({
      sceneKey: 'Missions',
      defaultReturnTo: 'Home',
      titleKey: 'missions.title',
    });
  }

  protected createPanel(): void {
    new MissionsPanel(this);
  }
}
