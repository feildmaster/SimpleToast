/*
 * SimpleToast - A small library for toasts
 */
(() => {
  if (window.SimpleToast) return;
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
    shared: {
      maxWidth: '320px',
      padding: '5px 8px',
      borderRadius: '3px',
      fontFamily: 'cursive, sans-serif',
      fontSize: '13px',
      cursor: 'pointer',
      color: '#fafeff',
      margin: '4px',
    },
    toast: {
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
  const root = (() => {
    function create() {
      const el = document.createElement('div');
      el.setAttribute('id', 'AlertToast');
      applyCSS(el, style.root);

      const body = document.getElementsByTagName('body')[0];
      if (body) { // Depending on when the script is loaded... this might be null
        body.appendChild(el);
      } else {
        window.addEventListener('load', () => {
          if (document.getElementById(el.id)) return; // Another script may have created it already
          document.getElementsByTagName('body')[0].appendChild(el);
        });
      }
      return el;
    }
  
    setInterval(() => { // TODO: don't always run a timer
      const now = Date.now();
      toasts.forEach((toast) => {
        if (!toast.timeout || now < toast.timeout) return;
        // Close toast
        toast.close();
      });
    }, 1000);
    return document.getElementById('AlertToast') || create();
  })();
  let count = 0;

  function Toast({title, text, css = {}, buttons, timeout}) {
    if (typeof arguments[0] === 'string') {
      text = arguments[0];
    }
    if (!text) return;
    const id = count++;
    const el = document.createElement('div');
    el.setAttribute('id', `AlertToast-${id}`);
    applyCSS(el, style.shared);
    applyCSS(el, style.toast);
    applyCSS(el, css.toast || css);

    // Add title, body
    if (title) {
      const tel = document.createElement('span');
      applyCSS(tel, style.title);
      applyCSS(tel, title.css);
      tel.textContent = title.text || title;
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
        elb.innerHTML = button.text;
        applyCSS(elb, style.button);
        applyCSS(elb, css.button);
        applyCSS(elb, button.css);
        if (typeof button.onclick === 'function') {
          elb.onclick = button.onclick;
        }
        let prev = {};
        elb.onmouseover = () => {
          // Apply default style
          const original = applyCSS(elb, style.button.mouseOver);
          // Apply CSS style
          const custom = applyCSS(elb, css.button && css.button.mouseOver);
          // Apply button style
          const custom2 = applyCSS(elb, button.css && button.css.mouseOver);
          // Remember the original styles, do this in reverse
          Object.assign(prev, custom2, custom, original); 
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
    return toast;
  }
  
  window.SimpleToast = Toast;
})();
