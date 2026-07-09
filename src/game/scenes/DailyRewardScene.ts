import { BasePanelScene } from './BasePanelScene';
import { DailyRewardPopup } from '@platform/ui/daily-reward/DailyRewardPopup';

export class DailyRewardScene extends BasePanelScene {
  private panel?: DailyRewardPopup;

  constructor() {
    super({
      sceneKey: 'DailyReward',
      defaultReturnTo: 'Home',
      titleKey: 'dailyReward.title',
    });
  }

  protected createPanel(): void {
    this.panel = new DailyRewardPopup(this);
  }

  protected onPanelShutdown(): void {
    this.panel?.destroy();
    this.panel = undefined;
  }
}
