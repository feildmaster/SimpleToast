const TEMPLATE_ID = 'simpletoast-template';

let warned = false;

/**
 * @typedef {object} Structure
 * @property {HTMLElement} el
 * @property {HTMLElement | null} titleEl
 * @property {HTMLElement | null} bodyEl
 * @property {HTMLElement | null} footerEl
 * @property {HTMLElement | null} buttonsEl
 */

/**
 * @param {HTMLElement} el
 * @param {string} name
 * @returns {HTMLElement | null}
 */
const part = (el, name) => el.querySelector(`.simpletoast-${name}`);

/** @param {DocumentFragment} fragment */
function wrap(fragment) {
  const el = document.createElement('div');
  el.append(fragment);
  return el;
}

/**
 * @param {HTMLElement} el
 * @returns {Structure}
 */
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
  const template = /** @type {HTMLTemplateElement | null} */ (document.getElementById(TEMPLATE_ID));
  if (!template?.content?.childElementCount) return null;
  const copy = document.importNode(template.content, true);
  const parts = describe(copy.childElementCount === 1 ? /** @type {HTMLElement} */ (copy.firstElementChild) : wrap(copy));
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

export default function createStructure() {
  return fromTemplate() ?? fromDefault();
}
