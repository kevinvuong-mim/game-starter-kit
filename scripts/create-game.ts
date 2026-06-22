#!/usr/bin/env tsx
/**
 * Scaffolds a new game from the template.
 * Usage: npm run create-game -- my-new-game
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const gameName = process.argv[2];

if (!gameName) {
  console.error('Usage: npm run create-game -- <game-name>');
  console.error('Example: npm run create-game -- tap-jump');
  process.exit(1);
}

if (!/^[a-z][a-z0-9-]*$/.test(gameName)) {
  console.error('Game name must be lowercase alphanumeric with hyphens (e.g. tap-jump)');
  process.exit(1);
}

const gameId = gameName.startsWith('game-') ? gameName : `game-${gameName}`;
const classPrefix = gameId
  .split('-')
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join('');

const root = resolve(import.meta.dirname, '..');
const gameDir = join(root, 'src', 'games', gameId);

if (existsSync(gameDir)) {
  console.error(`Game already exists: ${gameDir}`);
  process.exit(1);
}

const scenes = ['Boot', 'Preload', 'Home', 'Gameplay', 'GameOver'] as const;

mkdirSync(join(gameDir, 'scenes'), { recursive: true });
mkdirSync(join(gameDir, 'assets'), { recursive: true });

function writeScene(name: string, content: string): void {
  writeFileSync(join(gameDir, 'scenes', `${name}Scene.ts`), content);
}

writeScene('Boot', `import Phaser from 'phaser';
import { eventBus } from '@core/events';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create(): void {
    eventBus.emit('app:ready', undefined);
    this.scene.start('Preload');
  }
}
`);

writeScene('Preload', `import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload(): void {
    // Load game assets here
  }

  create(): void {
    this.scene.start('Home');
  }
}
`);

writeScene('Home', `import Phaser from 'phaser';
import { eventBus } from '@core/events';
import { t } from '@app/modules/localization/i18n.service';

export class HomeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Home' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.add.text(width / 2, height * 0.3, '${classPrefix}', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    const playBtn = this.add.rectangle(width / 2, height * 0.5, 200, 50, 0x4a90d9)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height * 0.5, t('home.play'), {
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0.5);

    playBtn.on('pointerdown', () => {
      eventBus.emit('game:start', { gameId: '${gameId}' });
      this.scene.start('Gameplay');
    });
  }
}
`);

writeScene('Gameplay', `import Phaser from 'phaser';
import { eventBus } from '@core/events';
import { BaseGame } from '@games/types';

/**
 * Gameplay scene for ${gameId}.
 * RULE: Only emit events. No API, storage, ads, or mission logic.
 */
export class GameplayScene extends Phaser.Scene {
  private score = 0;

  constructor() {
    super({ key: 'Gameplay' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x16213e);

    this.add.text(width / 2, height / 2, 'Gameplay - implement your game here', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      align: 'center',
      wordWrap: { width: width * 0.8 },
    }).setOrigin(0.5);

    this.input.on('pointerdown', () => {
      this.score += 10;
      eventBus.emit('score:update', { score: this.score });
      eventBus.emit('jump', { count: 1 });
    });

    this.time.delayedCall(3000, () => {
      eventBus.emit('game:over', { score: this.score, duration: 3000 });
      this.scene.start('GameOver', { score: this.score });
    });
  }
}
`);

writeScene('GameOver', `import Phaser from 'phaser';
import { eventBus } from '@core/events';
import { t } from '@app/modules/localization/i18n.service';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOver' });
  }

  create(data: { score: number }): void {
    const { width, height } = this.cameras.main;

    this.add.text(width / 2, height * 0.3, t('game.gameOver'), {
      fontSize: '36px',
      color: '#f44336',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.45, t('game.score', { score: data.score }), {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    const retry = this.add.rectangle(width / 2, height * 0.6, 200, 50, 0x4a90d9)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height * 0.6, t('game.retry'), {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);
    retry.on('pointerdown', () => this.scene.start('Gameplay'));

    const home = this.add.rectangle(width / 2, height * 0.72, 200, 50, 0x6c5ce7)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height * 0.72, t('game.home'), {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);
    home.on('pointerdown', () => {
      eventBus.emit('game:destroy', undefined);
      this.scene.start('Home');
    });
  }
}
`);

const indexContent = `import type { GameConfig } from '../types';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { HomeScene } from './scenes/HomeScene';
import { GameplayScene } from './scenes/GameplayScene';
import { GameOverScene } from './scenes/GameOverScene';

export const ${gameId.replace(/-/g, '')}Config: GameConfig = {
  id: '${gameId}',
  name: '${classPrefix}',
  version: '0.1.0',
  scenes: ${JSON.stringify(scenes)},
  width: 720,
  height: 1280,
};

export const ${gameId.replace(/-/g, '')}Scenes = [
  BootScene,
  PreloadScene,
  HomeScene,
  GameplayScene,
  GameOverScene,
];
`;

writeFileSync(join(gameDir, 'index.ts'), indexContent);

// Update .env.example with new game id hint
const envExample = join(root, '.env.example');
if (existsSync(envExample)) {
  let env = readFileSync(envExample, 'utf-8');
  if (!env.includes('VITE_GAME_ID')) {
    env += `\nVITE_GAME_ID=${gameId}\n`;
    writeFileSync(envExample, env);
  }
}

console.log(`\n✅ Game created: src/games/${gameId}/`);
console.log('\nNext steps:');
console.log(`  1. Set VITE_GAME_ID=${gameId} in .env`);
console.log(`  2. Register in src/infrastructure/GameEngine.ts`);
console.log('  3. Implement gameplay in scenes/GameplayScene.ts');
console.log('  4. Add assets to assets/');
console.log('  5. npm run dev\n');
