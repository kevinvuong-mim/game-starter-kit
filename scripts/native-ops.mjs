import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const [, , action, platform] = process.argv;

function fail(message) {
  console.error(`[native-ops] ERROR: ${message}`);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureCapPlatform(targetPlatform) {
  if (targetPlatform === 'android') {
    if (!existsSync('android')) {
      run('cap', ['add', 'android']);
    }
    return;
  }

  if (targetPlatform === 'ios') {
    if (!existsSync('ios')) {
      run('cap', ['add', 'ios']);
    }
    return;
  }

  fail(`Unsupported platform: ${targetPlatform}`);
}

function build(targetPlatform) {
  run('npm', ['run', 'build']);
  ensureCapPlatform(targetPlatform);
  run('npm', ['run', 'assets:generate']);

  if (targetPlatform === 'android') {
    run('cap', ['sync', 'android']);
    run('node', ['scripts/apply-android-native.mjs']);
    return;
  }

  if (targetPlatform === 'ios') {
    run('node', ['scripts/apply-ios-native.mjs', 'pre-sync']);
    run('cap', ['sync', 'ios']);
    run('node', ['scripts/apply-ios-native.mjs']);
    return;
  }

  fail(`Unsupported platform: ${targetPlatform}`);
}

if (action === 'ensure') {
  ensureCapPlatform(platform);
} else if (action === 'build') {
  build(platform);
} else {
  fail(`Unsupported action: ${action}`);
}
