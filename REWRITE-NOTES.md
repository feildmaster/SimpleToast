# SimpleToast rewrite notes

Findings from reading `simpletoast.js` (v2.0.3), the UnderScript code that uses it, and the toast module in the Editor
(`Editor/public/resources/modules/toast/index.js` + `styles/toast.css`). Goal: make SimpleToast work closer to how toasts
work in the Editor, without breaking the scripts that already depend on it.

## Decisions so far

- **No inline styling in the library's defaults.** All default looks come from a stylesheet (injected by the default build,
  or loaded by hand with the core build, see "Distribution variants"). The author dislikes the inline style objects.
- **Expose the raw element.** Callers can get the toast's DOM element and do what they want with it (add classes, listeners,
  restyle, find the buttons), instead of everything having to go through options.

### Designing the raw element

Sketch, nothing decided beyond the two points above:

- **Handle keeps its shape and gains `element`.** `{ element, exists, setText, close }`, still a plain object so existing
  code that attaches fields to it keeps working (`toast.cards`, `toast.time` in UnderScript). Likely extras:
  `buttons` (the `<button>` elements) and `root`.
- **`exists()` becomes `element.isConnected`.** Today it checks an internal `Map`, which goes stale if a caller removes the
  element themselves. With the element exposed, that is no longer a corner case.
- **Native events instead of a custom emitter.** Dispatch a `CustomEvent('simpletoast:close', { detail: { toast, reason } })`
  on the element (prefixed so it can be typed in `HTMLElementEventMap` without touching every element), so
  `toast.element.addEventListener('simpletoast:close', ...)` works. This gets the Editor-style close event with no emitter code,
  and `onClose(reason, toast)` stays as the compatibility path.
- **Alternative: the element is the handle.** Return the element itself with `exists` / `setText` / `close` attached. It is
  an `EventTarget` already (native events, `isConnected`), and expando fields still work. The cost is that the handle is
  no longer a plain object, and method names could clash with DOM members. Leaning towards the first option because it keeps
  the contract unchanged.
- **Creation is synchronous**, so a caller can change the element straight after the call and before the first paint.
  A `mount: false` style option is only needed if toasts should ever be built without being shown.
- **Decided: the element goes on the handle** (`toast.element`).
- **Old scripts mostly keep their own copy.** Scripts that `@require` or bundle a pinned SimpleToast version run that
  version, so a rewrite does not change them. That includes UnderScript until its `@require` is bumped. See "Mixed
  generations" under "What must not break" for the two ways copies still affect each other.
- **Decided: UnderScript converts `css` itself.** The wrapper in `UnderScript/src/utils/2.toasts.js` accepts the legacy
  `css` option (flat or sectioned) from its own callers and plugin authors, and applies it to the element the new
  SimpleToast returns. SimpleToast core can then drop `css` entirely and never touch inline styles. UnderScript's own
  default look moves into its stylesheet as classes.
  - What the adapter needs from the new handle: the root `element` plus a way to reach the parts (title, body, footer,
    buttons). Either expose them on the handle (`parts` / `buttons`) or document stable selectors for them.
  - `button.mouseOver` cannot be expressed inline. The adapter has to generate a scoped rule (a per-toast class plus one
    `<style>` element) or add `mouseenter` / `mouseleave` listeners.
  - Still uncovered: scripts that call the global `SimpleToast` directly without bundling their own copy. They get whichever
    copy is published (see "Mixed generations"), so once UnderScript bumps its `@require` to the rewrite, those lose `css`.
    The author considers this acceptable because most scripts pin their own copy.
- **The `css` option needs a decision.** (Superseded by the point above for UnderScript; kept for the other consumers.) Existing callers depend on it (UnderScript's defaults in `src/utils/2.toasts.js`
  set `background-color`, `font-family`, footer alignment; `winstreak.js` sets colours). Options: keep it as an explicit
  per-toast override (still inline, but only what the caller passed), accept CSS custom properties (`--toast-bg`) through it,
  or deprecate it and have UnderScript move those styles into its own stylesheet using classes. The library itself would
  never add inline styles of its own.

### 3.0 design decisions (this round)

