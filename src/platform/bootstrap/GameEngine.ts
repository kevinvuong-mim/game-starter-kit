import type Phaser from 'phaser';

import { gameConfig } from '@game/config';
import { gameScenes } from '@game/scenes';
import { app } from '@platform/bootstrap/App';
import { toast } from '@platform/ui/toast/ToastManager';
import { loadGameFonts } from '@platform/bootstrap/fonts';
import { soundManager } from '@platform/ui/audio/SoundManager';
import { DeviceType, getDeviceType } from '@platform/core/utils';
import { refreshServicesFromConfig } from '@platform/core/services';
import { initCapacitorPlugins } from '@platform/bootstrap/capacitor';
import { getConfig, setConfig, createConfig } from '@platform/core/config';
import { errorBoundary, setupGlobalErrorHandlers } from '@platform/core/error';
import { navigationService } from '@platform/modules/navigation/navigation.service';

const TABLET_LETTERBOX_BG_ID = 'tablet-letterbox-bg';

class GameEngine {
  private game: Phaser.Game | null = null;

  async bootstrap(): Promise<Phaser.Game> {
    if (this.game) return this.game;

    setupGlobalErrorHandlers();
    setConfig(
      createConfig({
        gameId: gameConfig.id,
        replaySecret: gameConfig.replaySecret,
      })
    );
    refreshServicesFromConfig();

    try {
      await app.init();
      await initCapacitorPlugins();
      await loadGameFonts();
    } catch (error) {
      errorBoundary.capture(error, 'app.init');
      throw error;
    }

    const config = getConfig();
    const PhaserLib = await import('phaser');
    const isTablet = getDeviceType() === DeviceType.TABLET;

    if (isTablet) {
      this.setupTabletLetterboxBackground();
    }

    const phaserConfig: Phaser.Types.Core.GameConfig = {
      scene: gameScenes,
      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: true,
      },
      dom: {
        createContainer: true,
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
        autoCenter: PhaserLib.Scale.CENTER_BOTH,
        mode: isTablet ? PhaserLib.Scale.FIT : PhaserLib.Scale.ENVELOP,
      },
    };

    this.game = new PhaserLib.Game(phaserConfig);
    navigationService.setGame(this.game);
    toast.init(this.game);
    soundManager.init(this.game);

    return this.game;
  }

  /** Full-viewport blurred backdrop behind the FIT letterbox on tablets. */
  private setupTabletLetterboxBackground(): void {
    const container = document.getElementById('game-container');
    if (!container || document.getElementById(TABLET_LETTERBOX_BG_ID)) return;

    container.classList.add('tablet-layout');

    const backdrop = document.createElement('div');
    backdrop.id = TABLET_LETTERBOX_BG_ID;
    backdrop.setAttribute('aria-hidden', 'true');
    container.prepend(backdrop);
  }

  destroy(): void {
    this.game?.destroy(true);
    this.game = null;

    document.getElementById(TABLET_LETTERBOX_BG_ID)?.remove();
    document.getElementById('game-container')?.classList.remove('tablet-layout');

    void app.destroy();
  }
}

export const gameEngine = new GameEngine();
