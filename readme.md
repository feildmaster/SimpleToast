# SimpleToast

Small (but powerful) toast library.

## Builds

| File | Use |
| --- | --- |
| `dist/simpletoast.js` | Batteries included: timeouts, and it injects its stylesheet on first load. |
| `dist/simpletoast.core.js` | Toasts only, with no timeouts and no stylesheet. Load `dist/simpletoast.css` yourself, or write your own. |
| `dist/simpletoast.css` | The default styles as a plain file. |
| `dist/simpletoast.d.ts` | Type definitions for `simpletoast.js`. |
| `dist/simpletoast.core.d.ts` | Type definitions for `simpletoast.core.js` (no `timeout`, `pauseOnHover` or `idle`). |

`npm run build` regenerates all of them from `src/`.

## Usage

```javascript
SimpleToast('Text');
SimpleToast({ text: 'Text' });
SimpleToast({ title: 'Title', text: 'Text' });
SimpleToast({ title: 'Title only' });
```

### Styling

SimpleToast never sets inline styles. Style toasts with the classes below, or set the custom properties on
`.simpletoast-root` / `.simpletoast`: `--simpletoast-bg`, `--simpletoast-color`, `--simpletoast-font`,
`--simpletoast-shadow`, `--simpletoast-max-width`, `--simpletoast-gap`, `--simpletoast-bottom`, `--simpletoast-right`,
`--simpletoast-z-index`, `--simpletoast-button-bg`, `--simpletoast-button-bg-hover`.

| Class | Element |
| --- | --- |
| `#AlertToast`, `.simpletoast-root` | The shared stack all toasts are added to |
| `.simpletoast` | A toast |
| `.simpletoast-static` | Added to a toast with `dismissOnClick: false` |
| `.simpletoast-title` | Title (hidden when empty) |
| `.simpletoast-body` | Text |
| `.simpletoast-footer` | Footer (hidden when empty) |
| `.simpletoast-button` | Buttons |

Use `className` to add your own classes, and `toast.element` to reach the element directly.

### Buttons

Buttons do not dismiss the toast. Call `toast.close()` from the handler to close it.

```javascript
SimpleToast({
    text: 'Text',
    buttons: [
        { text: 'Undo', onclick(event, toast) { toast.close('undo'); } },
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
        onclick(event, toast) {
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
toast.exists(); // Is the toast still on the page?
toast.close(reason); // Close toast for optional reason

toast.element.addEventListener('simpletoast:close', (event) => event.detail.reason);

SimpleToast.version; // Version in number form
SimpleToast.versionString; // Readable string of version
SimpleToast.count(); // Number of toasts open
```

Close reasons: `'timeout'`, `'dismissed'` (click, Enter, Space or Escape on the toast; Escape still works with `dismissOnClick: false`), `'aborted'`, or whatever was passed to
`close()` (`'unknown'` by default).

Timeouts only run while the tab is visible and focused, and while the user is not idle.

Timeouts are a feature of `simpletoast.js`. The core build ignores `timeout`, `pauseOnHover` and `idle` without any warning.

### Events

`#AlertToast` receives `simpletoast:add` and `simpletoast:close`. `event.detail.toast` is the handle. `simpletoast:add`
also has `event.detail.options`, the options the toast was created with, and `simpletoast:close` has `event.detail.reason`.
Features such as timeouts are built on these events.

The toast's own element receives the same `simpletoast:close` event with the same detail. It does not bubble, so a
listener on the root hears each close once.

### Accessibility

The root is a polite live region and each toast has `role="status"`. Toasts are focusable and are not given focus
automatically. Content is HTML by default, so images need `alt` text, and the title is announced as part of the toast.

### Notes

* Only the top frame gets SimpleToast; nothing is defined in iframes.
* The `css` option from 2.x is gone. Use classes, custom properties or `toast.element`.
