const getEnvVar = (key: string) => {
  const rv = (window as any).runtimeConfig?.[key] || import.meta.env[key];

  if (rv && rv.startsWith('__') && rv.endsWith('__')) return undefined;

  return rv;
};

const getBooleanEnvVar = (key: string): boolean => {
  const value = (window as any).runtimeConfig?.[key] ?? import.meta.env[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
  }
  return false;
};

export const config = {
  api: {
    baseUrl: getEnvVar('VITE_API_BASE_URL'),
  },
  websocket: {
    url: getEnvVar('VITE_WS_URL'),
  },
  signaling: {
    url: getEnvVar('VITE_SIGNALING_URL'),
  },
  sentry: {
    dsn: getEnvVar('VITE_SENTRY_DSN') || getEnvVar('VITE_SENTRY_DSN_FRONTEND'),
    release: getEnvVar('VITE_APP_VERSION') || '1.0.0',
  },
  debug: {
    showPanels: getBooleanEnvVar('VITE_DEBUG_PANELS'),
  },
};