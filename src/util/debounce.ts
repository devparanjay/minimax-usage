export type TimerHandle = ReturnType<typeof setTimeout> | null;

export function debounce<F extends (...args: never[]) => void>(
  fn: F,
  ms: number
): ((...args: Parameters<F>) => void) & { cancel: () => void; flush: () => void } {
  let handle: TimerHandle = null;
  let lastArgs: Parameters<F> | null = null;

  const wrapped = (...args: Parameters<F>): void => {
    lastArgs = args;
    if (handle !== null) {
      clearTimeout(handle);
    }
    handle = setTimeout(() => {
      handle = null;
      const a = lastArgs;
      if (a !== null) {
        fn(...a);
      }
    }, ms);
  };

  wrapped.cancel = (): void => {
    if (handle !== null) {
      clearTimeout(handle);
      handle = null;
    }
    lastArgs = null;
  };

  wrapped.flush = (): void => {
    if (handle !== null) {
      clearTimeout(handle);
      handle = null;
      const a = lastArgs;
      if (a !== null) {
        fn(...a);
      }
    }
  };

  return wrapped;
}

export interface CoalesceHandle {
  cancel(): void;
}

export function coalesce<F extends (...args: never[]) => Promise<void> | void>(
  fn: F,
  ms: number
): (...args: Parameters<F>) => CoalesceHandle {
  let timer: TimerHandle = null;
  let lastArgs: Parameters<F> | null = null;

  const trigger = (): void => {
    timer = null;
    const a = lastArgs;
    lastArgs = null;
    if (a !== null) {
      void fn(...a);
    }
  };

  const wrapper = (...args: Parameters<F>): CoalesceHandle => {
    lastArgs = args;
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(trigger, ms);
    return {
      cancel(): void {
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
        lastArgs = null;
      }
    };
  };

  return wrapper;
}
