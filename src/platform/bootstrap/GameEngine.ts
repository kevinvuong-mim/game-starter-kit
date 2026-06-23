import { createConfig, getConfig, setConfig } from '@platform/core/config';
import { setupGlobalErrorHandlers, errorBoundary } from '@platform/core/error';
import { app } from '@platform/bootstrap/App';
import { initCapacitorPlugins } from '@platform/bootstrap/capacitor';
import { gameConfig } from '@game/config';
import { gameScenes } from '@game/scenes';
import type Phaser from 'phaser';

export class GameEngine {
  private game: Phaser.Game | null = null;

  async bootstrap(): Promise<Phaser.Game> {
    setupGlobalErrorHandlers();
    setConfig(createConfig({ gameId: gameConfig.id }));

    try {
      await app.init();
      await initCapacitorPlugins();
      await document.fonts.load('16px "Baloo 2"');
      await document.fonts.ready;
    } catch (error) {
      errorBoundary.capture(error, 'app.init');
      throw error;
    }

    const config = getConfig();
    const PhaserLib = await import('phaser');

    const phaserConfig: Phaser.Types.Core.GameConfig = {
      type: PhaserLib.AUTO,
      parent: 'game-container',
      width: gameConfig.width,
      height: gameConfig.height,
      backgroundColor: '#1a1a2e',
      scale: {
        mode: PhaserLib.Scale.ENVELOP,
        autoCenter: PhaserLib.Scale.CENTER_BOTH,
      },
      scene: gameScenes,
      fps: {
        target: 60,
        forceSetTimeOut: false,
      },
      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: true,
      },
      audio: {
        disableWebAudio: false,
      },
      banner: config.debug,
    };

    this.game = new PhaserLib.Game(phaserConfig);
    return this.game;
  }

  destroy(): void {
    this.game?.destroy(true);
    this.game = null;
    void app.destroy();
  }
}

export const gameEngine = new GameEngine();
