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
