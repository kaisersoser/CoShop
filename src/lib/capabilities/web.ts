/* ============================================================================
   CoShop — Web Capability Implementations
   ----------------------------------------------------------------------------
   Browser-based backing for the capability interfaces. Works in the PWA and,
   via the WebView, inside a Capacitor shell until native plugins replace
   individual capabilities in Phase 2/3.
   ========================================================================== */

import type {
  Capabilities,
  CameraCapability,
  GeolocationCapability,
  ImagePickOptions,
  GeoPosition,
  SpeechCapability,
} from './types';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const webCamera: CameraCapability = {
  isAvailable: () => typeof document !== 'undefined',

  pickImage: (opts?: ImagePickOptions) =>
    new Promise<string | null>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (opts?.camera) input.setAttribute('capture', 'environment');
      input.style.display = 'none';

      // Detect cancellation: focus returns to the window with no file chosen.
      let settled = false;
      const cleanup = () => {
        window.removeEventListener('focus', onFocus);
        input.remove();
      };
      const onFocus = () => {
        // Give the change event a tick to fire first.
        setTimeout(() => {
          if (!settled) {
            settled = true;
            cleanup();
            resolve(null);
          }
        }, 400);
      };

      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return; // onFocus handles the cancel case
        settled = true;
        window.removeEventListener('focus', onFocus);
        if (!file.type.startsWith('image/')) {
          cleanup();
          reject(new Error('Please choose an image file.'));
          return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          cleanup();
          reject(new Error('Image must be under 8 MB.'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          cleanup();
          resolve(reader.result as string);
        };
        reader.onerror = () => {
          cleanup();
          reject(new Error('Could not read this image.'));
        };
        reader.readAsDataURL(file);
      };

      window.addEventListener('focus', onFocus);
      document.body.appendChild(input);
      input.click();
    }),
};

const webGeolocation: GeolocationCapability = {
  isAvailable: () => typeof navigator !== 'undefined' && 'geolocation' in navigator,

  getCurrentPosition: () =>
    new Promise<GeoPosition | null>((resolve) => {
      if (!navigator?.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
      );
    }),
};

const webSpeech: SpeechCapability = {
  // Web Speech API is absent in iOS WKWebView; Phase 2 swaps a native plugin.
  isAvailable: () =>
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),
};

export const webCapabilities: Capabilities = {
  camera: webCamera,
  geolocation: webGeolocation,
  speech: webSpeech,
};
