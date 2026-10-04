export function emit(target, type, detail, bubbles = false) {
  target.dispatchEvent(new CustomEvent(type, { detail, bubbles }));
}
