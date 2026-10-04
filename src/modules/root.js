const ROOT_ID = 'AlertToast';

let rootElement = null;
const pending = [];

function prepareRoot(el) {
  el.classList.add('simpletoast-root');
  if (!el.hasAttribute('aria-live')) el.setAttribute('aria-live', 'polite');
  if (!el.hasAttribute('aria-relevant')) el.setAttribute('aria-relevant', 'additions');
  return el;
}

function flush() {
  pending.splice(0).forEach((callback) => callback(rootElement));
}

export function initRoot() {
  const existing = document.getElementById(ROOT_ID);
  if (existing) {
    rootElement = prepareRoot(existing);
    return;
  }
  const el = prepareRoot(document.createElement('div'));
  el.id = ROOT_ID;
  rootElement = el;
  if (document.body) {
    document.body.appendChild(el);
    return;
  }
  document.addEventListener('DOMContentLoaded', () => {
    const other = document.getElementById(ROOT_ID);
    if (other) {
      prepareRoot(other).append(...el.childNodes);
      rootElement = other;
    } else {
      document.body.appendChild(el);
    }
    flush();
  }, { once: true });
}

export const getRoot = () => rootElement;

export function whenConnected(callback) {
  if (rootElement.isConnected) {
    callback(rootElement);
  } else {
    pending.push(callback);
  }
}
