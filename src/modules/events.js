/** @typedef {import('../types/shared').SimpleToastEvents<import('../types/simpletoast').SimpleToastOptions>} Events */

/**
 * @template {keyof Events} K
 * @param {EventTarget} target
 * @param {K} type
 * @param {Events[K]['detail']} detail
 * @param {boolean} [bubbles]
 */
export function emit(target, type, detail, bubbles = false) {
  target.dispatchEvent(new CustomEvent(type, { detail, bubbles }));
}
