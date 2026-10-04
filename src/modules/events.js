export function emit(target, type, detail) {
  target.dispatchEvent(new CustomEvent(type, { detail }));
}
