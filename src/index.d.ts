export * from './core';

declare module './core' {
  interface SimpleToastOptions {
    timeout?: number;
    pauseOnHover?: boolean;
    idle?: number | false;
  }
}
