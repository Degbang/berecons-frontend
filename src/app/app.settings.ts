const runtimeWindow =
  typeof window === 'undefined'
    ? null
    : (window as typeof window & { __APP_API_BASE__?: string });

const runtimeHost = runtimeWindow?.location.hostname ?? '';
const runtimePort = runtimeWindow?.location.port ?? '';
const isLocalHost =
  runtimeHost === 'localhost' ||
  runtimeHost === '127.0.0.1' ||
  runtimeHost === '0.0.0.0' ||
  runtimeHost === '' || // file:// or missing hostname
  runtimeHost.endsWith('.local') ||
  runtimeHost.startsWith('192.168.') ||
  runtimeHost.startsWith('10.') ||
  runtimeHost.startsWith('172.') ||
  runtimePort === '4200'; // typical Angular dev server port

const fallbackApiBase = runtimeWindow
  ? isLocalHost
    ? 'http://localhost:8080/api'
    : 'https://api.bereconstrading.com/api'
  : 'https://api.bereconstrading.com/api';

export const appSettings = {
  apiBase: runtimeWindow?.__APP_API_BASE__?.trim() || fallbackApiBase,
  cloudinaryCloudName: 'dnsu7es0c',
  cloudinaryUploadPreset: 'berecons',
  whatsappNumber: '233543210826'
};
