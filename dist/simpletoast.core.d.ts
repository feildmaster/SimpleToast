type AnyString = (string & {});

type SimpleToastClassName = string | string[];

type SimpleToastCloseReason = 'timeout' | 'dismissed' | 'aborted' | 'unknown' | AnyString;

type SimpleToastRole = 'status' | 'alert' | 'log' | AnyString;

interface SimpleToastHandle {
  readonly element: HTMLElement;
  exists(): boolean;
  setText(text: string): void;
  setTitle(title: string): void;
  setFooter(footer: string): void;
  close(reason?: SimpleToastCloseReason): void;
}

interface SimpleToastButton {
  text: string;
  className?: SimpleToastClassName;
  onClick?(this: SimpleToastHandle, event: MouseEvent, toast: SimpleToastHandle): void;
  /** @deprecated Use `onClick` */
  onclick?(this: SimpleToastHandle, event: MouseEvent, toast: SimpleToastHandle): void;
}

interface SimpleToastBaseOptions {
  title?: string;
  text?: string;
  footer?: string;
  buttons?: SimpleToastButton | SimpleToastButton[];
  className?: SimpleToastClassName | { toast?: SimpleToastClassName; button?: SimpleToastClassName };
  data?: Record<string, string | number | boolean>;
  html?: boolean;
  dismissOnClick?: boolean;
  role?: SimpleToastRole;
  signal?: AbortSignal;
  onClose?(this: SimpleToastHandle, reason: SimpleToastCloseReason, toast: SimpleToastHandle): void;
}

interface SimpleToastFactory<Options> {
  (options: Options | string): SimpleToastHandle;
  new (options: Options | string): SimpleToastHandle;
  readonly version: number;
  readonly versionString: string;
  count(): number;
}

interface SimpleToastEvents<Options> {
  'simpletoast:add': CustomEvent<{ toast: SimpleToastHandle; options: Options }>;
  'simpletoast:close': CustomEvent<{ toast: SimpleToastHandle; reason: SimpleToastCloseReason }>;
}

interface SimpleToastOptions extends SimpleToastBaseOptions {}

type SimpleToastStatic = SimpleToastFactory<SimpleToastOptions>;

declare global {
  interface Window {
    SimpleToast?: SimpleToastStatic;
  }

  interface HTMLElementEventMap extends SimpleToastEvents<SimpleToastOptions> {}
}

export type { SimpleToastButton, SimpleToastClassName, SimpleToastCloseReason, SimpleToastHandle, SimpleToastOptions, SimpleToastRole, SimpleToastStatic };
