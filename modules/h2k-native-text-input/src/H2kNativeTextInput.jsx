// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { StyleSheet } from 'react-native'

import NativeH2kNativeTextInput, { Commands } from './specs/H2kNativeTextInputNativeComponent'
import { CURSOR, stripCursor } from './formatters'

// Thin wrapper around the native Fabric component. It owns the controlled,
// sentinel-bearing `text` value and bumps `mostRecentEventCount` so stale prop
// updates can never clobber newer native keystrokes (same guard RN's own
// TextInput uses).
//
// Props of note:
//   value             plain string from the app (no sentinel)
//   onChangeText(v)   called with the formatted, sentinel-stripped value
//   onValueFormatting(textWithCursor) => textWithCursor
//                     optional; runs in JS, may move the caret by moving the
//                     sentinel. See ./formatters for composable helpers.
//   onSpace / onTab / onSubmit   key events
//   uppercase, keyboardProfile, keyboardAppearance, smartKeyboard, editable
//   innerRef          the native host node, with insertAtCursor/focus/blur attached
//                     (so it works with both findNodeHandle() and ref.focus()).
export function H2kNativeTextInput (props) {
  const {
    value = '',
    style,
    onChangeText,
    onValueFormatting,
    onSpace,
    onTab,
    onSubmit,
    onFocus,
    onBlur,
    innerRef,
    ...nativeProps
  } = props

  // Tracks focus so the attached isFocused() reflects current state (some callers
  // gate value syncing on ref.current.isFocused(), like RN's TextInput).
  const isFocusedRef = useRef(false)

  // We expose the native host node directly (rather than an imperative-handle
  // object) so callers can both findNodeHandle() it for view-to-view focus
  // navigation AND call ref.focus(). Imperative methods are attached onto the node.
  const setNativeRef = useCallback((node) => {
    if (node) {
      node.insertAtCursor = (text) => Commands.insertAtCursor(node, text)
      node.focus = () => Commands.focus(node)
      node.blur = () => Commands.blur(node)
      node.isFocused = () => isFocusedRef.current
    }
    if (typeof innerRef === 'function') innerRef(node)
    else if (innerRef) innerRef.current = node
  }, [innerRef])

  // What native currently reports it holds (may carry the sentinel to mark the caret),
  // plus the native event counter at that point. `eventCount` is echoed back so native
  // can drop stale updates.
  const [state, setState] = useState({ text: value, eventCount: 0 })

  // A short trail of the values we have emitted, newest first, so reconciliation below
  // can recognise a `value` prop that is a LAGGING echo of a past native change (versus
  // a genuinely new value the app is setting) and stamp it with the right eventCount.
  const emitsRef = useRef([])

  const handleChange = useCallback((event) => {
    const { text: textWithCursor, eventCount } = event.nativeEvent

    const formatted = onValueFormatting ? onValueFormatting(textWithCursor) : textWithCursor
    const stripped = stripCursor(formatted)
    setState({ text: formatted, eventCount })
    emitsRef.current = [{ text: stripped, eventCount }, ...emitsRef.current].slice(0, 32)

    onChangeText && onChangeText(stripped)
  }, [onValueFormatting, onChangeText])

  const handleFocusChange = useCallback((event) => {
    isFocusedRef.current = !!event.nativeEvent.focused
    if (event.nativeEvent.focused) onFocus && onFocus(event)
    else onBlur && onBlur(event)
  }, [onFocus, onBlur])

  // Reconcile the controlled `value` against what native holds — recomputed every
  // render so a native⇄app divergence always self-heals (e.g. the app assigning an
  // initial value right after mount, or recovering from any native-side desync). The
  // trick is the eventCount we stamp the pushed value with, since native drops anything
  // older than its own counter:
  //   - value already matches native  → nothing to push; the app is caught up, so drop
  //                                      the echo trail (a later programmatic value that
  //                                      happens to equal an old emit must not look stale).
  //   - value is a lagging echo        → stamp it with that past change's count, so if
  //                                      native has since moved on (fast typing) it is
  //                                      rejected instead of reverting the newer char.
  //   - value is a genuinely new value → stamp the latest count so native accepts it.
  let text = state.text
  let eventCount = state.eventCount
  if (stripCursor(state.text) === value) {
    if (emitsRef.current.length) emitsRef.current = []
  } else {
    text = value
    const echo = emitsRef.current.find((e) => e.text === value)
    eventCount = echo ? echo.eventCount : state.eventCount
  }

  const flat = useMemo(() => StyleSheet.flatten(style) || {}, [style])

  return (
    <NativeH2kNativeTextInput
      ref={setNativeRef}
      {...nativeProps}
      style={style}
      text={text}
      mostRecentEventCount={eventCount}
      color={flat.color}
      fontSize={flat.fontSize}
      fontFamily={flat.fontFamily}
      fontWeight={flat.fontWeight != null ? String(flat.fontWeight) : undefined}
      onChangeWithCursor={handleChange}
      onSpacePressed={onSpace}
      onTabPressed={onTab}
      onSubmitPressed={onSubmit}
      onFocusChange={handleFocusChange}
    />
  )
}

export { CURSOR }
