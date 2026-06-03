import * as vscode from "vscode";
import { SECRET_API_KEY } from "./keys";
import { getDevApiKey } from "./devKey";

export type SecretChangeHandler = (key: string | undefined) => void;

export interface SecretStorageLike {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  onDidChange?: (handler: (key: string | undefined) => void) => vscode.Disposable;
}

export interface SecretStorageWrapper {
  getApiKey(): Promise<string | undefined>;
  setApiKey(key: string): Promise<void>;
  deleteApiKey(): Promise<void>;
  onDidChangeApiKey(handler: SecretChangeHandler): vscode.Disposable;
}

export function createSecretStorageWrapper(store: SecretStorageLike): SecretStorageWrapper {
  const disposables: vscode.Disposable[] = [];
  const handlers: SecretChangeHandler[] = [];

  const fire = (key: string | undefined): void => {
    if (key !== SECRET_API_KEY) {
      return;
    }
    for (const h of handlers) {
      h(key);
    }
  };

  if (store.onDidChange) {
    disposables.push(store.onDidChange((key) => {
      fire(key);
    }));
  }

  return {
    async getApiKey(): Promise<string | undefined> {
      const stored = await store.get(SECRET_API_KEY);
      if (typeof stored === "string" && stored.length > 0) {
        return stored;
      }
      const dev = getDevApiKey();
      return dev;
    },
    async setApiKey(key: string): Promise<void> {
      await store.store(SECRET_API_KEY, key);
      fire(SECRET_API_KEY);
    },
    async deleteApiKey(): Promise<void> {
      await store.delete(SECRET_API_KEY);
      fire(SECRET_API_KEY);
    },
    onDidChangeApiKey(handler: SecretChangeHandler): vscode.Disposable {
      handlers.push(handler);
      return new vscode.Disposable(() => {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) {
          handlers.splice(idx, 1);
        }
      });
    }
  };
}

export function wrapVscodeSecretStorage(secrets: vscode.SecretStorage): SecretStorageLike {
  return {
    get: async (key) => await secrets.get(key),
    store: async (key, value) => {
      await secrets.store(key, value);
    },
    delete: async (key) => {
      await secrets.delete(key);
    },
    onDidChange: (handler) => {
      const d: vscode.Disposable = secrets.onDidChange((e) => handler(e.key));
      return d;
    }
  };
}
