import type { CapacitorConfig } from '@capacitor/cli';

/* ============================================================================
   Capacitor configuration
   ----------------------------------------------------------------------------
   Wraps the built web app (dist/) as native iOS/Android shells. Native
   platforms are added on demand (`npx cap add ios|android`) and are not
   committed in Phase 1. Native plugins (camera, geolocation, speech) are
   layered in for Phase 2/3 behind src/lib/capabilities.
   ========================================================================== */

const config: CapacitorConfig = {
  appId: 'com.coshop.app',
  appName: 'CoShop',
  webDir: 'dist',
};

export default config;
