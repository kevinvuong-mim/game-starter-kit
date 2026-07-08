import { BasePanelScene } from './BasePanelScene';
import { DailyRewardPopup } from '@platform/ui/daily-reward/DailyRewardPopup';

export class DailyRewardScene extends BasePanelScene {
  constructor() {
    super({
      sceneKey: 'DailyReward',
      defaultReturnTo: 'Home',
      titleKey: 'dailyReward.title',
    });
  }

  protected createPanel(): void {
    new DailyRewardPopup(this);
  }
}
