# SimpleToast

Small (but powerful) toast library.

## Builds

| File | Use |
| --- | --- |
| `dist/simpletoast.js` | Batteries included: timeouts, and it injects its stylesheet on first load. |
| `dist/simpletoast.core.js` | Toasts only, with no timeouts and no stylesheet. Load `dist/simpletoast.css` yourself, or write your own. |
| `dist/simpletoast.timers.js` | Add-on that gives `simpletoast.core.js` timeouts. Load it before or after core. |
| `dist/simpletoast.css` | The default styles as a plain file. |
| `dist/simpletoast.d.ts` | Type definitions for `simpletoast.js`. |
| `dist/simpletoast.core.d.ts` | Type definitions for `simpletoast.core.js` (no `timeout`, `pauseOnHover` or `idle`). |
| `dist/simpletoast.timers.d.ts` | Adds `timeout`, `pauseOnHover` and `idle` to the core types. Import it next to `simpletoast.core.d.ts`. |

The default build injects its stylesheet as a `<style>` element, which a Content Security Policy with a strict `style-src` blocks. On such pages, use `simpletoast.core.js` (plus `simpletoast.timers.js` for timeouts) and load `simpletoast.css` with a `<link rel="stylesheet">` from an origin the policy allows.

`npm run build` regenerates all of them from `src/`.

## Usage

```javascript
SimpleToast('Text');
SimpleToast({ text: 'Text' });
SimpleToast({ title: 'Title', text: 'Text' });
SimpleToast({ title: 'Title only' });
```

### Styling

SimpleToast never sets inline styles. Style toasts with the classes below, or set the custom properties on `.simpletoast-root` / `.simpletoast`:
`--simpletoast-bg`, `--simpletoast-color`, `--simpletoast-font`, `--simpletoast-shadow`, `--simpletoast-max-width`, `--simpletoast-gap`, `--simpletoast-bottom`, `--simpletoast-right`, `--simpletoast-z-index`, `--simpletoast-button-bg`, `--simpletoast-button-bg-hover`.

