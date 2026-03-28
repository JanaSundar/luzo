import { enableMapSet } from "immer";

declare global {
  // eslint-disable-next-line no-var
  var __luzoImmerMapSetEnabled: boolean | undefined;
}

if (!globalThis.__luzoImmerMapSetEnabled) {
  enableMapSet();
  globalThis.__luzoImmerMapSetEnabled = true;
}

export {};
