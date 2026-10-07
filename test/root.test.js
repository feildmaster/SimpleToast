import { afterEach, describe, expect, it } from 'vitest';
import packageJson from '../package.json' with { type: 'json' };
import { createPage, sources } from './helpers.js';

describe('root and publishing', () => {
  let page;
  afterEach(() => page?.close());

  describe('the root', () => {
    it('is created empty on load as a polite live region', () => {
      page = createPage();
      page.load();
      const root = page.root();
      expect(root.childElementCount).toBe(0);
      expect(root.classList.contains('simpletoast-root')).toBe(true);
      expect(root.getAttribute('aria-live')).toBe('polite');
      expect(root.getAttribute('aria-relevant')).toBe('additions');
      expect(root.hasAttribute('style')).toBe(false);
    });

    it('adopts an existing root and keeps its attributes', () => {
      page = createPage('<!doctype html><body><div id="AlertToast" aria-live="assertive"></div></body>');
      const existing = page.root();
      const SimpleToast = page.load();
      expect(page.root()).toBe(existing);
      expect(existing.getAttribute('aria-live')).toBe('assertive');
      expect(existing.getAttribute('aria-relevant')).toBe('additions');
      expect(existing.classList.contains('simpletoast-root')).toBe(true);
      expect(SimpleToast('a').element.parentElement).toBe(existing);
    });

    it('is shared between two copies of the same version', () => {
      page = createPage();
      page.load(sources.injecting, { sandbox: true });
      const first = page.window.SimpleToast;
      page.load(sources.injecting, { sandbox: true });
      expect(page.document.querySelectorAll('#AlertToast').length).toBe(1);
      expect(first('a').element.parentElement).toBe(page.root());
    });

    it('waits for the body, then moves toasts into a root another script made meanwhile', () => {
      page = createPage();
      page.document.body.remove();
      const SimpleToast = page.load();
      const early = SimpleToast('early');
      expect(early.exists()).toBe(true);
      expect(page.root()).toBe(null);

      const body = page.document.createElement('body');
      page.document.documentElement.appendChild(body);
      const other = page.document.createElement('div');
      other.id = 'AlertToast';
      body.appendChild(other);
      page.document.dispatchEvent(new page.window.Event('DOMContentLoaded'));

      expect(page.root()).toBe(other);
      expect(other.contains(early.element)).toBe(true);
      expect(early.exists()).toBe(true);
      expect(SimpleToast('later').element.parentElement).toBe(other);
    });

    it('keeps timers working for toasts before and after the root is swapped', () => {
      page = createPage();
      page.document.body.remove();
      const SimpleToast = page.load();
      const early = SimpleToast({ text: 'early', timeout: 100, idle: false });

      const body = page.document.createElement('body');
      page.document.documentElement.appendChild(body);
      const other = page.document.createElement('div');
      other.id = 'AlertToast';
      body.appendChild(other);
      page.document.dispatchEvent(new page.window.Event('DOMContentLoaded'));

      const late = SimpleToast({ text: 'late', timeout: 200, idle: false });
      page.clock.tick(100);
      expect(early.exists()).toBe(false);
      expect(late.exists()).toBe(true);
      page.clock.tick(100);
      expect(late.exists()).toBe(false);
    });

    it('attaches its own root to the body once it exists', () => {
      page = createPage();
      page.document.body.remove();
      const SimpleToast = page.load();
      const early = SimpleToast('early');
      page.document.documentElement.appendChild(page.document.createElement('body'));
      page.document.dispatchEvent(new page.window.Event('DOMContentLoaded'));
      expect(page.root().parentElement).toBe(page.document.body);
      expect(early.exists()).toBe(true);
      early.close();
      expect(early.exists()).toBe(false);
    });

    it('puts its root back when it was removed after load', () => {
      page = createPage();
      const SimpleToast = page.load();
      page.root().remove();
      const toast = SimpleToast({ text: 'x', timeout: 100, idle: false });
      expect(page.root().contains(toast.element)).toBe(true);
      page.clock.tick(100);
      expect(toast.exists()).toBe(false);
    });

    it('adopts a root the page put back after load', () => {
      page = createPage();
      const SimpleToast = page.load();
      page.root().remove();
      const other = page.document.createElement('div');
      other.id = 'AlertToast';
      page.document.body.appendChild(other);
      const toast = SimpleToast({ text: 'x', timeout: 100, idle: false });
      expect(other.contains(toast.element)).toBe(true);
      expect(page.document.querySelectorAll('#AlertToast').length).toBe(1);
      page.clock.tick(100);
      expect(toast.exists()).toBe(false);
    });

    it('starts the timeout of a toast made while the root was detached once the page puts it back', async () => {
      page = createPage();
      const SimpleToast = page.load();
      const root = page.root();
      root.remove();
      page.document.body.remove();
      const toast = SimpleToast({ text: 'x', timeout: 100, idle: false });
      page.clock.tick(500);
      expect(toast.exists()).toBe(true);

      const body = page.document.createElement('body');
      page.document.documentElement.appendChild(body);
      body.appendChild(root);
      await Promise.resolve();
      await Promise.resolve();
      page.clock.tick(100);
      expect(toast.exists()).toBe(false);
    });

    it('does nothing in a frame', () => {
      page = createPage('<!doctype html><body><iframe></iframe></body>');
      const frame = page.document.querySelector('iframe').contentWindow;
      frame.eval(sources.injecting);
      expect(frame.SimpleToast).toBeUndefined();
      expect(frame.document.getElementById('AlertToast')).toBe(null);
    });
  });

  describe('stylesheet', () => {
    const styles = () => page.document.querySelectorAll('style[data-simpletoast-stylesheet]');

    it('is injected once by the default build', () => {
      page = createPage();
      page.load();
      expect(styles().length).toBe(1);
      expect(styles()[0].textContent).toBe(sources.css);
      expect(styles()[0].dataset.version).toBe(packageJson.version);
    });

    it('is injected before the page stylesheets', () => {
      page = createPage();
      const meta = page.document.createElement('meta');
      const pageStyle = page.document.createElement('style');
      page.document.head.append(meta, pageStyle);
      page.load();
      expect(styles()[0].nextElementSibling).toBe(pageStyle);
      expect(styles()[0].previousElementSibling).toBe(meta);
    });

    it('is injected at the end of an otherwise empty head', () => {
      page = createPage();
      const meta = page.document.createElement('meta');
      page.document.head.appendChild(meta);
      page.load();
      expect(page.document.head.lastElementChild).toBe(styles()[0]);
    });

    it('is not injected again by a second copy', () => {
      page = createPage();
      page.load(sources.injecting, { sandbox: true });
      page.load(sources.injecting, { sandbox: true });
      expect(styles().length).toBe(1);
    });

    it('is not injected by the core build', () => {
      page = createPage();
      page.load(sources.core);
      expect(styles().length).toBe(0);
    });

    it('is replaced by a newer version but not by an older one', () => {
      page = createPage();
      const style = page.document.createElement('style');
      style.dataset.simpletoastStylesheet = '';
      style.dataset.version = '2.5';
      style.textContent = 'old';
      page.document.head.appendChild(style);
      page.load();
      expect(styles().length).toBe(1);
      expect(style.textContent).toBe(sources.css);

      style.dataset.version = '9.0';
      style.textContent = 'newer';
      page.load(sources.injecting, { sandbox: true });
      expect(style.textContent).toBe('newer');
    });

    it('ships the same css as simpletoast.css', () => {
      expect(sources.injecting).toContain(JSON.stringify(sources.css));
      expect(sources.core).not.toContain('.simpletoast-root');
      expect(sources.core).not.toMatch(/stylesheet/i);
    });
  });

  describe('publishing', () => {
    it('sets window.SimpleToast when nothing exists', () => {
      page = createPage();
      const SimpleToast = page.load();
      expect(page.window.SimpleToast).toBe(SimpleToast);
      expect(SimpleToast.versionString).toBe(packageJson.version);
    });

    it('lets a sandboxed copy publish to window when it is newer', () => {
      page = createPage();
      page.load(sources.legacy, { sandbox: true });
      expect(page.window.SimpleToast.versionString).toBe('2.0.3');
      page.load(sources.injecting, { sandbox: true });
      expect(page.window.SimpleToast.versionString).toBe(packageJson.version);
    });

    it('keeps the newest copy when an older sandboxed copy loads later', () => {
      page = createPage();
      page.load(sources.injecting, { sandbox: true });
      page.load(sources.legacy, { sandbox: true });
      expect(page.window.SimpleToast.versionString).toBe(packageJson.version);
    });

    it('keeps the newest copy when an unsandboxed copy loads over an older one', () => {
      page = createPage();
      page.load(sources.legacy);
      page.load(sources.injecting);
      expect(page.window.SimpleToast.versionString).toBe(packageJson.version);
    });

    it('does not replace a newer global with an unsandboxed copy of itself', () => {
      page = createPage();
      const first = page.load();
      page.load();
      expect(page.window.SimpleToast).toBe(first);
    });

    it('does not replace a newer global', () => {
      page = createPage();
      page.window.SimpleToast = Object.assign(() => {}, { version: 9000000000, versionString: '9.0' });
      const kept = page.window.SimpleToast;
      page.load();
      expect(page.window.SimpleToast).toBe(kept);
    });

    it('replaces an older global that has no versionString', () => {
      page = createPage();
      page.window.SimpleToast = Object.assign(() => {}, { version: 2000000000 });
      page.load();
      expect(page.window.SimpleToast.versionString).toBe(packageJson.version);
    });

    const [major, minor, patch] = packageJson.version.split('.').map(Number);

    it('takes its version from package.json', () => {
      page = createPage();
      const SimpleToast = page.load();
      expect(SimpleToast.versionString).toBe(packageJson.version);
      expect(SimpleToast.version).toBe(major * 1000000000 + minor * 1000 + patch);
    });

    it.each([
      [`${major - 1}.99.99`, true],
      [`${major}.${minor}.${patch}`, false],
      [`${major}.${minor}.${patch + 1}`, false],
      [`${major}.${minor + 1}`, false],
      [`${Math.max(major + 1, 10)}.0`, false],
    ])('compares against a global at %s (replaced: %s)', (existing, replaced) => {
      page = createPage();
      const other = Object.assign(() => {}, { version: 1, versionString: existing });
      page.window.SimpleToast = other;
      page.load();
      expect(page.window.SimpleToast === other).toBe(!replaced);
    });

    describe('with a two-part global', () => {
      const withVersion = (source, version) => source.replace(`"${packageJson.version}"`, `"${version}"`);

      it.each([
        ['3.0.1', '3.0', true],
        ['3.0.0', '3.0', false],
        ['3.0.1', '3', true],
        ['3.1.0', '3.0', true],
        ['3.0.0', '3.1', false],
      ])('compares %s against a global at %s (replaced: %s)', (version, existing, replaced) => {
        page = createPage();
        const other = Object.assign(() => {}, { version: 1, versionString: existing });
        page.window.SimpleToast = other;
        page.load(withVersion(sources.injecting, version));
        expect(page.window.SimpleToast === other).toBe(!replaced);
      });
    });

    it('is frozen', () => {
      page = createPage();
      expect(Object.isFrozen(page.load())).toBe(true);
    });
  });

  describe('mixed generations', () => {
    it('lets the new version adopt a root built by 2.0.3', () => {
      page = createPage();
      page.load(sources.legacy, { sandbox: true });
      const legacy = page.window.SimpleToast;
      const oldToast = legacy('old');
      const root = page.root();
      expect(root.hasAttribute('style')).toBe(true);

      const SimpleToast = page.load(sources.injecting, { sandbox: true });
      expect(page.root()).toBe(root);
      expect(root.classList.contains('simpletoast-root')).toBe(true);
      expect(root.getAttribute('aria-live')).toBe('polite');

      const newToast = SimpleToast('new');
      expect(newToast.element.parentElement).toBe(root);
      expect(root.children.length).toBe(2);
      newToast.close();
      oldToast.close();
      expect(root.children.length).toBe(0);
    });

    it('lets 2.0.3 adopt a root built by the new version', () => {
      page = createPage();
      const SimpleToast = page.load(sources.injecting, { sandbox: true });
      const newToast = SimpleToast('new');
      const root = page.root();

      page.load(sources.legacy, { sandbox: true });
      const oldToast = page.window.SimpleToast === SimpleToast ? null : page.window.SimpleToast('old');
      expect(oldToast).toBe(null);
      expect(page.document.querySelectorAll('#AlertToast').length).toBe(1);
      expect(root.contains(newToast.element)).toBe(true);
    });

    it('lets a 2.0.3 toast close even after the new version loaded', () => {
      page = createPage();
      page.load(sources.legacy);
      const legacy = page.window.SimpleToast;
      const oldToast = legacy('old');
      page.load(sources.injecting, { sandbox: true });
      oldToast.close();
      expect(oldToast.exists()).toBe(false);
      expect(page.root().children.length).toBe(0);
    });
  });
});
