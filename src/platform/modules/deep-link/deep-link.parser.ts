import {
  type DeepLinkSource,
  resolveDeepLinkScene,
  type DeepLinkPayload,
  normalizeDeepLinkPath,
} from './deep-link.model';
import type { DeepLinkConfig } from './deep-link.config';

export function parseDeepLinkUrl(
  url: string,
  config: DeepLinkConfig,
  source: DeepLinkSource
): DeepLinkPayload | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const scheme = config.scheme.toLowerCase();
  const isCustomScheme = parsed.protocol === `${scheme}:`;
  const isHttp = parsed.protocol === 'https:' || parsed.protocol === 'http:';

  let path: string | null = null;

  if (isCustomScheme) {
    path = resolveCustomSchemePath(parsed);
  } else if (isHttp && config.allowedHosts.includes(parsed.hostname)) {
    path = parsed.pathname;
  } else {
    return null;
  }

  if (!path) {
    return null;
  }

  const scene = resolveDeepLinkScene(path);
  if (!scene) {
    return null;
  }

  const params: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return {
    url: trimmed,
    path: normalizeDeepLinkPath(path),
    scene,
    source,
    params,
  };
}

function resolveCustomSchemePath(parsed: URL): string | null {
  const pathname = parsed.pathname;
  if (pathname && pathname !== '/') {
    return pathname;
  }

  const hostSegment = parsed.hostname?.trim();
  if (hostSegment) {
    return `/${hostSegment}`;
  }

  const authoritySegment = parsed.host?.trim();
  if (authoritySegment && authoritySegment !== parsed.hostname) {
    return `/${authoritySegment}`;
  }

  return null;
}
