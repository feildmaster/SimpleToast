import type {
  SimpleToastBaseOptions,
  SimpleToastElementEvents,
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

  interface HTMLElementEventMap extends SimpleToastEvents<SimpleToastOptions>, SimpleToastElementEvents {}

  interface DocumentEventMap extends SimpleToastEvents<SimpleToastOptions> {}
}
