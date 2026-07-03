# @ham2k/h2k-native-text-input

A New-Architecture (Fabric) native text input for Ham2K PoLo. It moves the
performance-sensitive / fragile parts of the old JS `H2kTextInput` into native
code, exposing a small set of primitives so the JS side stays simple.

## Features

- **`uppercase`** — enforced natively (input filter + caps keycaps where the OS allows).
- **`onSpacePressed` / `onTabPressed` / `onSubmitPressed`** — real key events, no
  text-diffing. Tab is caught from both soft and hardware (BT/iPad) keyboards.
- **`onValueFormatting(textWithCursor)`** — a JS callback that may rewrite the value
  while preserving the caret. The caret is marked **in-band** by a sentinel char
  (`U+0001`); see [Cursor sentinel](#cursor-sentinel).
- **`insertAtCursor(text)`** — imperative command to insert at the caret (virtual
  number keys).
- **Keyboard control** via `keyboardProfile` (`default` | `code` | `dumb` |
  `numbers` | `email`), `keyboardAppearance`, and `smartKeyboard`.

## Cursor sentinel

`CURSOR = String.fromCharCode(1)` (U+0001, SOH). It does double duty:

1. **native → JS**: on every change, native inserts the sentinel at the caret in
   the string it sends to `onChangeWithCursor`, so the formatter sees the caret.
2. **JS → native**: the `text` prop sent back may contain the sentinel; native
   strips it and places the caret there atomically with setting the text.

Because the sentinel is a non-printable control char never present in real input,
the formatters in [`src/formatters.js`](src/formatters.js) are plain
`string -> string` functions and the caret is preserved for free. Character-class
filters (`numeric`/`decimal`/`rst`) run through `aroundCursor` so they can't strip
the marker. The JS wrapper strips the sentinel before calling `onChangeText`, so
**upstream app code never sees it**.

## Race guard

`mostRecentEventCount` mirrors RN's own `TextInput`: native increments a counter
per emitted change; JS echoes it back on the `text` prop; native ignores any
`text` whose count is stale. This is what keeps fast typing from being clobbered
by the async controlled-value round-trip (the problem the old `lastChangeRef` /
`setTimeout` hacks worked around).

**The guard only works if the count travels with the value it describes.** The
wrapper reconciles the controlled `value` against what native reports every render
(so a native⇄app divergence always self-heals — e.g. an initial value assigned right
after mount, or recovery from any native-side desync). The subtlety is which
`eventCount` it stamps a pushed `value` with, since native drops anything older than
its own counter. The wrapper keeps a short trail of the values it has emitted and:

- if `value` already matches native → nothing to push (and it clears the trail, so a
  later programmatic value that happens to equal an old emit isn't taken for a lag);
- if `value` is a **lagging echo** of a past native change → stamps it with _that
  change's_ count, so if native has since moved on (fast typing, JS thread busy on
  callsign lookups) the guard rejects it instead of reverting the newer character
  (e.g. `W2ASD` snapping back to `W2AS`);
- if `value` is a **genuinely new** value → stamps the latest count so native takes it.

Do **not** "simplify" this to always stamping `state.eventCount`: that stamps a
lagging echo with the freshest count, which native can't reject → the revert bug.
And do **not** gate reconciliation on `value` changing alone (e.g. an effect keyed on
`[value]`): that loses the self-heal, so any moment native's counter runs ahead (an
attach-time `setTextIsSelectable`, a recycle, …) strands the field on stale text.

## View recycling ⚠️

Fabric keeps a **pool of native views** and hands a recycled `H2kNativeTextInput`
to a _different_ field after the original unmounts. Per-view native state that is
not reset on recycle **leaks into the next field** — the classic symptom is a value
typed in one field (e.g. POTA logging controls) reappearing later in an unrelated
one (self-spotting comments, band filter).

This interacts nastily with the [race guard](#race-guard): the recycled view keeps
its (high) `eventCount`, so the next occupant's fresh `text` update (`eventCount 0`)
is rejected as _stale_ and its old text is never overwritten.

**Contract: anything with per-view native state must be reset when the view is
recycled**, mirroring RN's own `TextInput`:

- iOS — `-prepareForRecycle` in `H2kNativeTextInputComponentView.mm`.
- Android — `H2kNativeTextInputManager.prepareToRecycleView` → `H2kNativeEditText.resetForRecycle()`.

Both reset the text buffer **and** the event counter. They also restore the
**prop-backed state** (`uppercase`, `keyboardProfile`, `smartKeyboard`,
`spaceKeyMode`, `editable`, `placeholder`) to its default: Fabric skips a prop
setter for the next occupant when the incoming value equals the codegen default, so
a prop the new field leaves at default would otherwise retain this view's old value.

> **When you add a new prop to the spec**, decide whether it carries per-view state
> that survives recycle, and if so reset it in both recycle hooks. Props that are
> _always_ written by the chrome (e.g. `color`, `fontSize`) don't need resetting,
> because they never equal the default and so are always reapplied on reuse.

## Layout of this module

```
src/specs/H2kNativeTextInputNativeComponent.ts  Codegen spec (props/events/commands)
src/H2kNativeTextInput.jsx                       JS wrapper (controlled value + ref methods)
src/formatters.js                                  Cursor-preserving formatter helpers
android/.../H2kNativeEditText.kt                 EditText (InputConnection, keyboard, caret)
android/.../H2kNativeTextInputManager.kt         Fabric ViewManager
android/.../Events.kt                              Event payloads
android/.../H2kNativeTextInputPackage.kt         ReactPackage (autolinked)
ios/H2kNativeTextInputComponentView.{h,mm}       Fabric component view
```

## Build steps after pulling this in

This is a `file:` dependency of the app, so it is autolinked. To pick it up:

```sh
npm install                       # links the module into node_modules
cd ios && pod install && cd ..    # generates the iOS codegen + links the pod
# Android: a normal gradle build runs codegen for the library
```

The generated codegen artifacts referenced by the native code
(`H2kNativeTextInputManagerInterface` / `...Delegate` on Android, the
`react/renderer/components/H2kNativeTextInputSpec/*` headers and
`RCTH2kNativeTextInputViewProtocol` on iOS) are produced at build time from the
spec — they will not exist until the first build.

> **iOS keyboard caveat:** iOS cannot add a number row to the alphabetic keyboard
> (OS limitation), so `keyboardProfile="numbers"` maps to
> `numbers-and-punctuation`. The in-app `NumberKeys` row remains the cross-platform
> answer and is driven by `insertAtCursor`.

## Status

Scaffold. The contract (spec, wrapper, formatters) is complete; the native
skeletons implement the full flow but have **not been built yet** — event-name
registration and a few version-sensitive codegen touch-points may need adjustment
on the first `pod install` / gradle build.
