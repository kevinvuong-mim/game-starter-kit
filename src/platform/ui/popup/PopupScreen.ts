import Phaser from 'phaser';
import { BaseScreen } from '../screen/ScreenManager';

export class PopupScreen extends BaseScreen {
  readonly id: string;

  constructor(
    scene: Phaser.Scene,
    id: string,
    private buildContent: (screen: PopupScreen) => void
  ) {
    super(scene);
    this.id = id;
    this.createOverlay(0.5);
    this.buildContent(this);
  }
}

export function createPopup(
  scene: Phaser.Scene,
  id: string,
  buildContent: (screen: PopupScreen) => void
): PopupScreen {
  return new PopupScreen(scene, id, buildContent);
}