| Class | Element |
| --- | --- |
| `#AlertToast`, `.simpletoast-root` | The shared stack all toasts are added to |
| `.simpletoast` | A toast |
| `.simpletoast-static` | Added to a toast with `dismissOnClick: false` |
| `.simpletoast-title` | Title (hidden when empty) |
| `.simpletoast-body` | Text |
| `.simpletoast-footer` | Footer (hidden when empty) |
| `.simpletoast-buttons` | Optional container for the buttons, from a [template](#template) |
| `.simpletoast-button` | Buttons |

Use `className` to add your own classes, and `toast.element` to reach the element directly.

### Template

A page can control the toast's structure with a `<template id="simpletoast-template">`. It is looked up for every toast, so it can be added, changed or removed at any time. Without it, the default structure is used.

```html
<template id="simpletoast-template">
  <article class="toast">
    <p class="simpletoast-body"></p>
    <footer class="simpletoast-footer"></footer>
  </article>
</template>
```

* A template with one element uses that element as `toast.element`. A template with several top-level elements has them wrapped in a `<div>`, which becomes `toast.element`:

  ```html
  <template id="simpletoast-template">
    <header class="simpletoast-title"></header>
    <div class="simpletoast-body"></div>
    <footer class="simpletoast-footer"></footer>
  </template>
  ```

* SimpleToast adds its own classes, `role`, `tabindex` and the click and keyboard handling to `toast.element`. A `role` or `tabindex` on a single root element is kept (the `role` option still wins).
* Parts are found inside `toast.element` by class: `.simpletoast-title`, `.simpletoast-body`, `.simpletoast-footer` and the optional `.simpletoast-buttons`. With a single root element they must be inside it, not on it.
* Only the parts the template has are filled in. The template above has no title, so a `title` option shows nowhere. If none of `title`, `text` or `footer` has a part, the toast is not shown and you get a dead handle, the same as an empty call. Each of `setText`, `setTitle` and `setFooter` needs its part in the template and does nothing without it.* Buttons go in a `.simpletoast-buttons` element if the template has one. Otherwise they go before the footer, or at the end of the toast when there is no footer.
* A template with none of the part classes logs a console warning once, since no toast can be shown. A template with no element at all falls back to the default structure without a warning.

### Buttons

Buttons do not dismiss the toast. Call `toast.close()` from the handler to close it.

```javascript
SimpleToast({
    text: 'Text',
    buttons: [
        { text: 'Undo', onClick(event, toast) { toast.close('undo'); } },
        { text: 'Other', className: 'extra' },
    ],
});
```

### All Options

```javascript
const toast = new SimpleToast({
    title: '',
    text: '',
    footer: '',
    buttons: [...button] || {
        text: '',
        className: '',
        onClick(event, toast) {
            // this; // toast reference
        },
    },
    className: '' || [''] || {
        toast: '' || [''],
        button: '' || [''],
    },
    data: { priority: true }, // Becomes data-* attributes on the toast
    html: true, // false renders title, text, footer and button text as plain text
    dismissOnClick: true, // false: clicking the toast (or Enter/Space on it) no longer dismisses it
    role: 'status', // 'alert' for errors
    signal: abortController.signal, // Closes the toast with reason 'aborted'
    timeout: 0, // Close toast after # milliseconds
    pauseOnHover: true, // Timer pauses while the toast is hovered or focused
    idle: 30000, // Timer holds after # milliseconds without input, false to disable
    onClose(reason, toast) {
        // this; // toast reference
    },
});

toast.element; // The toast's DOM element
toast.setText(newText); // Change text to newText ('' clears it)
toast.setTitle(newTitle); // Change the title to newTitle ('' clears it)
toast.setFooter(newFooter); // Change the footer to newFooter ('' clears it)
toast.exists(); // Is the toast still on the page?
toast.close(reason); // Close toast for optional reason

toast.element.addEventListener('simpletoast:close', (event) => event.detail.reason);

SimpleToast.version; // Version in number form
SimpleToast.versionString; // Readable string of version
SimpleToast.count(); // Number of toasts open
```

Close reasons: `'timeout'`, `'dismissed'` (click, Enter, Space or Escape on the toast; Escape still works with `dismissOnClick: false`), `'aborted'`, or whatever was passed to `close()` (`'unknown'` by default).

Timeouts only run while the tab is visible and focused, and while the user is not idle.

Timeouts are a feature of `simpletoast.js` and of the `simpletoast.timers.js` add-on. The core build alone ignores `timeout`, `pauseOnHover` and `idle` without any warning.

### Events

`#AlertToast` receives `simpletoast:add` and `simpletoast:close`. Both bubble, so `document` can listen too. `event.detail.toast` is the handle. `simpletoast:add` also has `event.detail.options`, the options the toast was created with, and `simpletoast:close` has `event.detail.reason`. Features such as timeouts are built on these events (the timers add-on only listens on `document`).

`simpletoast:add` fires once the toast is in the document. A toast shown before `<body>` exists gets its event when the page loads. A toast closed before then never fires `simpletoast:add`.

The toast's own element receives the same `simpletoast:close` event with the same detail. It does not bubble, so a listener on the root hears each close once.

### Accessibility

The root is a polite live region and each toast has `role="status"`. Toasts are focusable and are not given focus automatically. Content is HTML by default, so images need `alt` text, and the title is announced as part of the toast.

### Notes

* Only the top frame gets SimpleToast; nothing is defined in iframes.
* The `css` option from 2.x is gone. Use classes, custom properties or `toast.element`.
* The builds moved to `dist/` in 3.0, and the root `simpletoast.js` from 2.x no longer exists. Load a tagged file instead of one from the default branch, for example `https://raw.githubusercontent.com/feildmaster/SimpleToast/3.0.0/dist/simpletoast.js`.
