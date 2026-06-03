declare const __DEV_API_KEY__: string;
declare const __DEV_API_KEY_ENABLED__: boolean;

export const DEV_API_KEY_ENABLED: boolean = __DEV_API_KEY_ENABLED__;
export const DEV_API_KEY: string = __DEV_API_KEY__;

export function getDevApiKey(): string | undefined {
  if (!DEV_API_KEY_ENABLED) {
    return undefined;
  }
  if (typeof DEV_API_KEY !== "string" || DEV_API_KEY.length === 0) {
    return undefined;
  }
  return DEV_API_KEY;
}
