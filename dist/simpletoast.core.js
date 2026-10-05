((root) => {
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

function initRoot() {
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

const getRoot = () => rootElement;

function whenConnected(callback) {
  if (rootElement.isConnected) {
    callback(rootElement);
  } else {
    pending.push(callback);
  }
}

function emit(target, type, detail, bubbles = false) {
  target.dispatchEvent(new CustomEvent(type, { detail, bubbles }));
}

const TEMPLATE_ID = 'simpletoast-template';

let warned = false;

const part = (el, name) => el.querySelector(`.simpletoast-${name}`);

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
  const first = document.getElementById(TEMPLATE_ID)?.content?.firstElementChild;
  if (!first) return null;
  const parts = describe(document.importNode(first, true));
  if (!warned && !parts.titleEl && !parts.bodyEl && !parts.footerEl) {
    warned = true;
    console.warn(`SimpleToast: #${TEMPLATE_ID} has no .simpletoast-title, .simpletoast-body or .simpletoast-footer inside its first element, so toasts will not be shown.`);
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

const version = { major: 3, minor: 0, patch: 0 };
const versionString = `${version.major}.${version.minor}${''}`;
const versionNumber = version.major * 1000000000 + version.minor * 1000 + version.patch;

function parseVersion(string) {
  const parts = String(string).split('.').map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function isNewer(string, other) {
  const a = parseVersion(string);
  const b = parseVersion(other);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

const handles = new Set();

function classes(base, extra) {
  const list = Array.isArray(extra) ? extra : [extra];
  return [base, ...list].filter(Boolean).join(' ');
}

function noop() {}

const blankToast = () => Object.freeze({
  element: document.createElement('div'),
  setText: noop,
  setTitle: noop,
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
  const toastClass = className && typeof className === 'object' && !Array.isArray(className)
    ? className.toast
    : className;
  const buttonClass = className?.button;

  el.classList.add('simpletoast');
  el.className = classes(el.className, toastClass);
  if (!dismissOnClick) el.classList.add('simpletoast-static');
  el.setAttribute('role', role ?? el.getAttribute('role') ?? 'status');
  if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
  if (data && typeof data === 'object') {
    Object.keys(data).forEach((key) => {
      el.dataset[key] = data[key];
    });
  }

  if (title && titleEl) setContent(titleEl, title);
  if (text && bodyEl) setContent(bodyEl, text);
  if (footer && footerEl) setContent(footerEl, footer);

  let closed = false;

  const handle = {
    element: el,
    setText: (newText) => {
      if (newText == null || !bodyEl || !handle.exists()) return;
      setContent(bodyEl, newText);
    },
    setTitle: (newTitle) => {
      if (newTitle == null || !titleEl || !handle.exists()) return;
      setContent(titleEl, newTitle);
    },
    exists: () => el.isConnected || (!closed && !getRoot().isConnected),
    close: (reason = 'unknown') => {
      if (closed) return;
      closed = true;
      signal?.removeEventListener('abort', onAbort);
      el.remove();
      handles.delete(handle);
      emit(el, 'simpletoast:close', { toast: handle, reason });
      emit(getRoot(), 'simpletoast:close', { toast: handle, reason }, true);
      if (typeof onClose === 'function') {
        onClose.call(handle, reason, handle);
      }
    },
  };
  const onAbort = () => handle.close('aborted');

  const buttonList = typeof buttons === 'object' && !Array.isArray(buttons) ? [buttons] : buttons;
  if (Array.isArray(buttonList)) {
    buttonList.forEach((button) => {
      if (!button?.text) return;
      const buttonEl = document.createElement('button');
      buttonEl.type = 'button';
      buttonEl.className = classes('simpletoast-button', button.className || buttonClass);
      setContent(buttonEl, button.text);
      if (typeof button.onclick === 'function') {
        buttonEl.addEventListener('click', (event) => button.onclick.call(handle, event, handle));
      }
      if (buttonsEl) {
        buttonsEl.appendChild(buttonEl);
      } else if (footerEl) {
        footerEl.parentNode.insertBefore(buttonEl, footerEl);
      } else {
        el.appendChild(buttonEl);
      }
    });
  }

  el.addEventListener('click', (event) => {
    if (!dismissOnClick || event.target.closest('button')) return;
    handle.close('dismissed');
  });
  el.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      handle.close('dismissed');
    } else if (dismissOnClick && (event.key === 'Enter' || event.key === ' ') && event.target === el) {
      event.preventDefault();
      handle.close('dismissed');
    }
  });

  signal?.addEventListener('abort', onAbort, { once: true });

  root.appendChild(el);
  handles.add(handle);
  whenConnected((connectedRoot) => {
    if (closed) return;
    emit(connectedRoot, 'simpletoast:add', { toast: handle, options }, true);
  });
  return handle;
}

Toast.version = versionNumber;
Toast.versionString = versionString;
Toast.count = () => Array.from(handles).filter((handle) => handle.exists()).length;
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
