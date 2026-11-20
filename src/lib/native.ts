import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { App as NativeApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
export const isNative = Capacitor.isNativePlatform();
export const SecureSession = registerPlugin<{
  read(): Promise<{ token: string | null }>;
  write(options: { token: string }): Promise<void>;
  clear(): Promise<void>;
}>('SecureSession');
export const StepCounter = registerPlugin<{
  isAvailable(): Promise<{ available: boolean }>;
  start(): Promise<{ started: boolean }>;
  stop(): Promise<{ stopped: boolean }>;
  getSteps(): Promise<{ steps: number; date: string; source: string; measuredAt: string }>;
  hasPermission(): Promise<{ granted: boolean }>;
}>('StepCounter');
let serverUrl = '';
export function apiOrigin() {
  return serverUrl;
}
export async function nativeSettings() {
  if (!isNative) return '';
  const defaultUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
  const stored = await Preferences.get({ key: 'fittrack-server' });
  if (defaultUrl.startsWith('https://') && (!stored.value || stored.value.startsWith('http://'))) {
    serverUrl = defaultUrl;
    await Preferences.set({ key: 'fittrack-server', value: defaultUrl });
  } else {
    serverUrl = stored.value || defaultUrl;
  }
  document.documentElement.classList.add('native-app');
  await Promise.allSettled([
    SplashScreen.hide(),
    StatusBar.setStyle({ style: Style.Dark }),
    StatusBar.setOverlaysWebView({ overlay: false }),
  ]);
  return serverUrl;
}
export function validServerUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash)
      return false;
    if (url.protocol === 'https:') return true;
    return (
      url.protocol === 'http:' &&
      /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(
        url.hostname,
      )
    );
  } catch {
    return false;
  }
}
export async function connectServer(value: string) {
  const url = value.trim().replace(/\/$/, '');
  if (!validServerUrl(url))
    throw new Error(
      'Enter an HTTPS server address, or a private local-network address for development.',
    );
  const response = await CapacitorHttp.get({
    url: `${url}/api/health`,
    connectTimeout: 10000,
    readTimeout: 10000,
  });
  if (response.status !== 200 || response.data?.status !== 'ok')
    throw new Error('The fitness server is not ready. Check the address and your connection.');
  if (url !== serverUrl) await SecureSession.clear();
  await Preferences.set({ key: 'fittrack-server', value: url });
  serverUrl = url;
}
export async function nativePhoto(source: 'camera' | 'gallery') {
  const { Camera, CameraSource, CameraResultType } = await import('@capacitor/camera');
  const photo = await Camera.getPhoto({
    source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
    resultType: CameraResultType.Uri,
    quality: 85,
    width: 1400,
    height: 1400,
    correctOrientation: true,
    saveToGallery: false,
  });
  if (!photo.webPath) throw new Error('No photo was selected.');
  const blob = await (await fetch(photo.webPath)).blob();
  return new File([blob], `fittrack-photo.${photo.format}`, {
    type: blob.type || `image/${photo.format}`,
  });
}
export async function privateImage(url: string) {
  const token = (await SecureSession.read()).token;
  const absolute = url.startsWith('/api/images/') ? `${serverUrl}${url}` : url;
  if (!absolute.startsWith(`${serverUrl}/api/images/`)) return url;
  const response = await CapacitorHttp.get({
    url: absolute,
    headers: token ? { Authorization: `Bearer ${token}`, 'X-FitTrack-Native': '1' } : {},
    responseType: 'arraybuffer',
  });
  if (response.status !== 200) throw new Error('Photo unavailable.');
  return `data:image/webp;base64,${response.data}`;
}
export function installNativeLifecycle() {
  if (!isNative || lifecycleInstalled) return;
  lifecycleInstalled = true;
  NativeApp.addListener('backButton', ({ canGoBack }) => {
    const dialog = document.querySelector('dialog[open]');
    if (dialog) {
      dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
      return;
    }
    if (canGoBack && !['/', '/login', '/register'].includes(location.pathname)) history.back();
    else NativeApp.minimizeApp().catch(() => {});
  });
  const openLink = ({ url }: { url: string }) => {
    try {
      const parsed = new URL(url);
      const token = parsed.searchParams.get('token');
      if (
        parsed.protocol === 'fittrack:' &&
        parsed.hostname === 'reset-password' &&
        token &&
        /^[a-f0-9]{64}$/.test(token)
      ) {
        const path = `/reset-password?token=${token}`;
        if (`${location.pathname}${location.search}` !== path) location.href = path;
      }
    } catch {}
  };
  NativeApp.addListener('appUrlOpen', openLink);
  NativeApp.getLaunchUrl()
    .then((result) => {
      if (result) openLink(result);
    })
    .catch(() => {});
}
let lifecycleInstalled = false;
export async function nativeTheme(theme: string) {
  if (!isNative) return;
  await Promise.allSettled([
    StatusBar.setStyle({ style: theme === 'light' ? Style.Light : Style.Dark }),
    StatusBar.setBackgroundColor({ color: theme === 'light' ? '#f5f6f0' : '#111512' }),
  ]);
}
export async function shareDataExport(data: unknown, date: string) {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const result = await Filesystem.writeFile({
    path: `fittrack-export-${date}.json`,
    data: JSON.stringify(data, null, 2),
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  await Share.share({
    title: 'Your FitTrack AI data',
    files: [result.uri],
    dialogTitle: 'Save or share your data export',
  });
}
