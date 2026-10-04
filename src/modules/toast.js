import { emit } from './events.js';
import { getRoot } from './root.js';
import { versionNumber, versionString } from './version.js';

const handles = new Set();

function classes(base, extra) {
  const list = Array.isArray(extra) ? extra : [extra];
  return [base, ...list].filter(Boolean).join(' ');
}

function noop() {}

const blankToast = () => Object.freeze({
  element: document.createElement('div'),
  setText: noop,
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
    role = 'status',
    html = true,
  } = options;
  if (!title && !text && !footer) return blankToast();
  if (signal?.aborted) return blankToast();

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

  const el = document.createElement('div');
  el.className = classes('simpletoast', toastClass);
  el.setAttribute('role', role);
  el.tabIndex = 0;
  if (data && typeof data === 'object') {
    Object.keys(data).forEach((key) => {
      el.dataset[key] = data[key];
    });
  }

  const titleEl = el.appendChild(document.createElement('span'));
  titleEl.className = 'simpletoast-title';
  const bodyEl = el.appendChild(document.createElement('span'));
  bodyEl.className = 'simpletoast-body';
  const footerEl = el.appendChild(document.createElement('span'));
  footerEl.className = 'simpletoast-footer';
  if (title) setContent(titleEl, title);
  if (text) setContent(bodyEl, text);
  if (footer) setContent(footerEl, footer);

  let closed = false;

  const handle = {
    element: el,
    setText: (newText) => {
      if (newText == null || !handle.exists()) return;
      setContent(bodyEl, newText);
    },
    exists: () => el.isConnected || (!closed && !getRoot().isConnected),
    close: (reason = 'unknown') => {
      if (closed) return;
      closed = true;
      signal?.removeEventListener('abort', onAbort);
      el.remove();
      handles.delete(handle);
      emit(el, 'simpletoast:close', { toast: handle, reason });
      emit(getRoot(), 'simpletoast:close', { toast: handle, reason });
      if (typeof onClose === 'function') {
        onClose.call(handle, reason, handle);
      }
    },
  };
  function onAbort() {
    handle.close('aborted');
  }

  const buttonList = buttons && typeof buttons === 'object' && !Array.isArray(buttons) ? [buttons] : buttons;
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
      el.insertBefore(buttonEl, footerEl);
    });
  }

  el.addEventListener('click', (event) => {
    if (event.target.closest('button')) return;
    handle.close('dismissed');
  });
  el.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      handle.close('dismissed');
    } else if ((event.key === 'Enter' || event.key === ' ') && event.target === el) {
      event.preventDefault();
      handle.close('dismissed');
    }
  });

  signal?.addEventListener('abort', onAbort, { once: true });

  root.appendChild(el);
  handles.add(handle);
  emit(root, 'simpletoast:add', { toast: handle, options });
  return handle;
}

Toast.version = versionNumber;
Toast.versionString = versionString;
Toast.count = () => Array.from(handles).filter((handle) => handle.exists()).length;
Object.freeze(Toast);

export default Toast;
