((root) => {
const ROOT_ID = 'AlertToast';

let rootElement = null;
let settled = false;
const pending = [];
let observer = null;

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

function initRoot() {
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

const getRoot = () => rootElement;

function whenConnected(callback) {
  pending.push(callback);
  sync();
}

function emit(target, type, detail, bubbles = false) {
  target.dispatchEvent(new CustomEvent(type, { detail: Object.freeze(detail), bubbles }));
}

const TEMPLATE_ID = 'simpletoast-template';

let warned = false;

const part = (el, name) => el.querySelector(`.simpletoast-${name}`);

function wrap(fragment) {
  const el = document.createElement('div');
  el.append(fragment);
  return el;
}

function describe(el) {
  return {
    el,
    titleEl: part(el, 'title'),
    bodyEl: part(el, 'body'),
    footerEl: part(el, 'footer'),
    buttonsEl: part(el, 'buttons'),
  };
}

function fromTemplate() {
  const template = document.getElementById(TEMPLATE_ID);
  if (!template?.content?.childElementCount) return null;
  const copy = document.importNode(template.content, true);
  const parts = describe(copy.childElementCount === 1 ? copy.firstElementChild : wrap(copy));
  if (!warned && !parts.titleEl && !parts.bodyEl && !parts.footerEl) {
    warned = true;
    console.warn(`SimpleToast: #${TEMPLATE_ID} has no .simpletoast-title, .simpletoast-body or .simpletoast-footer element inside it, so toasts will not be shown.`);
  }
  return parts;
}

function fromDefault() {
  const el = document.createElement('div');
  ['title', 'body', 'footer'].forEach((name) => {
    el.appendChild(document.createElement('span')).className = `simpletoast-${name}`;
  });
  return describe(el);
}

function createStructure() {
  return fromTemplate() ?? fromDefault();
}

const version = "3.0.0";

function parse(string) {
  const [one = 0, two = 0, three = 0] = String(string).split('.').map((part) => Number(part) || 0);
  return [one, two, three];
}

const [major, minor, patch] = parse(version);

const versionString = `${major}.${minor}.${patch}`;
const versionNumber = major * 1000000000 + minor * 1000 + patch;

function isNewer(string, other) {
  const [a, b] = [parse(string), parse(other)];
  const index = a.findIndex((part, i) => part !== b[i]);
  return index >= 0 && a[index] > b[index];
}

const open = new Set();

function classes(base, extra) {
  const list = Array.isArray(extra) ? extra : [extra];
  return [base, ...list].filter(Boolean).join(' ');
}

function splitClassName(className) {
  if (className && typeof className === 'object' && !Array.isArray(className)) {
    return { toast: className.toast, button: className.button };
  }
  return { toast: className, button: undefined };
}

const dataAttribute = (key) => `data-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;

function noop() {}

const blankToast = () => Object.freeze({
  element: document.createElement('div'),
  setText: noop,
  setTitle: noop,
  setFooter: noop,
  exists: () => false,
  close: noop,
});

function Toast(input) {
  const options = Object.freeze({ ...(typeof input === 'string' ? { text: input } : input) });
  const {
    title,
    text,
    footer,
    className,
    buttons,
    onClose,
    data,
    signal,
    role,
    html = true,
    dismissOnClick = true,
  } = options;
  if (signal?.aborted) return blankToast();

  const { el, titleEl, bodyEl, footerEl, buttonsEl } = createStructure();
  if (!(title && titleEl) && !(text && bodyEl) && !(footer && footerEl)) return blankToast();

  const root = getRoot();
  const setContent = (node, value) => {
    if (html) {
      node.innerHTML = value;
    } else {
      node.textContent = value;
    }
  };
  const { toast: toastClass, button: buttonClass } = splitClassName(className);

  el.classList.add('simpletoast');
  el.className = classes(el.className, toastClass);
  if (!dismissOnClick) el.classList.add('simpletoast-static');
  el.setAttribute('role', role ?? el.getAttribute('role') ?? 'status');
  if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
  if (data && typeof data === 'object') {
    Object.keys(data).forEach((key) => {
      el.setAttribute(dataAttribute(key), String(data[key]));
    });
  }

  if (title && titleEl) setContent(titleEl, title);
  if (text && bodyEl) setContent(bodyEl, text);
  if (footer && footerEl) setContent(footerEl, footer);

  let closed = false;

  const exists = () => el.isConnected || (!closed && !getRoot().isConnected);
  function close(reason = 'unknown') {
    if (closed) return;
    closed = true;
    signal?.removeEventListener('abort', onAbort);
    el.remove();
    open.delete(exists);
    emit(el, 'simpletoast:close', { toast: handle, reason });
    emit(getRoot(), 'simpletoast:close', { toast: handle, reason }, true);
    if (typeof onClose === 'function') {
      onClose.call(handle, reason, handle);
    }
  }
  function set(element, content) {
    if (content == null || !element || !exists()) return;
    setContent(element, content);
  }
  const handle = {
    element: el,
    exists,
    close,
    setTitle: set.bind(null, titleEl),
    setText: set.bind(null, bodyEl),
    setFooter: set.bind(null, footerEl),
  };
  const onAbort = () => close('aborted');

  const buttonList = typeof buttons === 'object' && !Array.isArray(buttons) ? [buttons] : buttons;
  if (Array.isArray(buttonList)) {
    buttonList.forEach((button) => {
      if (!button?.text) return;
      const buttonEl = document.createElement('button');
      buttonEl.type = 'button';
      buttonEl.className = classes('simpletoast-button', button.className || buttonClass);
      setContent(buttonEl, button.text);
      const onClick = button.onClick ?? button.onclick;
      if (typeof onClick === 'function') {
        buttonEl.addEventListener('click', (event) => onClick.call(handle, event, handle));
      }
      if (buttonsEl) {
        buttonsEl.appendChild(buttonEl);
      } else if (footerEl) {
        footerEl.before(buttonEl);
      } else {
        el.appendChild(buttonEl);
      }
    });
  }

  el.addEventListener('click', (event) => {
    if (!dismissOnClick || event.target.closest('button')) return;
    close('dismissed');
  });
  el.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      close('dismissed');
    } else if (dismissOnClick && (event.key === 'Enter' || event.key === ' ') && event.target === el) {
      event.preventDefault();
      close('dismissed');
    }
  });

  el.addEventListener('simpletoast:dismiss', (event) => close(event.detail?.reason));

  signal?.addEventListener('abort', onAbort, { once: true });

  root.appendChild(el);
  open.add(exists);
  whenConnected(() => {
    if (closed) return;
    emit(el, 'simpletoast:add', { toast: handle, options }, true);
  });
  return handle;
}

Toast.version = versionNumber;
Toast.versionString = versionString;
Toast.count = () => Array.from(open).filter((stillExists) => stillExists()).length;
Object.freeze(Toast);

function install(root, setup) {
  if (window !== window.top) return;
  const bound = window.SimpleToast;
  initRoot();
  if (root !== window) root.SimpleToast = Toast;
  console.log(`SimpleToast(v${versionString}): Loaded`);
  if (!bound?.versionString || isNewer(versionString, bound.versionString)) {
    window.SimpleToast = Toast;
    console.log(`SimpleToast(v${versionString}): Publicized`);
  }
}

install(root);
})(this);
