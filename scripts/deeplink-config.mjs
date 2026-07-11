/**
 * Shared deeplink env resolution for native apply scripts and docs.
 */

const DEFAULT_SCHEME = 'gamestarterkit';
const DEFAULT_HOST_PROD = 'gamestarterkit.example.com';
const DEFAULT_HOST_DEV = 'dev.gamestarterkit.example.com';

export function resolveDeepLinkScheme() {
  return process.env.VITE_DEEPLINK_SCHEME?.trim() || DEFAULT_SCHEME;
}

export function resolveDeepLinkHostDev() {
  return process.env.VITE_DEEPLINK_HOST_DEV?.trim() || DEFAULT_HOST_DEV;
}

export function resolveDeepLinkHostProd() {
  return process.env.VITE_DEEPLINK_HOST_PROD?.trim() || DEFAULT_HOST_PROD;
}

export function resolveDeepLinkHosts() {
  const hosts = [resolveDeepLinkHostDev(), resolveDeepLinkHostProd()];
  return [...new Set(hosts.filter(Boolean))];
}
