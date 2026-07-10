/* ============================================================================
   CoShop — Native Capability Interfaces
   ----------------------------------------------------------------------------
   The seam between the UI and platform features (camera, location, speech).
   Components depend ONLY on these interfaces, never on `window.*` or a native
   plugin directly. A web implementation backs them today; Capacitor (or Expo)
   implementations are dropped in for Phase 2/3 without touching components.
   ========================================================================== */

export interface ImagePickOptions {
  /** Prefer the device camera over the photo library when supported. */
  camera?: boolean;
}

export interface CameraCapability {
  isAvailable(): boolean;
  /**
   * Pick or capture an image. Resolves to a base64 data URL, or `null` if the
   * user cancelled. Throws `Error(message)` on an invalid file (bad type/size).
   */
  pickImage(opts?: ImagePickOptions): Promise<string | null>;
}

export interface GeoPosition {
  latitude: number;
  longitude: number;
}

export interface GeolocationCapability {
  isAvailable(): boolean;
  /** Current coarse position, or `null` if denied/unavailable. (Used in P3.) */
  getCurrentPosition(): Promise<GeoPosition | null>;
}

export interface SpeechCapability {
  isAvailable(): boolean;
  /** Phase 2 fills this in (web Speech API / native plugin). */
  transcribe?(): Promise<string | null>;
}

export interface Capabilities {
  camera: CameraCapability;
  geolocation: GeolocationCapability;
  speech: SpeechCapability;
}
