import type {
  SimpleToastBaseOptions,
  SimpleToastEvents,
  SimpleToastFactory,
  SimpleToastTimerOptions,
} from './shared';

export type {
  SimpleToastButton,
  SimpleToastClassName,
  SimpleToastCloseReason,
  SimpleToastHandle,
  SimpleToastRole,
  SimpleToastTimerOptions,
} from './shared';

export interface SimpleToastOptions extends SimpleToastBaseOptions, SimpleToastTimerOptions {}

export type SimpleToastStatic = SimpleToastFactory<SimpleToastOptions>;

declare global {
  interface Window {
    SimpleToast?: SimpleToastStatic;
  }

  interface HTMLElementEventMap extends SimpleToastEvents<SimpleToastOptions> {}

  interface DocumentEventMap extends SimpleToastEvents<SimpleToastOptions> {}
}
