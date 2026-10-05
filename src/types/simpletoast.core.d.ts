import type { SimpleToastBaseOptions, SimpleToastEvents, SimpleToastFactory } from './shared';

export type {
  SimpleToastButton,
  SimpleToastClassName,
  SimpleToastCloseReason,
  SimpleToastHandle,
  SimpleToastRole,
} from './shared';

export interface SimpleToastOptions extends SimpleToastBaseOptions {}

export type SimpleToastStatic = SimpleToastFactory<SimpleToastOptions>;

declare global {
  interface Window {
    SimpleToast?: SimpleToastStatic;
  }

  interface HTMLElementEventMap extends SimpleToastEvents<SimpleToastOptions> {}
}
