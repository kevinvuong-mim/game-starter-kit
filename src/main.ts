import { gameEngine } from '@platform/bootstrap/GameEngine';

async function main(): Promise<void> {
  try {
    await gameEngine.bootstrap();

    window.addEventListener('beforeunload', () => {
      gameEngine.destroy();
    });
  } catch (error) {
    console.error('Failed to start game platform:', error);
  }
}

main();
