// Change appId before copying this foundation into a new product.
// Never use personal or account identifiers in namespaces.
export const appConfig = {
  appId: 'pwa-base-layer',
  name: 'PWA Base Layer',
  shortName: 'PWA Base',
  description: 'A private-by-default foundation for offline apps.',
  themeColor: '#172c24',
  backgroundColor: '#f5f5f0',
};

export function normalizeBase(value = '/') {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(value)) {
    throw new Error('BASE_PATH must be an absolute directory path with a trailing slash.');
  }
  return value;
}
