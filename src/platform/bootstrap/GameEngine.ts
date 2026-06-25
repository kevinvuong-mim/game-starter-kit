import type Phaser from 'phaser';

import { gameConfig } from '@game/config';
import { gameScenes } from '@game/scenes';
import { app } from '@platform/bootstrap/App';
import { toast } from '@platform/ui/toast/ToastManager';
import { refreshServicesFromConfig } from '@platform/core/services';
import { initCapacitorPlugins } from '@platform/bootstrap/capacitor';
import { getConfig, setConfig, createConfig } from '@platform/core/config';
import { errorBoundary, setupGlobalErrorHandlers } from '@platform/core/error';

export class GameEngine {
  private game: Phaser.Game | null = null;

  async bootstrap(): Promise<Phaser.Game> {
    if (this.game) return this.game;

    setupGlobalErrorHandlers();
    setConfig(createConfig({ gameId: gameConfig.id }));
    refreshServicesFromConfig();

    try {
      await app.init();
      await initCapacitorPlugins();
      await Promise.all([
        document.fonts.load('16px "Fredoka"'),
        document.fonts.load('16px "Nunito Sans"'),
      ]);
      await document.fonts.ready;
    } catch (error) {
      errorBoundary.capture(error, 'app.init');
      throw error;
    }

    const config = getConfig();
    const PhaserLib = await import('phaser');

    const phaserConfig: Phaser.Types.Core.GameConfig = {
      scene: gameScenes,
      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: true,
      },
      banner: config.debug,
      type: PhaserLib.AUTO,
      width: gameConfig.width,
      parent: 'game-container',
      audio: {
        disableWebAudio: false,
      },
      fps: {
        target: 60,
        forceSetTimeOut: false,
      },
      height: gameConfig.height,
      backgroundColor: '#1a1a2e',
      scale: {
        mode: PhaserLib.Scale.ENVELOP,
        autoCenter: PhaserLib.Scale.CENTER_BOTH,
      },
    };

    this.game = new PhaserLib.Game(phaserConfig);
    toast.init(this.game);

    return this.game;
  }

  destroy(): void {
    this.game?.destroy(true);
    this.game = null;

    void app.destroy();
  }
}

export const gameEngine = new GameEngine();
