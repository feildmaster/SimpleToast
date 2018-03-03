/*
 * SimpleToast - A small library for toasts
 */
(() => {
  const style = {
    root: {
      display: 'flex',
      'flex-direction': 'column-reverse',
      position: 'fixed',
      bottom: 0,
      right: 0,
      zIndex: 1000,
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
    const el = document.createElement('div');
    el.setAttribute('id', 'AlertToast');
    applyCSS(el, style.root);
  
    const body = document.getElementsByTagName('body')[0];
    body.insertBefore(el, body.firstChild);
  
    setInterval(() => { // TODO: don't always run a timer
      const now = Date.now();
      toasts.forEach((toast) => {
        if (!toast.timeout || now < toast.timeout) return;
        // Close toast
        toast.close();
      });
    }, 1000);
    return el;
  })();
  let count = 0;

  function Toast({text, css, buttons, timeout}) {
    if (!text) return;
    const id = count++;
    const el = document.createElement('div');
    el.setAttribute('id', `AlertToast-${id}`);
    applyCSS(el, style.shared);
    applyCSS(el, style.toast);
    applyCSS(el, css);

    // Add body
    el.textContent = text;
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