export interface AbortHandle {
  controller: AbortController;
  signal: AbortSignal;
  abort(): void;
}

export function createAbortController(): AbortHandle {
  const controller = new AbortController();
  return {
    controller,
    signal: controller.signal,
    abort(): void {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    }
  };
}

export function isAbortError(err: unknown): boolean {
  if (err instanceof Error) {
    return err.name === "AbortError" || err.message === "aborted";
  }
  return false;
}
