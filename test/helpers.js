import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { withGlobal } from '@sinonjs/fake-timers';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (file) => fs.readFileSync(path.join(dir, file), 'utf8');

export const sources = {
  injecting: read('../dist/simpletoast.js'),
  core: read('../dist/simpletoast.core.js'),
  css: read('../dist/simpletoast.css'),
  legacy: read('fixtures/simpletoast-2.0.3.js'),
};

export function createPage(html = '<!doctype html><body></body>') {
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
  const window = dom.window;
  const clock = withGlobal(window).install({ now: 1000000 });
  const state = { focused: true, visibility: 'visible' };
  window.document.hasFocus = () => state.focused;
  Object.defineProperty(window.document, 'visibilityState', { get: () => state.visibility });
  window.console.log = () => {};

  const page = {
    window,
    document: window.document,
    clock,
    state,
    load(source = sources.injecting, { sandbox = false } = {}) {
      window.eval(sandbox ? `(function () {\n${source}\n}).call({})` : source);
      return window.SimpleToast;
    },
    root: () => window.document.getElementById('AlertToast'),
    input(type = 'pointermove') {
      window.document.dispatchEvent(new window.Event(type, { bubbles: true }));
    },
    setVisible(visible) {
      state.visibility = visible ? 'visible' : 'hidden';
      window.document.dispatchEvent(new window.Event('visibilitychange'));
    },
    setFocused(focused) {
      state.focused = focused;
      window.dispatchEvent(new window.Event(focused ? 'focus' : 'blur'));
    },
    fire(element, type, init) {
      element.dispatchEvent(new window.Event(type, init));
    },
    close: () => {
      clock.uninstall();
      window.close();
    },
  };
  return page;
}
