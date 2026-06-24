export type {
  CustomerDisplayEvent,
  CustomerDisplayEventType,
  CustomerDisplayLine,
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
  DEFAULT_DISPLAY_WS_PORT,
  DEFAULT_DISPLAY_WSS_PORT,
  buildDisplayWebSocketUrl,
  buildHelloMessage,
  buildCartSnapshotMessage,
  buildDisplayEventMessage,
} from "./protocol";

export {
  CUSTOMER_DISPLAY_STORAGE_KEY,
  readCustomerDisplayFromStorage,
  writeCustomerDisplayToStorage,
  type CustomerDisplayStorageV1,
} from "./storage";

export { DisplayConnection, type DisplayConnectionOptions } from "./display-client";
