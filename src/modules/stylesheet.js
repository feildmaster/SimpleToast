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
  const { head } = document;
  if (!head) {
    document.documentElement.appendChild(el);
    return;
  }
  head.insertBefore(el, head.querySelector(':scope > style, :scope > link[rel~="stylesheet"]'));
}
