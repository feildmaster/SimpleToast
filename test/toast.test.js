import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPage } from './helpers.js';

describe('toast', () => {
  let page;
  let SimpleToast;

  beforeEach(() => {
    page = createPage();
    SimpleToast = page.load();
  });
  afterEach(() => page.close());

  it('is callable with a string, an object, or through new', () => {
    expect(SimpleToast('a').exists()).toBe(true);
    expect(SimpleToast({ text: 'b' }).exists()).toBe(true);
    expect(new SimpleToast('c').exists()).toBe(true);
    expect(SimpleToast.count()).toBe(3);
  });

  it('renders title, text and footer in the documented classes', () => {
    const { element } = SimpleToast({ title: 'T', text: 'X', footer: 'F' });
    expect(element.classList.contains('simpletoast')).toBe(true);
    expect(element.querySelector('.simpletoast-title').textContent).toBe('T');
    expect(element.querySelector('.simpletoast-body').textContent).toBe('X');
    expect(element.querySelector('.simpletoast-footer').textContent).toBe('F');
    expect(element.parentElement).toBe(page.root());
  });

  it('never sets inline styles', () => {
    const { element } = SimpleToast({ title: 'T', text: 'X', footer: 'F', buttons: { text: 'b' } });
    expect(page.root().hasAttribute('style')).toBe(false);
    expect(element.querySelectorAll('[style]').length).toBe(0);
    expect(element.hasAttribute('style')).toBe(false);
  });

  it('supports title-only and footer-only toasts', () => {
    expect(SimpleToast({ title: 'only' }).exists()).toBe(true);
    expect(SimpleToast({ footer: 'only' }).exists()).toBe(true);
  });

  it('returns a dead handle with an element when there is nothing to show', () => {
    for (const toast of [SimpleToast(), SimpleToast({}), SimpleToast(''), SimpleToast({ text: '' })]) {
      expect(toast.exists()).toBe(false);
      expect(toast.element).toBeInstanceOf(page.window.HTMLElement);
      expect(toast.element.isConnected).toBe(false);
      expect(() => toast.close()).not.toThrow();
    }
    expect(SimpleToast.count()).toBe(0);
  });

  it('adds classes from className in every accepted shape', () => {
    expect(SimpleToast({ text: 'a', className: 'one' }).element.className).toBe('simpletoast one');
    expect(SimpleToast({ text: 'a', className: ['one', 'two'] }).element.className).toBe('simpletoast one two');
    expect(SimpleToast({ text: 'a', className: { toast: 'one', button: 'btn' } }).element.className)
      .toBe('simpletoast one');
    expect(SimpleToast({ text: 'a', className: { button: 'btn' } }).element.className).toBe('simpletoast');
    const toast = SimpleToast({
      text: 'a',
      className: { button: 'btn' },
      buttons: [{ text: 'x' }, { text: 'y', className: ['own'] }],
    });
    const buttons = toast.element.querySelectorAll('button');
    expect(buttons[0].className).toBe('simpletoast-button btn');
    expect(buttons[1].className).toBe('simpletoast-button own');
  });

  it('copies data into data attributes', () => {
    const { element } = SimpleToast({ text: 'a', data: { priority: true, kind: 'info' } });
    expect(element.dataset.priority).toBe('true');
    expect(element.dataset.kind).toBe('info');
  });

  it('renders as text when html is false', () => {
    const toast = SimpleToast({ title: '<i>t</i>', text: '<b>x</b>', footer: '<u>f</u>', html: false, buttons: { text: '<s>b</s>' } });
    expect(toast.element.querySelector('b, i, u, s')).toBe(null);
    expect(toast.element.querySelector('.simpletoast-body').textContent).toBe('<b>x</b>');
    toast.setText('<em>y</em>');
    expect(toast.element.querySelector('em')).toBe(null);
  });

  it('renders markup by default', () => {
    const toast = SimpleToast({ text: '<b>x</b>' });
    expect(toast.element.querySelector('b').textContent).toBe('x');
  });

  it('sets role and accessibility attributes', () => {
    const toast = SimpleToast('a');
    expect(toast.element.getAttribute('role')).toBe('status');
    expect(toast.element.tabIndex).toBe(0);
    expect(SimpleToast({ text: 'e', role: 'alert' }).element.getAttribute('role')).toBe('alert');
  });

  describe('setText', () => {
    it('changes and clears the text', () => {
      const toast = SimpleToast('a');
      toast.setText('b');
      expect(toast.element.querySelector('.simpletoast-body').innerHTML).toBe('b');
      toast.setText('');
      expect(toast.element.querySelector('.simpletoast-body').innerHTML).toBe('');
    });

    it('ignores null and undefined', () => {
      const toast = SimpleToast('a');
      toast.setText(null);
      toast.setText(undefined);
      expect(toast.element.querySelector('.simpletoast-body').innerHTML).toBe('a');
    });

    it('does nothing after close', () => {
      const toast = SimpleToast('a');
      toast.close();
      toast.setText('b');
      expect(toast.element.querySelector('.simpletoast-body').innerHTML).toBe('a');
    });
  });

  describe('closing', () => {
    it('dismisses on click of the toast', () => {
      const onClose = vi.fn();
      const toast = SimpleToast({ text: 'a', onClose });
      toast.element.click();
      expect(toast.exists()).toBe(false);
      expect(onClose).toHaveBeenCalledWith('dismissed', toast);
      expect(onClose.mock.contexts[0]).toBe(toast);
    });

    it('does not dismiss on a button click', () => {
      const onclick = vi.fn();
      const toast = SimpleToast({ text: 'a', buttons: { text: 'b', onclick } });
      toast.element.querySelector('button').click();
      expect(onclick).toHaveBeenCalledOnce();
      expect(toast.exists()).toBe(true);
    });

    it('calls button onclick with the event and the handle, bound to the handle', () => {
      const onclick = vi.fn();
      const toast = SimpleToast({ text: 'a', buttons: [{ text: 'b', onclick }] });
      toast.element.querySelector('button').click();
      const [event, handle] = onclick.mock.calls[0];
      expect(event.type).toBe('click');
      expect(handle).toBe(toast);
      expect(onclick.mock.contexts[0]).toBe(toast);
    });

    it('lets a button close the toast with its own reason', () => {
      const onClose = vi.fn();
      const toast = SimpleToast({
        text: 'a',
        onClose,
        buttons: { text: 'b', onclick() { this.close('undo'); } },
      });
      toast.element.querySelector('button').click();
      expect(toast.exists()).toBe(false);
      expect(onClose.mock.calls[0][0]).toBe('undo');
    });

    it('skips buttons without text', () => {
      const toast = SimpleToast({ text: 'a', buttons: [{ text: '' }, { onclick() {} }, { text: 'ok' }] });
      expect(toast.element.querySelectorAll('button').length).toBe(1);
    });

    it('places buttons before the footer', () => {
      const toast = SimpleToast({ text: 'a', footer: 'f', buttons: { text: 'b' } });
      const children = [...toast.element.children].map((child) => child.tagName);
      expect(children).toEqual(['SPAN', 'SPAN', 'BUTTON', 'SPAN']);
    });

    it('uses unknown as the default reason', () => {
      const onClose = vi.fn();
      SimpleToast({ text: 'a', onClose }).close();
      expect(onClose.mock.calls[0][0]).toBe('unknown');
    });

    it('closes only once', () => {
      const onClose = vi.fn();
      const toast = SimpleToast({ text: 'a', onClose });
      toast.close('x');
      toast.close('y');
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('does not throw when the element was removed by someone else', () => {
      const onClose = vi.fn();
      const toast = SimpleToast({ text: 'a', onClose });
      toast.element.remove();
      expect(toast.exists()).toBe(false);
      expect(() => toast.close('x')).not.toThrow();
      expect(onClose).toHaveBeenCalledWith('x', toast);
    });

    it('dismisses with Escape, from the toast or a button inside it', () => {
      const a = SimpleToast('a');
      a.element.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(a.exists()).toBe(false);
      const b = SimpleToast({ text: 'b', buttons: { text: 'x' } });
      b.element.querySelector('button').dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(b.exists()).toBe(false);
    });

    it('dismisses with Enter and Space on the toast, but not from a button', () => {
      for (const key of ['Enter', ' ']) {
        const toast = SimpleToast('a');
        const event = new page.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        toast.element.dispatchEvent(event);
        expect(toast.exists()).toBe(false);
        expect(event.defaultPrevented).toBe(true);
      }
      const toast = SimpleToast({ text: 'b', buttons: { text: 'x' } });
      toast.element.querySelector('button')
        .dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      expect(toast.exists()).toBe(true);
    });

    it('closes when the signal aborts', () => {
      const controller = new page.window.AbortController();
      const onClose = vi.fn();
      const toast = SimpleToast({ text: 'a', signal: controller.signal, onClose });
      controller.abort();
      expect(toast.exists()).toBe(false);
      expect(onClose.mock.calls[0][0]).toBe('aborted');
    });

    it('does not show a toast whose signal already aborted', () => {
      const controller = new page.window.AbortController();
      controller.abort();
      expect(SimpleToast({ text: 'a', signal: controller.signal }).exists()).toBe(false);
      expect(SimpleToast.count()).toBe(0);
    });
  });

  describe('events', () => {
    it('dispatches simpletoast:close on the element with the handle and reason', () => {
      const toast = SimpleToast('a');
      const listener = vi.fn();
      toast.element.addEventListener('simpletoast:close', listener);
      toast.close('why');
      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].detail).toEqual({ toast, reason: 'why' });
    });

    it('does not bubble the element event, so the root hears each close once', () => {
      const listener = vi.fn();
      page.root().addEventListener('simpletoast:close', listener);
      SimpleToast('a').close();
      expect(listener).toHaveBeenCalledOnce();
    });

    it('dispatches add and close on the root with the handle', () => {
      const add = vi.fn();
      const close = vi.fn();
      page.root().addEventListener('simpletoast:add', add);
      page.root().addEventListener('simpletoast:close', close);
      const toast = SimpleToast('a');
      expect(add.mock.calls[0][0].detail.toast).toBe(toast);
      toast.close('why');
      expect(close.mock.calls[0][0].detail).toEqual({ toast, reason: 'why' });
    });

    it('passes the options the toast was created with in the add event', () => {
      const details = [];
      page.root().addEventListener('simpletoast:add', (event) => details.push(event.detail.options));
      const options = { text: 'a', timeout: 5, custom: 'x' };
      SimpleToast(options);
      SimpleToast('plain');
      expect(details[0]).toBe(options);
      expect(details[1]).toEqual({ text: 'plain' });
    });

    it('has the element in the document when add fires', () => {
      let connected;
      page.root().addEventListener('simpletoast:add', (event) => {
        connected = event.detail.toast.element.isConnected;
      });
      SimpleToast('a');
      expect(connected).toBe(true);
    });

    it('has the element out of the document when close fires', () => {
      let connected;
      page.root().addEventListener('simpletoast:close', (event) => {
        connected = event.detail.toast.element.isConnected;
      });
      SimpleToast('a').close();
      expect(connected).toBe(false);
    });
  });

  describe('handle', () => {
    it('is a plain object other code can extend', () => {
      const toast = SimpleToast('a');
      toast.cards = [1];
      toast.time = 5;
      expect(toast.cards).toEqual([1]);
      expect(Object.isFrozen(toast)).toBe(false);
      expect(Object.getPrototypeOf(toast)).toBe(page.window.Object.prototype);
    });

    it('exposes only element, exists, setText and close', () => {
      expect(Object.keys(SimpleToast('a')).sort()).toEqual(['close', 'element', 'exists', 'setText']);
    });
  });

  describe('count', () => {
    it('tracks open toasts', () => {
      const a = SimpleToast('a');
      SimpleToast('b');
      expect(SimpleToast.count()).toBe(2);
      a.close();
      expect(SimpleToast.count()).toBe(1);
    });

    it('does not count toasts removed behind its back', () => {
      SimpleToast('a').element.remove();
      expect(SimpleToast.count()).toBe(0);
    });
  });
});
