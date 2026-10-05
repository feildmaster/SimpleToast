type AnyString = (string & {});

export type SimpleToastClassName = string | string[];

export type SimpleToastCloseReason = 'timeout' | 'dismissed' | 'aborted' | 'unknown' | AnyString;

export type SimpleToastRole = 'status' | 'alert' | 'log' | AnyString;

export interface SimpleToastHandle {
  readonly element: HTMLElement;
  exists(): boolean;
  setText(text: string): void;
  setTitle(title: string): void;
  close(reason?: SimpleToastCloseReason): void;
}

export interface SimpleToastButton {
  text: string;
  className?: SimpleToastClassName;
  onclick?(this: SimpleToastHandle, event: MouseEvent, toast: SimpleToastHandle): void;
}

export interface SimpleToastOptions {
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

export interface SimpleToastStatic {
  (options: SimpleToastOptions | string): SimpleToastHandle;
  new (options: SimpleToastOptions | string): SimpleToastHandle;
  readonly version: number;
  readonly versionString: string;
  count(): number;
}

declare global {
  interface Window {
    SimpleToast?: SimpleToastStatic;
  }

  interface HTMLElementEventMap {
    'simpletoast:add': CustomEvent<{ toast: SimpleToastHandle; options: SimpleToastOptions }>;
    'simpletoast:close': CustomEvent<{ toast: SimpleToastHandle; reason: SimpleToastCloseReason }>;
  }
}
