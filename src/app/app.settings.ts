const runtimeWindow =
  typeof window === 'undefined'
    ? null
    : (window as typeof window & { __APP_API_BASE__?: string });

const runtimeHost = runtimeWindow?.location.hostname ?? '';
const isLocalHost = runtimeHost === 'localhost' || runtimeHost === '127.0.0.1';
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
