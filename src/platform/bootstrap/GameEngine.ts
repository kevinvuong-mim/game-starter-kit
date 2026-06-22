import Phaser from 'phaser';
import { createConfig, getConfig, setConfig } from '@platform/core/config';
import { setupGlobalErrorHandlers, errorBoundary } from '@platform/core/error';
import { app } from '@platform/bootstrap/App';
import { gameConfig } from '@game/config';
import { gameScenes } from '@game/scenes';

export class GameEngine {
  private game: Phaser.Game | null = null;

  async bootstrap(): Promise<Phaser.Game> {
    setupGlobalErrorHandlers();
    setConfig(createConfig({ gameId: gameConfig.id }));

    try {
      await app.init();
    } catch (error) {
      errorBoundary.capture(error, 'app.init');
      throw error;
    }

    const config = getConfig();

    const phaserConfig: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: gameConfig.width,
      height: gameConfig.height,
      backgroundColor: '#1a1a2e',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
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

    this.game = new Phaser.Game(phaserConfig);
    return this.game;
  }

  destroy(): void {
    this.game?.destroy(true);
    this.game = null;
    app.destroy();
  }
}

export const gameEngine = new GameEngine();
