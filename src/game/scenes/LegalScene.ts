import { BasePanelScene } from './BasePanelScene';
import { LegalPanel } from '@platform/ui/legal/LegalPanel';

export class LegalScene extends BasePanelScene {
  constructor() {
    super({
      sceneKey: 'Legal',
      titleKey: 'legal.title',
      defaultReturnTo: 'Settings',
    });
  }

  protected createPanel(): void {
    new LegalPanel(this);
  }
}
