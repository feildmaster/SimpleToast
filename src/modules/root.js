/** @typedef {(root: HTMLElement) => void} RootCallback */

const ROOT_ID = 'AlertToast';

/** @type {HTMLElement | null} */
let rootElement = null;
let settled = false;
/** @type {RootCallback[]} */
const pending = [];
/** @type {MutationObserver | null} */
let observer = null;

/** @param {HTMLElement} el */
function prepareRoot(el) {
  el.classList.add('simpletoast-root');
  if (!el.hasAttribute('aria-live')) el.setAttribute('aria-live', 'polite');
  if (!el.hasAttribute('aria-relevant')) el.setAttribute('aria-relevant', 'additions');
  return el;
}

function flush() {
  pending.splice(0).forEach((callback) => callback(getRoot()));
}

function reconnect() {
  const current = getRoot();
  if (!settled || current.isConnected || !document.body) return;
  const other = document.getElementById(ROOT_ID);
  if (other) {
    prepareRoot(other).append(...current.childNodes);
    rootElement = other;
  } else {
    document.body.appendChild(current);
  }
}

function unwatch() {
  observer?.disconnect();
  observer = null;
}

function watch() {
  if (!settled || observer) return;
  observer = new MutationObserver(sync);
  observer.observe(document, { childList: true, subtree: true });
}

function sync() {
  reconnect();
  if (getRoot().isConnected) flush();
  if (pending.length) {
    watch();
  } else {
    unwatch();
  }
}

export function initRoot() {
  const existing = document.getElementById(ROOT_ID);
  if (existing) {
    rootElement = prepareRoot(existing);
    settled = true;
    return;
  }
  const el = prepareRoot(document.createElement('div'));
  el.id = ROOT_ID;
  rootElement = el;
  if (document.body) {
    document.body.appendChild(el);
    settled = true;
    return;
  }
  document.addEventListener('DOMContentLoaded', () => {
    settled = true;
    sync();
  }, { once: true });
}

export const getRoot = () => /** @type {HTMLElement} */ (rootElement);

/** @param {RootCallback} callback */
export function whenConnected(callback) {
  pending.push(callback);
  sync();
}
