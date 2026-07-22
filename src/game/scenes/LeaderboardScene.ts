import { eventBus } from '@platform/core/events';
import { LeaderboardPanel } from '@platform/ui/index';
import { BasePanelScene, type PanelSceneData } from './BasePanelScene';

export class LeaderboardScene extends BasePanelScene {
  private panel?: LeaderboardPanel;

  constructor() {
    super({
      sceneKey: 'Leaderboard',
      defaultReturnTo: 'Home',
    });
  }

  protected resolveReturnData(data: PanelSceneData): Record<string, unknown> | undefined {
    return data.returnTo ? data.returnData : undefined;
  }

  protected onBeforePanel(): void {
    eventBus.emit('ad:context:change', { context: 'LEADERBOARD' });
  }

  protected createPanel(): void {
    this.panel = new LeaderboardPanel(this, {
      onBack: () => this.goBack(),
    });
  }

  protected onPanelShutdown(): void {
    this.panel?.destroy();
    this.panel = undefined;
  }
}
