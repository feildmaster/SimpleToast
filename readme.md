# SimpleToast

Small (but powerful) toast library.

## Usage

Text (required):

```javascript
    SimpleToast('Text');
    SimpleToast({text: 'Text'});
```

Title with text:

```javascript
    SimpleToast({title: 'Title', text: 'Text'});
```

### CSS

Targets:

* css (or) css.toast: Applies to toast
* css.title: Applies to title
* css.button: Applies to buttons

```javascript
    // Apply a red-ish background
    SimpleToast({text: 'Text', css: {background: '#c8354e'}});

    SimpleToast({
        css: {
            // Applies to toast (unless toast is present)
            toast: {
                // Applies to toast
            },
            title: {
                // Applies to title
            },
            button: {
                // Applies to buttons
                mouseOver: {
                    // Applies to buttons when moused over
                }
            },
        },
    });
```

### Buttons

You can provide a single button within an object, or an array of buttons.

```javascript
    // Single button
    SimpleToast({
        buttons: {
            text: 'Text', // Required
            onclick: () => {
                // Runs on click
            },
            css: {
                // Applies to button
                mouseOver: {
                    // Applies to button when moused over
                },
            },
        },
    });
    // Multiple Buttons
    SimpleToast({
        buttons: [
            {
                // Button data goes here
            },
            {
                // Button data goes here
            },
        ],
    });
```

### All Options
```javascript
const toast = new SimpleToast({
    title: '',
    text: '',
    buttons: [...button] || {
        text: '',
        className: '',
        css: {},
        onclick() {
            // this; // toast reference
        },
    },
    footer: '',
    className: '',
    css: {
        toast: {},
        title: {},
        button: {},
    },
    timeout: 0, // Close toast after # milliseconds
    onClose(reason, toast) {},
});

// Methods on toast
toast.setText(newText); // Change text to newText
toast.exists(); // Does toast still exist?
toast.close(reason); // Close toast for optional reason

SimpleToast.version; // Version in number form
SimpleToast.versionString; // Readable string of version
SimpleToast.count(); // Number of toasts open
```
