import { emit } from './events.js';
import { getRoot, whenConnected } from './root.js';
import createStructure from './structure.js';
import { versionNumber, versionString } from './version.js';

/** @typedef {import('../types/shared').SimpleToastHandle} SimpleToastHandle */
/** @typedef {import('../types/shared').SimpleToastBaseOptions} SimpleToastBaseOptions */
/** @typedef {import('../types/shared').SimpleToastClassName} SimpleToastClassName */
/** @template O @typedef {import('../types/shared').SimpleToastFactory<O>} SimpleToastFactory */

/** @type {Set<() => boolean>} */
const open = new Set();

/**
 * @param {string} base
 * @param {SimpleToastClassName | undefined} extra
 */
function classes(base, extra) {
  const list = Array.isArray(extra) ? extra : [extra];
  return [base, ...list].filter(Boolean).join(' ');
}

/** @param {SimpleToastBaseOptions['className']} className */
function splitClassName(className) {
  if (className && typeof className === 'object' && !Array.isArray(className)) {
    return { toast: className.toast, button: className.button };
  }
  return { toast: className, button: undefined };
}

/** @param {string} key */
const dataAttribute = (key) => `data-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;

function noop() {}

/** @returns {SimpleToastHandle} */
const blankToast = () => Object.freeze({
  element: document.createElement('div'),
  setText: noop,
  setTitle: noop,
  setFooter: noop,
  exists: () => false,
  close: noop,
});

/**
 * @param {SimpleToastBaseOptions | string} [input]
 * @returns {SimpleToastHandle}
 */
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
  /**
   * @param {HTMLElement} node
   * @param {string} value
   */
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
  /** @param {import('../types/shared').SimpleToastCloseReason} [reason] */
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
  /**
   * @param {HTMLElement | null} element
   * @param {string | null | undefined} content
   */
  function set(element, content) {
    if (content == null || !element || !exists()) return;
    setContent(element, content);
  }
  /** @type {SimpleToastHandle} */
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
    if (!dismissOnClick || /** @type {Element} */ (event.target).closest('button')) return;
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

export default /** @type {SimpleToastFactory<SimpleToastBaseOptions>} */ (/** @type {unknown} */ (Toast));
