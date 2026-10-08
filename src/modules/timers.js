/** @typedef {import('../types/shared').SimpleToastTimerOptions} SimpleToastTimerOptions */

const DEFAULT_IDLE = 30000;
const MAX_DELAY = 2 ** 31 - 1;
const MARK = 'data-simpletoast-timed';
const INPUT_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel'];

/**
 * @typedef {object} Timer
 * @property {number} remaining
 * @property {number | null} startedAt
 * @property {ReturnType<typeof setTimeout> | undefined} id
 * @property {boolean} hover
 * @property {boolean} focus
 * @property {boolean} idleHeld
 * @property {boolean} pauseOnHover
 * @property {number | false} idle
 * @property {() => void} expire
 */

/** @type {Set<Timer>} */
const timed = new Set();
let lastInput = Date.now();
let listening = false;

/** @param {Timer} timer */
function holdReason(timer) {
  if (timer.pauseOnHover && (timer.hover || timer.focus)) return 'presence';
  if (document.visibilityState !== 'visible' || !document.hasFocus()) return 'page';
  if (timer.idle !== false && Date.now() - lastInput >= timer.idle) return 'idle';
  return null;
}

/** @param {Timer} timer */
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

/** @param {SimpleToastTimerOptions['idle']} idle */
function idleThreshold(idle) {
  if (idle === undefined || idle === true) return DEFAULT_IDLE;
  const threshold = Number(idle);
  return threshold > 0 && Number.isFinite(threshold) ? threshold : false;
}

/** @param {SimpleToastTimerOptions['timeout']} timeout */
function timeoutDuration(timeout) {
  const duration = Number(timeout);
  return duration > 0 && Number.isFinite(duration) ? duration : 0;
}

/**
 * @param {SimpleToastTimerOptions} options
 * @param {() => void} expire
 * @returns {Timer | null}
 */
function createTimer({ timeout, pauseOnHover = true, idle }, expire) {
  const duration = timeoutDuration(timeout);
  if (!duration) return null;
  return {
    remaining: duration,
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

/** @param {Timer} timer */
function startTimer(timer) {
  timed.add(timer);
  listen();
  sync(timer);
}

/** @param {Timer} timer */
function stopTimer(timer) {
  clearTimeout(timer.id);
  timed.delete(timer);
}

/**
 * @param {Timer} timer
 * @param {HTMLElement} el
 */
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

export function installTimers() {
  document.addEventListener('simpletoast:add', (event) => {
    const { options } = event.detail;
    const el = /** @type {HTMLElement} */ (event.target);
    if (!options || el.hasAttribute(MARK) || !el.isConnected) return;
    const timer = createTimer(options, () => {
      el.dispatchEvent(new CustomEvent('simpletoast:dismiss', { detail: { reason: 'timeout' } }));
    });
    if (!timer) return;
    el.setAttribute(MARK, '');
    bindPresence(timer, el);
    el.addEventListener('simpletoast:close', () => stopTimer(timer), { once: true });
    startTimer(timer);
  });
}
