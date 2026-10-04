import { isNewer, versionString } from './version.js';

export function injectStylesheet(css) {
  const existing = document.querySelector('style[data-simpletoast-stylesheet]');
  if (existing) {
    if (isNewer(versionString, existing.dataset.version)) {
      existing.textContent = css;
      existing.dataset.version = versionString;
    }
    return;
  }
  const el = document.createElement('style');
  el.dataset.simpletoastStylesheet = '';
  el.dataset.version = versionString;
  el.textContent = css;
  (document.head || document.documentElement).appendChild(el);
}
