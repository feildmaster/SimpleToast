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

export default function createStructure() {
  return fromTemplate() ?? fromDefault();
}
