import { describe, expectTypeOf, it } from 'vitest';
import type {
  SimpleToastButton,
  SimpleToastHandle,
  SimpleToastOptions,
  SimpleToastStatic,
  SimpleToastCloseReason,
  SimpleToastRole,
} from '../src/types/simpletoast';

declare const SimpleToast: SimpleToastStatic;

describe('types', () => {
  it('accepts a string or options and returns a handle', () => {
    expectTypeOf(SimpleToast('text')).toEqualTypeOf<SimpleToastHandle>();
    expectTypeOf(SimpleToast({ text: 'text' })).toEqualTypeOf<SimpleToastHandle>();
    expectTypeOf(new SimpleToast('text')).toEqualTypeOf<SimpleToastHandle>();
  });

  it('describes the handle', () => {
    expectTypeOf<SimpleToastHandle['element']>().toEqualTypeOf<HTMLElement>();
    expectTypeOf<SimpleToastHandle['exists']>().toEqualTypeOf<() => boolean>();
    expectTypeOf<SimpleToastHandle['setText']>().parameters.toEqualTypeOf<[text: string]>();
    expectTypeOf<SimpleToastHandle['setTitle']>().parameters.toEqualTypeOf<[title: string]>();
    expectTypeOf<SimpleToastHandle['setFooter']>().parameters.toEqualTypeOf<[footer: string]>();
    expectTypeOf<SimpleToastHandle['close']>().parameter(0).toEqualTypeOf<SimpleToastCloseReason | undefined>();
  });

  it('describes the statics', () => {
    expectTypeOf(SimpleToast.version).toBeNumber();
    expectTypeOf(SimpleToast.versionString).toBeString();
    expectTypeOf(SimpleToast.count).toEqualTypeOf<() => number>();
  });

  it('types the options', () => {
    expectTypeOf<SimpleToastOptions['timeout']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<SimpleToastOptions['idle']>().toEqualTypeOf<number | false | undefined>();
    expectTypeOf<SimpleToastOptions['signal']>().toEqualTypeOf<AbortSignal | undefined>();
    expectTypeOf<SimpleToastOptions['html']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<SimpleToastOptions['dismissOnClick']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<SimpleToastOptions['role']>().toEqualTypeOf<SimpleToastRole | undefined>();
    expectTypeOf<'alert'>().toExtend<SimpleToastRole>();
    expectTypeOf<'alertdialog'>().toExtend<SimpleToastRole>();
  });

  it('types button and close callbacks with a handle this', () => {
    expectTypeOf<NonNullable<SimpleToastButton['onClick']>>().parameters.toEqualTypeOf<[MouseEvent, SimpleToastHandle]>();
    expectTypeOf<NonNullable<SimpleToastButton['onClick']>>().thisParameter.toEqualTypeOf<SimpleToastHandle>();
    expectTypeOf<NonNullable<SimpleToastButton['onclick']>>().parameters.toEqualTypeOf<[MouseEvent, SimpleToastHandle]>();
    expectTypeOf<NonNullable<SimpleToastButton['onclick']>>().thisParameter.toEqualTypeOf<SimpleToastHandle>();
    expectTypeOf<NonNullable<SimpleToastOptions['onClose']>>().thisParameter.toEqualTypeOf<SimpleToastHandle>();
  });

  it('types the events', () => {
    const el = document.createElement('div');
    el.addEventListener('simpletoast:add', (event) => {
      expectTypeOf(event.detail.toast).toEqualTypeOf<SimpleToastHandle>();
    });
    el.addEventListener('simpletoast:close', (event) => {
      expectTypeOf(event.detail.reason).toBeString();
    });
    const toast = {} as SimpleToastHandle;
    toast.element.addEventListener('simpletoast:close', (event) => {
      expectTypeOf(event.detail.toast).toEqualTypeOf<SimpleToastHandle>();
      expectTypeOf(event.detail.reason).toBeString();
    });
  });

  it('declares window.SimpleToast', () => {
    expectTypeOf(window.SimpleToast).toEqualTypeOf<SimpleToastStatic | undefined>();
  });
});
