/* ============================================================================
   CoShop — Capability Resolver
   ----------------------------------------------------------------------------
   Single entry point components import: `import { capabilities } from
   '../lib/capabilities'`. Today it always resolves to the web implementation.
   In Phase 2/3, detect the native shell (e.g. Capacitor.isNativePlatform())
   here and return Capacitor-backed capabilities instead — no component changes.
   ========================================================================== */

import type { Capabilities } from './types';
import { webCapabilities } from './web';

export const capabilities: Capabilities = webCapabilities;

export type {
  Capabilities,
  CameraCapability,
  GeolocationCapability,
  SpeechCapability,
  GeoPosition,
  ImagePickOptions,
} from './types';
