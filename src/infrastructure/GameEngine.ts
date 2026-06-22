import Phaser from 'phaser';
import { getConfig } from '@core/config';
import { setupGlobalErrorHandlers, errorBoundary } from '@core/error';
import { app } from '@app/App';
import { registerGame, getActiveGame } from '@games/registry';
import { gameExampleConfig, gameExampleScenes } from '@games/game-example';

export class GameEngine {
  private game: Phaser.Game | null = null;

  async bootstrap(): Promise<Phaser.Game> {
    setupGlobalErrorHandlers();

    try {
      await app.init();
    } catch (error) {
      errorBoundary.capture(error, 'app.init');
      throw error;
    }

    registerGame({
      config: gameExampleConfig,
      scenes: gameExampleScenes,
    });

    const activeGame = getActiveGame();
    const config = getConfig();

    const gameConfig: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: activeGame.config.width ?? 720,
      height: activeGame.config.height ?? 1280,
      backgroundColor: '#1a1a2e',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: activeGame.scenes,
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

    this.game = new Phaser.Game(gameConfig);
    return this.game;
  }

  destroy(): void {
    this.game?.destroy(true);
    this.game = null;
    app.destroy();
  }
}

export const gameEngine = new GameEngine();
