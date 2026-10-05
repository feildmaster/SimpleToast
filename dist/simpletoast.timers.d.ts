interface SimpleToastTimerOptions {
  timeout?: number;
  pauseOnHover?: boolean;
  idle?: number | false;
}

declare module './simpletoast.core' {
  interface SimpleToastOptions extends SimpleToastTimerOptions {}
}

export {};
