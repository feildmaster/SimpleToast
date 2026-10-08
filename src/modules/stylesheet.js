import { isNewer, versionString } from './version.js';

/** @param {string | undefined} version */
const isVersion = (version) => /^\d+(\.\d+){2}$/.test(version ?? '');

/** @param {string} css */
export function injectStylesheet(css) {
  const existing = /** @type {HTMLStyleElement | null} */ (document.querySelector('style[data-simpletoast-stylesheet]'));
  if (existing) {
    if (isVersion(existing.dataset.version) && isNewer(versionString, existing.dataset.version)) {
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
