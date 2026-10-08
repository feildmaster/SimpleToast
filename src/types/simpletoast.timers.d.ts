import type { SimpleToastTimerOptions } from './shared';

export {};

declare module './simpletoast.core' {
  interface SimpleToastOptions extends SimpleToastTimerOptions {}
}
