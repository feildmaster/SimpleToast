declare const root: Window;

declare module '*.css' {
  const css: string;
  export default css;
}

declare module 'package-version' {
  const version: string;
  export default version;
}
