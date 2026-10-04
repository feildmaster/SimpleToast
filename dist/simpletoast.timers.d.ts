export {};

declare module './simpletoast.core' {
  interface SimpleToastOptions {
    timeout?: number;
    pauseOnHover?: boolean;
    idle?: number | false;
  }
}
