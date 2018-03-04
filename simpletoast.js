/*
 * SimpleToast - A small library for toasts
 */
(() => {
  if (window !== window.top) return;
  const version = buildVersion(1, 4, 1);
  if (window.SimpleToast) {
    if (SimpleToast.version) {
      if (SimpleToast.version >= version.number) return;
    }
    console.log(`SimpleToast(v${version.string}): Overriding SimpleToast(v${SimpleToast.versionString || '[unknown]'})`);
  } else {
    console.log(`SimpleToast(v${version.string}): Loading`);
  }
  const style = {
    root: {
      display: 'flex',
      'flex-direction': 'column-reverse',
      'align-items': 'flex-end',
      position: 'fixed',
      bottom: 0,
      right: 0,
      zIndex: 1000,
    },
    title: {
      display: 'block',
      fontSize: '15px',
      'font-style': 'italic',
    },
    toast: {
      maxWidth: '320px',
      padding: '5px 8px',
      borderRadius: '3px',
      fontFamily: 'cursive, sans-serif',
      fontSize: '13px',
      cursor: 'pointer',
      color: '#fafeff',
      margin: '4px',
      textShadow: '#3498db 1px 2px 1px',
      background: '#2980b9',
    },
    button: {
      height: '20px',
      margin: '-3px 0 0 3px',
      padding: '0 5px',
      verticalAlign: 'middle',
      whiteSpace: 'nowrap',
      border: '1px solid rgba(27,31,35,0.2)',
      borderRadius: '10px',
      fontSize: '11px',
      textShadow: '#173646 0px 0px 3px',
      background: '#2c9fea',
      mouseOver: {
        'border-color': 'rgba(27,31,35,0.35)',
        background: '#149FFF',
      },
    },
  };

  function applyCSS(element, css = {}) {
    const old = {};
    Object.keys(css).forEach((key) => {
      const val = css[key];
      if (typeof val === 'object') return;
      old[key] = element.style[key];
      element.style[key] = css[key];
    });
    return old;
  }

  const toasts = new Map();
  let root = (() => {
    function create() {
      const el = document.createElement('div');
      el.setAttribute('id', 'AlertToast');
      applyCSS(el, style.root);

      const body = document.getElementsByTagName('body')[0];
      if (body) { // Depending on when the script is loaded... this might be null
        body.appendChild(el);
      } else {
        window.addEventListener('load', () => {
          const exists = document.getElementById(el.id);
          if (exists) { // Another script may have created it already
            if (el.hasChildNodes()) { // Transfer existing nodes to new root
              const nodes = el.childNodes;
              for (let i = 0, l = nodes.length; i < l; i++) {
                exists.appendChild(nodes[i]);
              }
            }
            root = exists; // Set this incase anyone still has a reference to this toast
            return;
          }
          document.getElementsByTagName('body')[0].appendChild(el);
        });
      }
      return el;
    }
    return document.getElementById('AlertToast') || create();
  })();
  let count = 0;

  let timeout = null;
  function startTimeout() {
    if (timeout) return;
    timeout = setTimeout(() => {
      timeout = null;
      const now = Date.now();
      let pending = 0;
      toasts.forEach((toast) => {
        if (!toast.timeout) return;
        if (now < toast.timeout) {
          pending += 1;
          return;
        }
        toast.close();
      });
      if (pending) {
        startTimeout();
      }
    }, 1000);
  }

  function Toast({title, text, className, css = {}, buttons, timeout}) {
    if (typeof arguments[0] === 'string') {
      text = arguments[0];
    }
    if (!text) return;
    const id = count++;
    const el = document.createElement('div');
    if (className) {
      const clazz = className.toast || className;
      el.className = Array.isArray(clazz) ? clazz.join(' ') : (typeof clazz === 'string' ? clazz : undefined);
    }
    applyCSS(el, style.toast);
    applyCSS(el, css.toast || css);

    // Add title, body
    if (title) {
      const tel = document.createElement('span');
      applyCSS(tel, style.title);
      applyCSS(tel, css.title);
      tel.textContent = title;
      el.appendChild(tel);
    }
    const body = document.createElement('span');
    body.textContent = text;
    el.appendChild(body);
    const toast = {
      close: () => {
        root.removeChild(el);
        toasts.delete(id);
      },
    };
    if (timeout) {
      toast.timeout = Date.now() + timeout;
    }

    if (typeof buttons === 'object') {
      if (!Array.isArray(buttons)) {
        buttons = [buttons];
      }
      buttons.forEach((button) => {
        if (!button.text) return;
        const elb = document.createElement('button');
        if (button.className || className && className.button) {
          const clazz = button.className || className.button;
          elb.className = Array.isArray(clazz) ? clazz.join(' ') : clazz;
        }
        elb.innerHTML = button.text;
        applyCSS(elb, style.button);
        applyCSS(elb, css.button);
        applyCSS(elb, button.css);
        if (typeof button.onclick === 'function') {
          elb.onclick = button.onclick;
        }
        let prev = {};
        elb.onmouseover = () => {
          const hoverStyle = Object.assign(
            {},
            style.button.mouseOver,
            css.button && css.button.mouseOver,
            button.css && button.css.mouseOver
          );
          prev = applyCSS(hoverStyle);
        };
        elb.onmouseout = () => {
          applyCSS(elb, prev);
          prev = {};
        };
        el.appendChild(elb);
      });
    }
    el.addEventListener('click', toast.close);

    root.appendChild(el);
    toasts.set(id, toast);
    if (timeout) {
      startTimeout();
    }
    return toast;
  }

  Toast.version = version.number;
  Toast.versionString = version.string;
  window.SimpleToast = Toast;
  function buildVersion(major, minor = 0, patch = 0) {
    return {
      string: `${major}.${minor}${patch ? `.${patch}` : ''}`,
      number: major * 1000000000 + minor * 1000 +  patch,
    };
  }
})();
