import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const read = (name) => fs.readFileSync(path.join(dist, name), 'utf8');
const files = ['simpletoast.d.ts', 'simpletoast.core.d.ts', 'simpletoast.timers.d.ts'];

function problems(source) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'simpletoast-types-'));
  try {
    files.forEach((name) => fs.copyFileSync(path.join(dist, name), path.join(dir, name)));
    const consumer = path.join(dir, 'consumer.ts');
    fs.writeFileSync(consumer, source);
    const program = ts.createProgram([consumer], {
      noEmit: true,
      strict: true,
      skipLibCheck: false,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    });
    return ts.getPreEmitDiagnostics(program).map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('generated type definitions', { timeout: 60000 }, () => {
  describe('files', () => {
    it.each(files)('%s does not import anything', (name) => {
      expect(read(name)).not.toMatch(/from\s+['"]\./);
      expect(read(name)).not.toMatch(/^\s*import\s/m);
    });

    it('only the timers file augments another module', () => {
      expect(read('simpletoast.d.ts')).not.toContain('declare module');
      expect(read('simpletoast.core.d.ts')).not.toContain('declare module');
      expect(read('simpletoast.timers.d.ts').match(/declare module/g)).toHaveLength(1);
      expect(read('simpletoast.timers.d.ts')).toContain("declare module './simpletoast.core'");
    });

    it('the timers file is a module, so the augmentation is allowed', () => {
      expect(read('simpletoast.timers.d.ts').trim().endsWith('export {};')).toBe(true);
    });
  });

  describe('simpletoast.d.ts', () => {
    it('has the timer options, the global, and the events', () => {
      expect(problems(`
        import type { SimpleToastOptions, SimpleToastStatic } from './simpletoast';

        export const options: SimpleToastOptions = { text: 'hi', timeout: 5000, pauseOnHover: false, idle: false, dismissOnClick: false };
        declare const toast: SimpleToastStatic;
        toast({ text: 'hi', timeout: 100 }).setFooter('x');
        window.SimpleToast?.({ text: 'global', idle: 10 });
        document.body.addEventListener('simpletoast:add', (event) => {
          const timeout: number | undefined = event.detail.options.timeout;
          event.detail.toast.setTitle(String(timeout));
        });
        document.body.addEventListener('simpletoast:close', (event) => event.detail.reason.toUpperCase());
      `)).toEqual([]);
    });

    it('rejects an option it does not know', () => {
      const found = problems(`
        import type { SimpleToastOptions } from './simpletoast';

        export const typo: SimpleToastOptions = { text: 'x', timeoutt: 5 };
      `);
      expect(found).toHaveLength(1);
      expect(found[0]).toContain("'timeoutt' does not exist");
    });

    it('rejects a timer option of the wrong type', () => {
      const found = problems(`
        import type { SimpleToastOptions } from './simpletoast';

        export const wrong: SimpleToastOptions = { text: 'x', idle: 'never' };
      `);
      expect(found).toHaveLength(1);
    });
  });

  describe('simpletoast.core.d.ts', () => {
    it('has everything except the timer options', () => {
      expect(problems(`
        import type { SimpleToastOptions, SimpleToastStatic } from './simpletoast.core';

        export const options: SimpleToastOptions = { text: 'hi', dismissOnClick: false, role: 'alert' };
        declare const toast: SimpleToastStatic;
        toast(options).setText('x');
      `)).toEqual([]);
    });

    it('does not have timeout, pauseOnHover or idle', () => {
      ['timeout: 5000', 'pauseOnHover: true', 'idle: 100'].forEach((field) => {
        const found = problems(`
          import type { SimpleToastOptions } from './simpletoast.core';

          export const options: SimpleToastOptions = { text: 'hi', ${field} };
        `);
        expect(found).toHaveLength(1);
        expect(found[0]).toContain('does not exist');
      });
    });
  });

  describe('simpletoast.core.d.ts with simpletoast.timers.d.ts', () => {
    it('has the timer options, in options and in events', () => {
      expect(problems(`
        import type { SimpleToastOptions, SimpleToastStatic } from './simpletoast.core';
        import './simpletoast.timers';

        export const options: SimpleToastOptions = { text: 'hi', timeout: 5000, pauseOnHover: false, idle: false };
        declare const toast: SimpleToastStatic;
        toast({ text: 'x', timeout: 1 }).close('why');
        document.body.addEventListener('simpletoast:add', (event) => event.detail.options.timeout);
      `)).toEqual([]);
    });

    it('still rejects what it does not know', () => {
      const found = problems(`
        import type { SimpleToastOptions } from './simpletoast.core';
        import './simpletoast.timers';

        export const typo: SimpleToastOptions = { text: 'x', timeoutt: 5 };
      `);
      expect(found).toHaveLength(1);
    });
  });
});
