import { BasePanelScene } from './BasePanelScene';
import { HowToPlayPanel } from '@platform/ui/how-to-play/HowToPlayPanel';

export class HowToPlayScene extends BasePanelScene {
  constructor() {
    super({
      sceneKey: 'HowToPlay',
      defaultReturnTo: 'Settings',
      titleKey: 'howToPlay.title',
    });
  }

  protected createPanel(): void {
    new HowToPlayPanel(this);
  }
}