- **Branch, not master.** The 3.0 work happens on a branch (e.g. `next`) so master stays releasable for 2.x patches.
  2.0.4 shipped the two safe fixes (`setText('')` now clears, `close()` no longer needs the root). Title-only toasts
  stay unsupported in v2 on purpose.
- **Buttons do not dismiss the toast.** Only a click on the toast itself, or `close()`, dismisses. A button that should
  close the toast calls `toast.close()`. This is a breaking change, which is why it belongs in 3.0.
- **Build: rollup over ES modules (replaced the earlier "tiny Node script, no bundler" plan).** `src/` is split into
  modules (version, root, timers, toast, install, stylesheet). Two entries, `index.js` (imports the CSS and the
  stylesheet module) and `core.js` (does not), so the core build has no injection code at all. `build.mjs` bundles each
  to a single ES chunk and wraps it in `((root) => { ... })(this)`, because publishing needs the userscript sandbox's
  top-level `this`. Output goes to `dist/` and is committed, so raw GitHub tag URLs
  work (`.../3.0.0/dist/simpletoast.js`). **Decided:** no top-level `simpletoast.js` copy in 3.0. Nothing local used it
  (UnderScript pins the 2.0.3 tag URL, which stays valid), and the author believes nobody else loads the library.
- **Sanitising: opt-in text mode.** `title` / `text` / `footer` stay HTML by default (UnderScript depends on markup in
  messages). An opt-in option (for example `html: false`) renders through `textContent` for untrusted strings.
- **Handle: `{ element, exists, setText, close }`.** Still a plain object so callers can attach fields. `exists()` is
  `element.isConnected`. No `buttons` or `parts` on the handle: the title, body, footer and buttons are found with
  `element.querySelector` on documented, stable class names (listed in the readme), which is also how the UnderScript `css`
  adapter reaches them. A native `CustomEvent('simpletoast:close', { detail: { toast, reason } })` is dispatched on the element, and `onClose`
  stays as the compatibility path.
- **`button.mouseOver` in the UnderScript `css` adapter: listeners.** The adapter adds `mouseenter` / `mouseleave` handlers on
  the buttons that apply and restore the inline values (what 2.0.3 does today). No generated stylesheet, and it only
  affects callers that passed `mouseOver`. With this, every design question for 3.0 has an answer.
- **Timeouts are a separate feature, shipped as an add-on.** `src/modules/timers.js` subscribes to `simpletoast:add` (which
  carries `options`) and closes the toast with reason `'timeout'`. It is built three ways: into `simpletoast.js`, and as the
  standalone `simpletoast.timers.js` that works next to `simpletoast.core.js`, in either load order. Chosen over a Tippy-style
  runtime `use(plugin)` API because the plugin would register on one copy while another wins `window.SimpleToast`
  (mixed generations), and it would create a public contract. The add-on only listens on `document`, so it never imports
  anything from core and is independent of which copy made the toast.
  - The root events bubble, and `simpletoast:add` is held until the toast is in the document (a toast shown before
    `<body>` exists fires it at `DOMContentLoaded`, a toast closed before then never fires it). A detached root cannot
    bubble to `document`, and "added" was misleading while `isConnected` was false anyway. This replaced an earlier
    listener list that re-attached to a swapped root.
  - Several copies of the timers (the add-on twice, or the add-on plus the all-in-one build) would both attach, so the
    first marks the element with `data-simpletoast-timed` and the others skip it. A Symbol would not be shared between
    userscript sandboxes.
  - A `simpletoast.timed.js` (core plus timers, no stylesheet) was considered and dropped, since core plus the add-on is the same.
  - Types follow the split: `simpletoast.core.d.ts`, `simpletoast.timers.d.ts` (augments `SimpleToastOptions`), and
    `simpletoast.d.ts` which pulls in both.
- **Timeouts: per-toast, millisecond accurate, presence-aware.** Replaces the shared 1-second tick. `timeout` stays opt-in
  and the close reason stays `'timeout'`.
  - Each toast has its own timer with a tracked remaining time.
  - The timer pauses while the toast is hovered or focused (`pointerenter` / `focusin`, which also covers touch) and
    resumes with the remaining time on leave. `pauseOnHover: false` opts out.
  - The timer runs only while the tab is visible and focused (`visibilitychange`, `blur` / `focus`).
  - Idle detection: passive global listeners (pointer, key, touch) record the last input time, registered once and only
    when the first toast with a timeout appears. If the user has been idle past a threshold, the timer holds until the next
    input. The threshold is configurable (`idle: 30000` by default, `idle: false` to turn it off), because a foreground game
    with no input would look idle.
  - Considered and not chosen for ordinary timeouts: starting the clock at the next page input regardless of idleness, which
    makes active users wait too.
  - Possible later option, separate from `timeout`: `until: 'seen'`. The toast stays until the user interacts with it
    (hover, focus, click) and then closes itself. This suits priority toasts in the toast bar.
