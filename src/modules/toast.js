import { emit } from './events.js';
import { getRoot, whenConnected } from './root.js';
import createStructure from './structure.js';
import { versionNumber, versionString } from './version.js';

const open = new Set();

function classes(base, extra) {
  const list = Array.isArray(extra) ? extra : [extra];
  return [base, ...list].filter(Boolean).join(' ');
}

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

  const handle = { element: el };
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
  Object.assign(handle, { exists, close });
  handle.setTitle = set.bind(null, titleEl);
  handle.setText = set.bind(null, bodyEl);
  handle.setFooter = set.bind(null, footerEl);
  const onAbort = () => close('aborted');

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

export default Toast;
