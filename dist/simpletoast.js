((root) => {
const css = ".simpletoast-root {\n  display: flex;\n  flex-direction: column-reverse;\n  align-items: flex-end;\n  position: fixed;\n  bottom: var(--simpletoast-bottom, 0);\n  right: var(--simpletoast-right, 0);\n  z-index: var(--simpletoast-z-index, 1000);\n  white-space: pre-wrap;\n}\n\n.simpletoast {\n  box-sizing: border-box;\n  max-width: var(--simpletoast-max-width, 320px);\n  margin: var(--simpletoast-gap, 4px);\n  padding: 5px 8px;\n  border-radius: 3px;\n  font-family: var(--simpletoast-font, cursive, sans-serif);\n  font-size: 13px;\n  cursor: pointer;\n  color: var(--simpletoast-color, #fafeff);\n  text-shadow: var(--simpletoast-shadow, #3498db 1px 2px 1px);\n  background: var(--simpletoast-bg, #2980b9);\n\n  &.simpletoast-static {\n    cursor: default;\n  }\n\n  &:focus-visible {\n    outline: 2px solid var(--simpletoast-color, #fafeff);\n    outline-offset: 1px;\n  }\n}\n\n.simpletoast-title {\n  display: block;\n  font-size: 15px;\n  font-style: italic;\n}\n\n.simpletoast-footer {\n  display: block;\n  font-size: 10px;\n}\n\n.simpletoast-title:empty,\n.simpletoast-footer:empty {\n  display: none;\n}\n\n.simpletoast-button {\n  height: 20px;\n  margin: -3px 0 0 3px;\n  padding: 0 5px;\n  vertical-align: middle;\n  white-space: nowrap;\n  border: 1px solid rgba(27, 31, 35, 0.2);\n  border-radius: 10px;\n  font-size: 11px;\n  color: inherit;\n  text-shadow: #173646 0 0 3px;\n  background: var(--simpletoast-button-bg, #2c9fea);\n  cursor: pointer;\n\n  &:hover {\n    border-color: rgba(27, 31, 35, 0.35);\n    background: var(--simpletoast-button-bg-hover, #149fff);\n  }\n}\n";

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
  observer = new MutationObserver(sync$1);
  observer.observe(document, { childList: true, subtree: true });
}

function sync$1() {
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
    sync$1();
  }, { once: true });
}

const getRoot = () => rootElement;

function whenConnected(callback) {
  pending.push(callback);
  sync$1();
}

function emit(target, type, detail, bubbles = false) {
  target.dispatchEvent(new CustomEvent(type, { detail, bubbles }));
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
  const options = typeof input === 'string' ? { text: input } : input || {};
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

  signal?.addEventListener('abort', onAbort, { once: true });

  root.appendChild(el);
  open.add(exists);
  whenConnected((connectedRoot) => {
    if (closed) return;
    emit(connectedRoot, 'simpletoast:add', { toast: handle, options }, true);
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
  if (setup) setup();
  if (root !== window) root.SimpleToast = Toast;
  console.log(`SimpleToast(v${versionString}): Loaded`);
  if (!bound?.versionString || isNewer(versionString, bound.versionString)) {
    window.SimpleToast = Toast;
    console.log(`SimpleToast(v${versionString}): Publicized`);
  }
}

function injectStylesheet(css) {
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

const DEFAULT_IDLE = 30000;
const MAX_DELAY = 2 ** 31 - 1;
const MARK = 'data-simpletoast-timed';
const INPUT_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel'];

const timed = new Set();
let lastInput = Date.now();
let listening = false;

function holdReason(timer) {
  if (timer.pauseOnHover && (timer.hover || timer.focus)) return 'presence';
  if (document.visibilityState !== 'visible' || !document.hasFocus()) return 'page';
  if (timer.idle !== false && Date.now() - lastInput >= timer.idle) return 'idle';
  return null;
}

function sync(timer) {
  const now = Date.now();
  if (timer.startedAt !== null) {
    timer.remaining -= now - timer.startedAt;
    timer.startedAt = null;
    clearTimeout(timer.id);
  }
  if (timer.remaining <= 0) {
    timer.expire();
    return;
  }
  const reason = holdReason(timer);
  timer.idleHeld = reason === 'idle';
  if (reason) return;
  timer.startedAt = now;
  const untilIdle = timer.idle === false ? Infinity : Math.max(0, lastInput + timer.idle - now);
  timer.id = setTimeout(() => sync(timer), Math.min(timer.remaining, untilIdle, MAX_DELAY));
}

function listen() {
  if (listening) return;
  listening = true;
  lastInput = Date.now();
  const onInput = () => {
    lastInput = Date.now();
    timed.forEach((timer) => {
      if (timer.idleHeld) sync(timer);
    });
  };
  INPUT_EVENTS.forEach((type) => window.addEventListener(type, onInput, { capture: true, passive: true }));
  const onPageChange = () => timed.forEach((timer) => sync(timer));
  document.addEventListener('visibilitychange', onPageChange);
  window.addEventListener('blur', onPageChange);
  window.addEventListener('focus', () => {
    lastInput = Date.now();
    onPageChange();
  });
}

function idleThreshold(idle) {
  if (idle === undefined || idle === true) return DEFAULT_IDLE;
  const threshold = Number(idle);
  return threshold > 0 && Number.isFinite(threshold) ? threshold : false;
}

function createTimer({ timeout, pauseOnHover = true, idle }, expire) {
  if (!(timeout && timeout > 0 && Number.isFinite(timeout))) return null;
  return {
    remaining: timeout,
    startedAt: null,
    id: undefined,
    hover: false,
    focus: false,
    idleHeld: false,
    pauseOnHover,
    idle: idleThreshold(idle),
    expire,
  };
}

function startTimer(timer) {
  timed.add(timer);
  listen();
  sync(timer);
}

function stopTimer(timer) {
  clearTimeout(timer.id);
  timed.delete(timer);
}

function bindPresence(timer, el) {
  el.addEventListener('pointerenter', () => {
    timer.hover = true;
    sync(timer);
  });
  el.addEventListener('pointerleave', () => {
    timer.hover = false;
    sync(timer);
  });
  el.addEventListener('focusin', () => {
    timer.focus = true;
    sync(timer);
  });
  el.addEventListener('focusout', () => {
    timer.focus = el.matches(':focus-within');
    sync(timer);
  });
}

function installTimers() {
  document.addEventListener('simpletoast:add', (event) => {
    const { toast, options } = event.detail;
    const { element: el, exists, close } = toast;
    if (!options || el.hasAttribute(MARK) || !exists()) return;
    const timer = createTimer(options, () => close('timeout'));
    if (!timer) return;
    el.setAttribute(MARK, '');
    bindPresence(timer, el);
    el.addEventListener('simpletoast:close', () => stopTimer(timer), { once: true });
    startTimer(timer);
  });
}

install(root, () => {
  injectStylesheet(css);
  installTimers();
});
})(this);
