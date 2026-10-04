import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPage, sources } from './helpers.js';

describe('timeouts', () => {
  let page;
  let SimpleToast;
  const tick = (ms) => page.clock.tick(ms);

  beforeEach(() => {
    page = createPage();
    SimpleToast = page.load();
  });
  afterEach(() => page.close());

  it('stay open without a timeout', () => {
    const toast = SimpleToast({ text: 'a', idle: false });
    tick(10 * 60 * 1000);
    expect(toast.exists()).toBe(true);
  });

  it('close with the timeout reason to the millisecond', () => {
    const onClose = vi.fn();
    const toast = SimpleToast({ text: 'a', timeout: 2500, onClose });
    tick(2499);
    expect(toast.exists()).toBe(true);
    tick(1);
    expect(toast.exists()).toBe(false);
    expect(onClose.mock.calls[0][0]).toBe('timeout');
  });

  it('run independently for each toast', () => {
    const a = SimpleToast({ text: 'a', timeout: 1000 });
    tick(500);
    const b = SimpleToast({ text: 'b', timeout: 1000 });
    tick(500);
    expect(a.exists()).toBe(false);
    expect(b.exists()).toBe(true);
    tick(500);
    expect(b.exists()).toBe(false);
  });

  it('leave no timers behind after a manual close', () => {
    SimpleToast({ text: 'a', timeout: 1000 }).close();
    expect(page.clock.countTimers()).toBe(0);
  });

  describe('hover and focus', () => {
    it('pause while hovered and resume with the remaining time', () => {
      const toast = SimpleToast({ text: 'a', timeout: 100 });
      tick(60);
      page.fire(toast.element, 'pointerenter');
      tick(10000);
      expect(toast.exists()).toBe(true);
      page.fire(toast.element, 'pointerleave');
      tick(39);
      expect(toast.exists()).toBe(true);
      tick(1);
      expect(toast.exists()).toBe(false);
    });

    it('ignore hover when pauseOnHover is false', () => {
      const toast = SimpleToast({ text: 'a', timeout: 100, pauseOnHover: false });
      page.fire(toast.element, 'pointerenter');
      tick(100);
      expect(toast.exists()).toBe(false);
    });

    it('pause while focus is inside the toast', () => {
      const toast = SimpleToast({ text: 'a', timeout: 100 });
      tick(50);
      page.fire(toast.element, 'focusin', { bubbles: true });
      tick(10000);
      expect(toast.exists()).toBe(true);
      page.fire(toast.element, 'focusout', { bubbles: true });
      tick(49);
      expect(toast.exists()).toBe(true);
      tick(1);
      expect(toast.exists()).toBe(false);
    });
  });

  describe('page visibility', () => {
    it('pause while the tab is hidden', () => {
      const toast = SimpleToast({ text: 'a', timeout: 100, idle: false });
      tick(40);
      page.setVisible(false);
      tick(10000);
      expect(toast.exists()).toBe(true);
      page.setVisible(true);
      tick(59);
      expect(toast.exists()).toBe(true);
      tick(1);
      expect(toast.exists()).toBe(false);
    });

    it('pause while the window is blurred', () => {
      const toast = SimpleToast({ text: 'a', timeout: 100, idle: false });
      tick(40);
      page.setFocused(false);
      tick(10000);
      expect(toast.exists()).toBe(true);
      page.setFocused(true);
      tick(60);
      expect(toast.exists()).toBe(false);
    });

    it('do not start while the page is hidden', () => {
      page.state.visibility = 'hidden';
      const toast = SimpleToast({ text: 'a', timeout: 100, idle: false });
      tick(10000);
      expect(toast.exists()).toBe(true);
      page.setVisible(true);
      tick(100);
      expect(toast.exists()).toBe(false);
    });
  });

  describe('idle', () => {
    it('hold after 30 seconds without input and resume on the next input', () => {
      const toast = SimpleToast({ text: 'a', timeout: 60000 });
      tick(30000);
      tick(100000);
      expect(toast.exists()).toBe(true);
      page.input();
      tick(29999);
      expect(toast.exists()).toBe(true);
      tick(1);
      expect(toast.exists()).toBe(false);
    });

    it('count input as activity that delays the hold', () => {
      const toast = SimpleToast({ text: 'a', timeout: 45000 });
      tick(20000);
      page.input('keydown');
      tick(20000);
      expect(toast.exists()).toBe(true);
      tick(5000);
      expect(toast.exists()).toBe(false);
    });

    it('use the idle option as the threshold', () => {
      const toast = SimpleToast({ text: 'a', timeout: 1000, idle: 800 });
      tick(5000);
      expect(toast.exists()).toBe(true);
      page.input();
      tick(199);
      expect(toast.exists()).toBe(true);
      tick(1);
      expect(toast.exists()).toBe(false);
    });

    it('can be turned off', () => {
      const toast = SimpleToast({ text: 'a', timeout: 90000, idle: false });
      tick(90000);
      expect(toast.exists()).toBe(false);
    });

    it('treat every kind of input as activity', () => {
      for (const type of ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel']) {
        page.input();
        const toast = SimpleToast({ text: type, timeout: 40000 });
        tick(30000);
        page.input(type);
        tick(10000);
        expect(toast.exists(), type).toBe(false);
      }
    });
  });

  describe('as a feature', () => {
    it('are absent from the core build', () => {
      page.close();
      page = createPage();
      SimpleToast = page.load(sources.core);
      const toast = SimpleToast({ text: 'a', timeout: 100, idle: false });
      tick(10000);
      expect(toast.exists()).toBe(true);
      expect(page.clock.countTimers()).toBe(0);
    });

    it('run once when two copies share the root', () => {
      page.close();
      page = createPage();
      page.load(sources.injecting, { sandbox: true });
      page.load(sources.injecting, { sandbox: true });
      const onClose = vi.fn();
      const toast = page.window.SimpleToast({ text: 'a', timeout: 100, idle: false, onClose });
      expect(page.clock.countTimers()).toBe(1);
      tick(100);
      expect(toast.exists()).toBe(false);
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('mark the toast element only when it has a timeout', () => {
      expect(SimpleToast('a').element.hasAttribute('data-simpletoast-timed')).toBe(false);
      expect(SimpleToast({ text: 'a', timeout: 100 }).element.hasAttribute('data-simpletoast-timed')).toBe(true);
    });

    it('ignore a toast whose add event carries no options', () => {
      const toast = SimpleToast('a');
      page.root().dispatchEvent(new page.window.CustomEvent('simpletoast:add', { detail: { toast } }));
      expect(page.clock.countTimers()).toBe(0);
    });
  });

  describe('as an add-on to core', () => {
    const setup = (order) => {
      page.close();
      page = createPage();
      page.window.document.hasFocus = () => true;
      order.forEach((source) => page.load(source, { sandbox: true }));
      return page.window.SimpleToast;
    };

    it.each([
      ['core first', ['core', 'timers']],
      ['add-on first', ['timers', 'core']],
    ])('closes a timed toast with %s', (_, order) => {
      const Toast = setup(order.map((key) => sources[key]));
      const onClose = vi.fn();
      const toast = Toast({ text: 'a', timeout: 100, idle: false, onClose });
      tick(99);
      expect(toast.exists()).toBe(true);
      tick(1);
      expect(toast.exists()).toBe(false);
      expect(onClose.mock.calls[0][0]).toBe('timeout');
    });

    it('pauses on hover and resumes', () => {
      const Toast = setup([sources.core, sources.timers]);
      const toast = Toast({ text: 'a', timeout: 100, idle: false });
      tick(60);
      page.fire(toast.element, 'pointerenter');
      tick(10000);
      expect(toast.exists()).toBe(true);
      page.fire(toast.element, 'pointerleave');
      tick(40);
      expect(toast.exists()).toBe(false);
    });

    it('does nothing for toasts without a timeout', () => {
      const Toast = setup([sources.core, sources.timers]);
      const toast = Toast('a');
      tick(100000);
      expect(toast.exists()).toBe(true);
      expect(page.clock.countTimers()).toBe(0);
    });

    it('runs once when the all-in-one build is loaded as well', () => {
      const Toast = setup([sources.core, sources.timers, sources.injecting]);
      const onClose = vi.fn();
      Toast({ text: 'a', timeout: 100, idle: false, onClose });
      expect(page.clock.countTimers()).toBe(1);
      tick(100);
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('runs once when the add-on is loaded twice', () => {
      const Toast = setup([sources.core, sources.timers, sources.timers]);
      Toast({ text: 'a', timeout: 100, idle: false });
      expect(page.clock.countTimers()).toBe(1);
    });

    it('starts the timeout of a toast shown before the body exists once it is attached', () => {
      page.close();
      page = createPage();
      page.window.document.hasFocus = () => true;
      page.document.body.remove();
      page.load(sources.core, { sandbox: true });
      page.load(sources.timers, { sandbox: true });
      const toast = page.window.SimpleToast({ text: 'early', timeout: 100, idle: false });
      tick(10000);
      expect(toast.exists()).toBe(true);

      page.document.documentElement.appendChild(page.document.createElement('body'));
      page.document.dispatchEvent(new page.window.Event('DOMContentLoaded'));
      tick(99);
      expect(toast.exists()).toBe(true);
      tick(1);
      expect(toast.exists()).toBe(false);
    });

    it('is ignored by a toast that closes before it is attached', () => {
      page.close();
      page = createPage();
      page.document.body.remove();
      page.load(sources.core, { sandbox: true });
      page.load(sources.timers, { sandbox: true });
      page.window.SimpleToast({ text: 'early', timeout: 100, idle: false }).close();
      page.document.documentElement.appendChild(page.document.createElement('body'));
      page.document.dispatchEvent(new page.window.Event('DOMContentLoaded'));
      expect(page.clock.countTimers()).toBe(0);
    });
  });

  describe('listeners', () => {
    it('are not registered until a toast has a timeout', () => {
      const spy = vi.spyOn(page.window, 'addEventListener');
      SimpleToast('a');
      expect(spy).not.toHaveBeenCalled();
    });

    it('are registered once however many timed toasts exist', () => {
      const spy = vi.spyOn(page.window, 'addEventListener');
      SimpleToast({ text: 'a', timeout: 1000 });
      const first = spy.mock.calls.length;
      expect(first).toBeGreaterThan(0);
      SimpleToast({ text: 'b', timeout: 1000 });
      SimpleToast({ text: 'c', timeout: 1000 });
      expect(spy.mock.calls.length).toBe(first);
    });
  });
});
