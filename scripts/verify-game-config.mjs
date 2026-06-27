import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function extractString(source, key) {
  const match = new RegExp(`${key}:\\s*['"]([^'"]+)['"]`).exec(source);
  return match?.[1];
}

function extractNumber(source, key) {
  const match = new RegExp(`${key}:\\s*(\\d+)`).exec(source);
  return match ? Number(match[1]) : undefined;
}

function readGameConfig() {
  const configPath = resolve(process.cwd(), 'src/game/config.ts');
  const source = readFileSync(configPath, 'utf8');
  const id = extractString(source, 'id');
  const name = extractString(source, 'name');
  const replaySecret = extractString(source, 'replaySecret');
  const maxScore = extractNumber(source, 'maxScore');

  if (!id || !name || !replaySecret || !maxScore) {
    throw new Error('src/game/config.ts must define id, name, maxScore, and replaySecret.');
  }

  return { id, name, maxScore, replaySecret };
}

async function verifyApiGame(apiUrl, gameId) {
  const url = new URL('/leaderboards', apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`);
  url.searchParams.set('gameId', gameId);
  url.searchParams.set('page', '1');
  url.searchParams.set('limit', '1');

  const response = await fetch(url);
  if (response.status === 404) {
    throw new Error(`Backend does not know gameId "${gameId}". Run api-starter-kit npm run game:register.`);
  }

  if (!response.ok) {
    throw new Error(`Backend config check failed: ${response.status} ${response.statusText}`);
  }
}

async function main() {
  const config = readGameConfig();
  const apiUrl = process.env.VITE_API_URL ?? 'http://localhost:3000/api';

  console.log('Client game config:');
  console.log(JSON.stringify({ ...config, replaySecret: '<redacted>' }, null, 2));

  if (process.env.SKIP_API_CHECK === 'true') {
    console.log('Skipped backend check because SKIP_API_CHECK=true.');
    return;
  }

  await verifyApiGame(apiUrl, config.id);
  console.log(`Backend accepts gameId "${config.id}" at ${apiUrl}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
