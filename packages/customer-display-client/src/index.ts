export type {
  CustomerDisplayCustomer,
  CustomerDisplayEvent,
  CustomerDisplayEventType,
  CustomerDisplayLine,
  CustomerDisplayPaymentLine,
  CustomerDisplayPaymentSummary,
  CustomerDisplaySnapshot,
  CustomerDisplayState,
  DisplayStatusPayload,
} from "./display-snapshot";
export {
  emptyIdleSnapshot,
  validateCustomerDisplaySnapshot,
} from "./display-snapshot";

export {
  DISPLAY_PROTOCOL_VERSION,
  SUPPORTED_DISPLAY_PROTOCOL_VERSIONS,
  DEFAULT_DISPLAY_WS_PORT,
  DEFAULT_DISPLAY_WSS_PORT,
  buildDisplayWebSocketUrl,
  buildHelloMessage,
  buildCartSnapshotMessage,
  buildDisplayEventMessage,
  isSupportedDisplayProtocolVersion,
} from "./protocol";

export {
  CUSTOMER_DISPLAY_STORAGE_KEY,
  readCustomerDisplayFromStorage,
  writeCustomerDisplayToStorage,
  type CustomerDisplayStorageV1,
} from "./storage";

export { DisplayConnection, type DisplayConnectionOptions } from "./display-client";

export type { KaiScreenAndroidManifest, KaiScreenDownloadOffer } from "./kai-screen-downloads";
export {
  KAI_SCREEN_ANDROID_MANIFEST_DEFAULT,
  androidManifestFilename,
  fetchKaiScreenAndroidManifest,
  listKaiScreenDownloadOffers,
  resolveKaiScreenDownloadUrl,
} from "./kai-screen-downloads";
export { KaiScreenDownloadSection } from "./kai-screen-download-section";