- **Accessibility (first pass).**
  - The root `#AlertToast` is a polite live region (`aria-live="polite"`, `aria-relevant="additions"`). A live region only
    announces reliably when it already exists before content is added, so the root is created empty on load, not at the first
    toast. If an old copy created the root, the new version adds the attributes to the adopted root when they are missing.
  - Each toast has `role="status"`. A `role` option overrides it, and `role: 'alert'` (assertive) is meant for errors.
  - Toasts get `tabindex="0"` so a keyboard user can reach them. Focus is never moved to a toast automatically.
  - Keyboard: `Escape` dismisses a focused toast; `Enter` / `Space` on the toast itself (not on a button) also dismisses it,
    matching the click behaviour. Buttons are real `<button>` elements and keep their own keys.
  - The default stylesheet has no required animation, and any transition is wrapped in `prefers-reduced-motion: no-preference`.
  - Content stays HTML, so callers own the markup. The readme should say that images need `alt` text and that the title is
    announced as part of the toast.
- **Top frame only, no iframe support.** Keeps the current behaviour (nothing is defined in iframes). Frames add edge
  cases for little benefit, so this is documented as intentional instead of being treated as a bug.
- **Decided: keep `#AlertToast` as the shared root id, permanently.** The author is locked into it. The id stays the legacy
  lookup key; the new stylesheet targets a class on the root (for example `.simpletoast-root`) so SimpleToast itself does
  not depend on the id. A rename plus a compat layer was rejected: old copies call `root.removeChild(el)` on the element
  they captured, so moving their toasts into a new root would make their `close()` throw, and the shim would need a
  `MutationObserver` plus fake removal to hide that. See the notes below for who depends on the id.

#### Why `#AlertToast` is kept

The id was copied from the author's AlertToast project (turns `alert()` into toasts). What depends on it today:

- UnderScript: `#AlertToast` in `base/styles/toast.css`, `base/underscript/updates.css` and `patchnotes.css`, and
  `$('#AlertToast > div:last')` in `utils/2.toasts.js`.
- Prettycards: `custom_page_base.js` grabs `#AlertToast`, runs `document.write`, then re-appends it, so the id is how it
  carries toasts across the page rewrite.
- Old pinned copies of SimpleToast, and AlertToast itself, find the shared stack only by that id.

If 3.0 uses a different id, an old copy and a new copy on the same page build two separate stacks in the same corner, and
they overlap. The id is what makes mixed generations work (see "Mixed generations").


### Toast bar (future, from the author)

The author once converted `#AlertToast` into a mobile-friendly "toast bar": toasts add to a counter, "priority" toasts show for
a bit and can hide into the bar. It mostly worked but needed the root to be styled, which the inline root style blocks.
Not part of the core. The core should only make it possible:

- The root is styled by the stylesheet only (a class such as `.simpletoast-root`, CSS custom properties for position,
  direction and gap), nothing inline, so a bar can restyle it.
- `element` on the handle, so a bar can move, collapse or restyle individual toasts.
- The core dispatches a `CustomEvent` on the root when a toast is added or closed, with the handle in `detail`, so a bar
  can keep its counter without polling.
- A passthrough for priority, either through `className` or a generic `data` map that becomes `data-` attributes. The core
  does not define what "priority" means.
