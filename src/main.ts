import { gameEngine } from '@infra/GameEngine';

async function main(): Promise<void> {
  try {
    await gameEngine.bootstrap();
  } catch (error) {
    console.error('Failed to start game platform:', error);
  }
}

main();
