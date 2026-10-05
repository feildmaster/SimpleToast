import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPage } from './helpers.js';

describe('template', () => {
  let page;
  let SimpleToast;

  const setTemplate = (html) => {
    page.document.getElementById('simpletoast-template')?.remove();
    page.document.body.insertAdjacentHTML('beforeend', `<template id="simpletoast-template">${html}</template>`);
  };

  beforeEach(() => {
    page = createPage();
    SimpleToast = page.load();
  });
  afterEach(() => page.close());

  describe('without a template', () => {
    it('builds the default structure', () => {
      const { element } = SimpleToast({ title: 'T', text: 'x', footer: 'F' });
      expect(element.tagName).toBe('DIV');
      expect([...element.children].map((child) => child.className)).toEqual([
        'simpletoast-title',
        'simpletoast-body',
        'simpletoast-footer',
      ]);
    });

    it('ignores an element with the id that is not a template', () => {
      page.document.body.insertAdjacentHTML('beforeend', '<div id="simpletoast-template"><b class="simpletoast-body"></b></div>');
      expect(SimpleToast('x').element.tagName).toBe('DIV');
    });

    it('ignores an empty template', () => {
      setTemplate('');
      expect(SimpleToast('x').element.tagName).toBe('DIV');
    });
  });

  describe('with a template', () => {
    beforeEach(() => {
      setTemplate(`
        <article class="card">
          <header class="simpletoast-title"></header>
          <p class="simpletoast-body"></p>
          <footer class="simpletoast-footer"></footer>
        </article>
      `);
    });

    it('uses the template root as the toast element', () => {
      const toast = SimpleToast({ title: 'T', text: 'x', footer: 'F' });
      expect(toast.element.tagName).toBe('ARTICLE');
      expect(toast.element.parentElement).toBe(page.root());
      expect(toast.exists()).toBe(true);
    });

    it('fills the parts it finds by class', () => {
      const { element } = SimpleToast({ title: 'T', text: 'x', footer: 'F' });
      expect(element.querySelector('.simpletoast-title').textContent).toBe('T');
      expect(element.querySelector('.simpletoast-body').textContent).toBe('x');
      expect(element.querySelector('.simpletoast-footer').textContent).toBe('F');
    });

    it('keeps the template classes and adds the library ones', () => {
      const { element } = SimpleToast({ text: 'x', className: 'mine' });
      expect(element.className).toBe('card simpletoast mine');
    });

    it('gives each toast its own copy', () => {
      const a = SimpleToast('a');
      const b = SimpleToast('b');
      expect(a.element).not.toBe(b.element);
      expect(a.element.textContent).toContain('a');
      expect(b.element.textContent).toContain('b');
      expect(page.document.getElementById('simpletoast-template').content.querySelector('.simpletoast-body').textContent).toBe('');
    });

    it('is looked up for every toast, so it can change or go away', () => {
      expect(SimpleToast('x').element.tagName).toBe('ARTICLE');
      setTemplate('<section><i class="simpletoast-body"></i></section>');
      expect(SimpleToast('x').element.tagName).toBe('SECTION');
      page.document.getElementById('simpletoast-template').remove();
      expect(SimpleToast('x').element.tagName).toBe('DIV');
    });

    it('uses the first element when there are several', () => {
      setTemplate('<aside><i class="simpletoast-body"></i></aside><article class="other"></article>');
      expect(SimpleToast('x').element.tagName).toBe('ASIDE');
    });

    it('keeps the other markup the template has', () => {
      setTemplate('<article><i class="icon"></i><span class="simpletoast-body"></span></article>');
      expect(SimpleToast('x').element.querySelector('.icon')).not.toBe(null);
    });

    it('applies the usual attributes and behaviour', () => {
      const onClose = vi.fn();
      const toast = SimpleToast({ text: 'x', onClose, data: { kind: 'info' } });
      expect(toast.element.getAttribute('role')).toBe('status');
      expect(toast.element.tabIndex).toBe(0);
      expect(toast.element.dataset.kind).toBe('info');
      toast.element.click();
      expect(toast.exists()).toBe(false);
      expect(onClose).toHaveBeenCalledWith('dismissed', toast);
    });

    it('keeps a role and tabindex the template sets, unless an option overrides the role', () => {
      setTemplate('<article role="alert" tabindex="-1"><span class="simpletoast-body"></span></article>');
      const kept = SimpleToast('x');
      expect(kept.element.getAttribute('role')).toBe('alert');
      expect(kept.element.getAttribute('tabindex')).toBe('-1');
      expect(SimpleToast({ text: 'x', role: 'log' }).element.getAttribute('role')).toBe('log');
    });

    it('renders as text when html is false', () => {
      const { element } = SimpleToast({ title: '<i>t</i>', text: '<b>x</b>', html: false });
      expect(element.querySelector('b, i')).toBe(null);
      expect(element.querySelector('.simpletoast-body').textContent).toBe('<b>x</b>');
    });

    it('lets setText change the body', () => {
      const toast = SimpleToast('a');
      toast.setText('b');
      expect(toast.element.querySelector('.simpletoast-body').textContent).toBe('b');
    });

    it('works with the timers', () => {
      const toast = SimpleToast({ text: 'x', timeout: 100, idle: false });
      page.clock.tick(100);
      expect(toast.exists()).toBe(false);
    });
  });

  describe('without a title part', () => {
    beforeEach(() => {
      setTemplate('<article><p class="simpletoast-body"></p><footer class="simpletoast-footer"></footer></article>');
    });

    it('drops the title and shows the rest', () => {
      const { element } = SimpleToast({ title: 'Never shown', text: 'x', footer: 'F' });
      expect(element.textContent).not.toContain('Never shown');
      expect(element.querySelector('.simpletoast-body').textContent).toBe('x');
      expect(element.querySelector('.simpletoast-footer').textContent).toBe('F');
    });

    it('is a dead toast when only a title was given', () => {
      const toast = SimpleToast({ title: 'Only a title' });
      expect(toast.exists()).toBe(false);
      expect(SimpleToast.count()).toBe(0);
      expect(page.root().children.length).toBe(0);
    });
  });

  describe('without a body part', () => {
    beforeEach(() => {
      setTemplate('<article><header class="simpletoast-title"></header></article>');
    });

    it('shows the title and ignores the text', () => {
      const { element } = SimpleToast({ title: 'T', text: 'ignored' });
      expect(element.textContent).toBe('T');
    });

    it('lets setText do nothing', () => {
      const toast = SimpleToast({ title: 'T' });
      expect(() => toast.setText('x')).not.toThrow();
      expect(toast.element.textContent).toBe('T');
    });
  });

  describe('buttons', () => {
    it('go before the footer', () => {
      setTemplate('<article><span class="simpletoast-body"></span><footer class="simpletoast-footer"></footer></article>');
      const { element } = SimpleToast({ text: 'x', footer: 'F', buttons: { text: 'b' } });
      expect([...element.children].map((child) => child.tagName)).toEqual(['SPAN', 'BUTTON', 'FOOTER']);
    });

    it('go before a footer that is nested', () => {
      setTemplate('<article><span class="simpletoast-body"></span><div class="meta"><i class="simpletoast-footer"></i></div></article>');
      const { element } = SimpleToast({ text: 'x', footer: 'F', buttons: { text: 'b' } });
      expect([...element.querySelector('.meta').children].map((child) => child.tagName)).toEqual(['BUTTON', 'I']);
    });

    it('go at the end when there is no footer', () => {
      setTemplate('<article><span class="simpletoast-body"></span></article>');
      const { element } = SimpleToast({ text: 'x', buttons: [{ text: 'one' }, { text: 'two' }] });
      expect([...element.children].map((child) => child.tagName)).toEqual(['SPAN', 'BUTTON', 'BUTTON']);
    });

    it('go in the buttons container when there is one', () => {
      setTemplate('<article><span class="simpletoast-body"></span><nav class="simpletoast-buttons"></nav><footer class="simpletoast-footer"></footer></article>');
      const { element } = SimpleToast({ text: 'x', footer: 'F', buttons: [{ text: 'one' }, { text: 'two' }] });
      expect(element.querySelectorAll('.simpletoast-buttons > button').length).toBe(2);
      expect([...element.children].map((child) => child.tagName)).toEqual(['SPAN', 'NAV', 'FOOTER']);
    });

    it('keep their handlers and classes', () => {
      setTemplate('<article><span class="simpletoast-body"></span></article>');
      const onclick = vi.fn();
      const toast = SimpleToast({ text: 'x', className: { button: 'btn' }, buttons: { text: 'b', onclick } });
      const button = toast.element.querySelector('button');
      expect(button.className).toBe('simpletoast-button btn');
      button.click();
      expect(onclick).toHaveBeenCalledOnce();
      expect(toast.exists()).toBe(true);
    });
  });

  describe('warnings', () => {
    let warn;

    beforeEach(() => {
      page.close();
      page = createPage();
      warn = vi.spyOn(page.window.console, 'warn').mockImplementation(() => {});
      SimpleToast = page.load();
    });

    it('stay quiet with no template', () => {
      SimpleToast('x');
      expect(warn).not.toHaveBeenCalled();
    });

    it('stay quiet with a usable template', () => {
      setTemplate('<article><i class="simpletoast-body"></i></article>');
      SimpleToast('x');
      SimpleToast('y');
      expect(warn).not.toHaveBeenCalled();
    });

    it('stay quiet when only some parts are there', () => {
      setTemplate('<article><i class="simpletoast-footer"></i></article>');
      SimpleToast({ footer: 'x' });
      expect(warn).not.toHaveBeenCalled();
    });

    it('name the template and the classes when it has no parts', () => {
      setTemplate('<article class="toast"><p class="text"></p></article>');
      expect(SimpleToast('x').exists()).toBe(false);
      expect(warn).toHaveBeenCalledOnce();
      const message = warn.mock.calls[0][0];
      expect(message).toContain('simpletoast-template');
      expect(message).toContain('.simpletoast-body');
    });

    it('warn once however many toasts are shown', () => {
      setTemplate('<article></article>');
      SimpleToast('a');
      SimpleToast('b');
      SimpleToast('c');
      expect(warn).toHaveBeenCalledOnce();
    });

    it('stay quiet when the template has no element, and fall back to the default', () => {
      setTemplate('just text');
      expect(SimpleToast('x').element.tagName).toBe('DIV');
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('placement', () => {
    it('can live in the head', () => {
      page.document.head.insertAdjacentHTML('beforeend', '<template id="simpletoast-template"><article><i class="simpletoast-body"></i></article></template>');
      expect(SimpleToast('x').element.tagName).toBe('ARTICLE');
    });

    it('needs its parts inside the root, not on it', () => {
      setTemplate('<article class="simpletoast-body"></article>');
      expect(SimpleToast('x').exists()).toBe(false);
    });
  });
});