- Hiding into the bar is a CSS state, not a close, so the core never needs to keep a toast alive off screen.
- The original attempt: `UnderScript/src/base/mobile.ignore/toasts.js` (on the author's D: drive, never shipped). What it did:
  - A bell icon in the footer toggles a `show` class on `#AlertToast`.
  - CSS in mobile mode hides every toast that does not have the `important` class, unless the root has `show`. So the
    priority marker was simply a class passed through `className`, which SimpleToast already supports.
  - A `MutationObserver` on the root's `childList` switched the icon from `notifications_paused` to
    `notifications_active` when a toast was added (ignoring removals). The root add/close events replace this exactly.
  - It had to use `bottom: 30px !important` and `display: flex !important` because the root's inline styles outranked its
    stylesheet. A stylesheet-only root removes the need for `!important`.
  - It was an icon state, not a real counter. A count could come from the same events, or from the handle count the
    library already exposes (`SimpleToast.count()`).

## What actually runs today

- UnderScript loads SimpleToast through `@require` in `UnderScript/src/meta.js`. That was **2.0.0** until the bump to
  **2.0.3** (tag `2.0.3` = commit `1b1019a`, same code analysed here).
- The copy in `UnderScript/package.json` (`github:feildmaster/SimpleToast#2.0.3`) is bundled into `dist/dependencies.js`
  by `src/bundle/bundle.js`. Nothing uses that bundle any more (it existed for the old Electron app), so it can be removed.
- 2.0.0 versus 2.0.3 (`git diff 2.0.0 HEAD`):
  - button hover styling was dead in 2.0.0 (`applyCSS(hoverStyle)` was missing the element argument);
  - button `onclick` was the raw handler in 2.0.0 (event only, `this` = the button), now `(event, toast)` with `this` = toast;
  - 2.0.0 published itself to `window.SimpleToast` even over a newer copy (`instanceof` check), 2.0.3 compares versions;
  - class names accept an array for buttons and the toast through one `getClassName` helper.

## How SimpleToast 2.0.3 works

- A factory returns a frozen callable `SimpleToast(options)` with `.version`, `.versionString` and `.count()`.
  `new SimpleToast(...)` also works, because the function returns an object.
- Top frame only (`if (window !== window.top) return;`, line 6). In iframes nothing is defined.
- Publishing (lines 7-15): always sets `root.SimpleToast`; sets `window.SimpleToast` only when none exists or the existing
  one has a lower numeric `version`. The version number is `major * 1e9 + minor * 1e3 + patch`.
- Shared root element `#AlertToast` (lines 90-118): fixed bottom-right, `flex-direction: column-reverse`. If another script
  created it first, SimpleToast adopts it; if `<body>` is not there yet it waits for `load` and moves its nodes across.
  This is the legacy `alerttoast` contract.
- Options: `title`, `text`, `footer`, `className` (string | string[] | `{ toast, button }`), `css` (flat, or sectioned with
  `toast` / `title` / `footer` / `button`, button also supports `mouseOver`), `buttons` (object | array), `timeout` (ms),
  `onClose(reason, toast)`.
- Returned handle (`safeToast`, copied from the internal toast): `setText`, `exists`, `close(reason)`. It is a plain,
  unfrozen object. UnderScript relies on that and attaches its own fields (`toast.cards`, `toast.owner`, `toast.time` in
  `base/chat/legendary.js` and `winstreak.js`).
- Close reasons: `'timeout'`, `'dismissed'` (click), or the string passed to `close()`; default `'unknown'`.
- All styling is inline styles built from JS objects (`applyCSS`). Object-valued keys are skipped, which is what allows flat
  and sectioned CSS to be mixed in one object (UnderScript does this today).

## Issues found

1. **Clicking anywhere dismisses the toast, buttons included.** The click handler is on the toast element (line 231), so a
   button click bubbles up and closes it with reason `'dismissed'` unless the button handler calls `stopPropagation`.
   UnderScript's `dismiss` class name on buttons is only a styling marker, not what closes the toast.
2. **Title-only toasts are dropped** (`if (!text) return blankToast;`, line 152). The blank handle silently does nothing.
3. **`setText('')` is ignored** (`!newText`, line 180), so text cannot be cleared.
4. **No script at all in iframes**, so `SimpleToast` is undefined there.
5. **Everything goes through `innerHTML`** (title line 168, text 170, footer 174, button text 207). Callers must sanitise,
   and UnderScript depends on markup in messages (for example coloured spans), so this is a deliberate but unguarded contract.
6. **Timeouts have 1 second granularity.** One shared timer ticks every second (lines 121-140), so a timeout can fire up to a
   second late. No pause on hover.
7. **No accessibility.** No `role`, no `aria-live`, not keyboard dismissable, not focusable.
8. **Version number scheme can collide** once a patch reaches 1000 or a minor reaches a million. Unlikely, but the formula is
   not a real semver comparison.
9. **`close()` assumes the toast is still a child of `root`** (`root.removeChild(el)`, line 186). If something else removed or
   replaced `#AlertToast`, it throws.
10. **Every toast is inline-styled in JS**, so a page stylesheet cannot theme them without `!important`, and the nested CSS
    plan for UnderScript cannot reach them.
11. **Unsandboxed copies overwrite `window.SimpleToast` regardless of version** (line 9 versus the guarded publish on lines
    12-15), see "Mixed generations".

## How the Editor's toasts work

- `toast({ body, classes, footer, signal, title })` clones an HTML `<template id="toast">` (`header`, `div`, `footer`) into an
  `<article class="toast">`.
- Styling lives in `styles/toast.css`: `.toast`, `.toast.error`, `header` / `footer` hidden with `:empty`, the container is
  anchored with CSS anchor positioning and scrolls (`overflow-y: auto; max-height: 100%`).
- The returned object is an `EventEmitter` with a `close` event and an `isOpen` getter (`el.isConnected`).
- `signal` (an `AbortSignal`) closes the toast when aborted.
- Click dismisses. There are no buttons and no timeouts.
- Helpers: `error(...)` (adds the `error` class), `tryOrError(callback, message)` and `tryOrErrorSync(...)`.
- Content also goes through `innerHTML`.

## Side by side

| Topic | SimpleToast 2.0.3 | Editor toast |
| --- | --- | --- |
| Styling | inline style objects from JS | stylesheet + classes |
| Structure | elements built by hand | cloned `<template>` |
| Handle | `{ setText, exists, close }` | event emitter (`close`) + `isOpen` |
| Cancellation | none | `AbortSignal` |
| Buttons | yes, with hover styles | none |
| Timeout | yes (1s timer) | none |
| Error variant | `css` by hand | `error()` + `.error` class |
| Empty header/footer | not rendered when empty | hidden with `:empty` |
| Shared across scripts | yes (`window.SimpleToast`, `#AlertToast`) | no |
| Accessibility | none | none |

## What must not break

- `window.SimpleToast(options)` stays callable, including with a plain string, and also through `new`:
  `Plugins/SpamProtect/spam.user.js` (an older, non-plugin script) does `if (window.SimpleToast) { new SimpleToast(text); }`
  with text only, so both the existence check on `window` and the `new` form are used in the wild.
- `#AlertToast` stays the shared root and the adopt-existing-root behaviour stays.
- Newest version wins when several scripts ship a copy.
- Handle compatibility: `exists()`, `setText()`, `close(reason)`, `onClose(reason, toast)`, button `onclick(event, toast)`,
  and the handle staying a plain object other code can attach fields to.
- Mixed flat + sectioned `css`, string / array / `{ toast, button }` class names, and `timeout`.
- UnderScript wraps it in `src/utils/2.toasts.js` (`toast`, `errorToast`, `infoToast`, `dismissable`) and merges its own
  default css; `src/checker.js` and `checkerV2.js` call `window.SimpleToast` directly when UnderScript is missing.

### Mixed generations

Several copies of SimpleToast, of different versions, can be alive on one page. They interact in two places:

1. **The shared `#AlertToast` root.** Whichever copy runs first creates it (with inline styles today) and every other copy
   adopts it (`document.getElementById('AlertToast') || create()`). A new version must work when it adopts a root an old
   copy built, and an old copy must still work when it adopts a root the new version built. Keep the `id`. **Decided:** the root
   has no inline fallback, so position and stacking come from the stylesheet only. A page that uses the core build and forgets
   the CSS gets visibly broken toasts, which is clear enough.
2. **The `window.SimpleToast` global.** Line 9 assigns `root.SimpleToast = localToast` unconditionally. The version check on
   lines 12-15 only guards the *extra* publish to `window` when the script runs in a sandbox (`root !== window`). For a
   script running directly in the page (`root === window`, for example `@grant none`), the last copy to load simply
   overwrites the global, regardless of version. So newest-wins is only true for sandboxed scripts. Worth making consistent.

Consequence for the `css` option: any script that uses the global `SimpleToast` without bundling its own copy gets whichever
copy is published. If a rewrite is published over that global and drops `css`, those scripts lose their styling. The safe
reading would be that the rewrite keeps accepting `css` (applied only when a caller passes it, as inline overrides).
The author's decision instead is to drop it from SimpleToast and convert it inside UnderScript (see "Decisions so far"),
accepting that unpinned scripts using the global lose it, since most scripts pin their own copy.

## Directions for the rewrite

1. **Class-based styling, no inline defaults.** Build elements from a template and ship a stylesheet (with sensible defaults
   and `:empty` hiding). What happens to the `css` option is still open (see "Designing the raw element"). This is also what
   makes nested CSS and theming possible.
2. **Event-emitter handle** with `on('close', reason)`, `isOpen`, while keeping `exists()` / `close()` / `onClose`.
3. **`AbortSignal` option** so owners can tie a toast to a lifecycle.
4. **Fix the small bugs:** keep button clicks from also dismissing (or make that explicit), allow title-only toasts,
   allow clearing text, guard `close()` against a missing root.
5. **Better timeouts:** per-toast timer, optionally paused on hover.
6. **Accessibility:** `role="status"` / `aria-live`, keyboard dismissal.
7. **Ship type definitions** with the library. The options are then typed at the source, and UnderScript's
   `UnderScriptToast` (in `src/base/plugin/toast.api.d.ts`) can wrap or re-export them.
8. **Decide on frames:** either keep top-frame only or explicitly support iframes.
9. **A real version comparison** instead of the numeric formula.
10. **Ship two builds, like Tippy.js** (see below): one that injects the base CSS itself, and a core build plus a standalone
    stylesheet for people who want to load or override the CSS themselves.

## Distribution variants (the Tippy.js model)

Checked by unpacking the published packages. Tippy has kept the same split in every version, only the file names changed:

| Version | Batteries included (injects its CSS) | Core only (no CSS) | Separate stylesheet |
| --- | --- | --- | --- |
| 4.3.5 (what UnderScript loads) | `umd/index.all.js` / `index.all.min.js`, also bundles Popper | `umd/index.js` | `index.css` |
| 5.2.1 | `dist/tippy-bundle.iife.js` | `dist/tippy.iife.js` | `dist/tippy.css` |
| 6.3.7 (latest) | `dist/tippy-bundle.umd.js` | `dist/tippy.umd.js` | `dist/tippy.css` |

So later versions still ship a CSS-injecting bundle. The v6 readme says "the core CSS comes bundled with the default unpkg
import", and for module imports you add `import 'tippy.js/dist/tippy.css'` yourself. The bundled build injects a
`<style data-tippy-stylesheet>` element into `<head>` (`injectCSS` in 4.x).

What this suggests for SimpleToast:

- **`simpletoast.js` (batteries included):** creates the `<template>` / default CSS and injects one
  `<style data-simpletoast-stylesheet>` into `<head>` on first use. This is what `@require` users such as UnderScript get,
  so nothing changes for them.
- **`simpletoast.core.js` (no CSS):** only the behaviour. For pages that ship their own styles, or the nested-CSS setup
  planned for UnderScript.
- **`simpletoast.css`:** the same default styles as a plain file, so they can be loaded by hand or copied and edited.
- Keep it a single source of truth: the CSS lives in one file and the build step inlines it into the injecting build.
- The injected style element should be easy to override (low specificity, CSS custom properties for colours and spacing,
  `data-` attribute so it can be found or removed).
- Only inject once, even when several scripts each ship a copy (same newest-version-wins rule as `window.SimpleToast`).

## Open questions

- Inline default styles: decided against (see "Decisions so far"). Remaining question is only what the `css` option does
  for existing callers.
- Should a button click dismiss the toast by default, or only an explicit close?
- Is sanitising worth adding as an opt-in (for plugin authors), given the existing HTML contract?
- Where does the stylesheet live for a library that is loaded through `@require`? Answered by the Tippy model above:
  the default build injects it, the core build leaves it to the page. Still to decide: file names, and whether the
  inline-style fallback (current behaviour) stays at all once the stylesheet exists.
- How are the two builds produced (a small script in the repo, or a build tool), and which one does `package.json`'s
  `main` / `browser` point at?
