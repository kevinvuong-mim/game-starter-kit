import { cpSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const sourceRoot = process.env.PLATFORM_SOURCE
  ? resolve(process.env.PLATFORM_SOURCE)
  : resolve(process.cwd(), '..', 'game-starter-kit');
const sourcePlatform = resolve(sourceRoot, 'src/platform');
const targetPlatform = resolve(process.cwd(), 'src/platform');
const apply = process.argv.includes('--apply');

if (!existsSync(sourcePlatform)) {
  console.error(`Missing source platform directory: ${sourcePlatform}`);
  process.exit(1);
}

if (sourcePlatform === targetPlatform && apply) {
  console.error('Refusing to apply: source and target platform directories are the same.');
  process.exit(1);
}

console.log(`Source platform: ${sourcePlatform}`);
console.log(`Target platform: ${targetPlatform}`);

if (!apply) {
  console.log('Dry run only. Re-run with --apply to replace src/platform.');
  process.exit(0);
}

rmSync(targetPlatform, { force: true, recursive: true });
cpSync(sourcePlatform, targetPlatform, { recursive: true });
console.log('Updated src/platform from source starter kit.');
