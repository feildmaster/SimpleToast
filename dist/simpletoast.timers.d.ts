interface SimpleToastTimerOptions {
  timeout?: number;
  pauseOnHover?: boolean;
  idle?: number | boolean;
}

declare module './simpletoast.core' {
  interface SimpleToastOptions extends SimpleToastTimerOptions {}
}

export {};
