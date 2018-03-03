/*
 * SimpleToast - A small library for toasts
 */
(() => {
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
      display: 'inline-block',
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
      textShadow: '#173646 0px 0px 3px',
      background: '#2c9fea',
    },
  };

  function applyCSS(element, css = {}) {
    Object.keys(css).forEach((key) => {
      element.style[key] = css[key];
    });
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

  function Toast({title, text, css, buttons, timeout}) {
    if (typeof arguments[0] === 'string') {
      text = arguments[0];
    }
    if (!text) return;
    const id = count++;
    const el = document.createElement('div');
    el.setAttribute('id', `AlertToast-${id}`);
    applyCSS(el, style.shared);
    applyCSS(el, style.toast);
    applyCSS(el, css);

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
  
    if (buttons) {
      // TODO: Add buttons
    }
    el.addEventListener('click', toast.close);

    root.appendChild(el);
    toasts.set(id, toast);
    return toast;
  }
  
  window.SimpleToast = Toast;
})();
