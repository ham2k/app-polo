// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { findNodeHandle, Platform, Pressable, View } from 'react-native'
import { Text } from 'react-native-paper'

import {
  H2kNativeTextInput,
  CURSOR,
  compose,
  splitAtCursor,
  joinAtCursor,
  stripCursor,
  leftTrim as fmtLeftTrim,
  noSpaces as fmtNoSpaces,
  periodToSlash as fmtPeriodToSlash,
  numeric as fmtNumeric,
  decimal as fmtDecimal,
  rst as fmtRst
} from '@ham2k/h2k-native-text-input'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { useKeyboardVisible } from '../../screens/components/useKeyboardVisible'
import { prepareStyles } from './H2kSimpleTextInput'

// Field chrome (label, border, focus styling) wrapped around the native
// <H2kNativeTextInput>. This is the bridge between the bare native primitive
// and the app's existing field contracts:
//   - innerRef exposes the native host node (findNodeHandle-able + .focus())
//   - onSpace/onTab emit { nativeEvent: { key, target } } for MainExchangePanel's
//     spaceHandler view-to-view navigation
//   - focusedRef.onNumberKey inserts a digit at the caret (virtual number keys)
//   - the declarative transforms (rst/noSpaces/…) become a composed,
//     cursor-preserving onValueFormatting

// Truncate to `max` printable chars while keeping the caret sentinel in place.
const clampLength = (max) => (t) => {
  const clean = stripCursor(t)
  if (clean.length <= max) return t
  const truncated = clean.slice(0, max)
  if (!t.includes(CURSOR)) return truncated
  const [before] = splitAtCursor(t)
  const caret = Math.min(before.length, max)
  return joinAtCursor(truncated.slice(0, caret), truncated.slice(caret))
}

// Run a `textTransformer` and decide where the caret lands.
//
// The transformer is called as `fn(text, textWithCursor)`:
//   - `text`           the value with no caret marker
//   - `textWithCursor` the value with the caret marked by the CURSOR sentinel
// By default the caret is anchored to the END: it keeps the same distance from
// the end of the text that it had before the transform (so "US-12|34" + "5"
// stays "US-125|34", not "US-12534|"). To override, the transformer can return a
// string that itself contains the CURSOR sentinel, and that position is used.
const cursorAware = (fn) => (t) => {
  const [, after] = splitAtCursor(t) // text after the caret in the input
  const result = fn(stripCursor(t), t)
  if (result.includes(CURSOR)) return result
  const caret = Math.max(0, result.length - after.length)
  return joinAtCursor(result.slice(0, caret), result.slice(caret))
}

const KEYBOARD_PROFILES = { numbers: 'numbers', dumb: 'dumb', code: 'code', email: 'email' }

export function H2kEnhancedTextInput (props) {
  const {
    style, textStyle, themeColor, disabled, error,
    label, placeholder, value,
    onChange, onChangeText, onSubmitEditing, onSpace, onTab, onFocus, onBlur,
    innerRef, focusedRef,
    fieldId, objectId,
    uppercase, trim, noSpaces, periodToSlash, numeric, decimal, rst, textTransformer,
    keyboard, maxLength, smartKeyboard,
    accessibiltyLabel,
    left, right
  } = props

  const styles = useThemedStyles(prepareStyles, { style, textStyle, error, themeColor, disabled })

  const stringValue = typeof value === 'string' ? value : String(value ?? '')

  // Local handle to the native host node, also forwarded to the caller's innerRef.
  const nodeRef = useRef(null)
  const setRef = useCallback((node) => {
    nodeRef.current = node
    if (typeof innerRef === 'function') innerRef(node)
    else if (innerRef) innerRef.current = node
  }, [innerRef])

  // Latest value reported by the native control. Used on blur because the
  // controlled `value` prop can lag a keystroke behind the native buffer (the
  // change round-trip is async), which would otherwise feed stale text to onBlur.
  const lastValueRef = useRef()

  const [isFocused, setIsFocused] = useState(false)
  const { isKeyboardVisible } = useKeyboardVisible()

  const onValueFormatting = useMemo(() => {
    const fns = []
    if (trim) fns.push((t) => t.trim())
    else fns.push(fmtLeftTrim)
    if (noSpaces) fns.push(fmtNoSpaces)
    if (periodToSlash) fns.push(fmtPeriodToSlash)
    if (numeric) fns.push(fmtNumeric)
    if (decimal) fns.push(fmtDecimal)
    if (rst) fns.push(fmtRst)
    if (textTransformer) fns.push(cursorAware(textTransformer))
    if (maxLength) fns.push(clampLength(maxLength))
    return compose(...fns)
  }, [trim, noSpaces, periodToSlash, numeric, decimal, rst, textTransformer, maxLength])

  const handleSpace = useCallback(() => {
    if (!onSpace) return
    const target = findNodeHandle(nodeRef.current)
    onSpace({ nativeEvent: { key: ' ', target } })
  }, [onSpace])

  const reportChange = useCallback((text) => {
    lastValueRef.current = text
    onChangeText && onChangeText(text)
    if (onChange) {
      const target = findNodeHandle(nodeRef.current)
      onChange({ value: text, fieldId, objectId, ref: nodeRef, nativeEvent: { text, target } })
    }
  }, [onChange, onChangeText, fieldId, objectId])

  const handleChangeText = useCallback((text) => {
    // For fields that allow spaces (spaceKeyMode 'insert'), a double space still
    // means "advance to the next field": collapse it and fire the space handler,
    // matching the legacy H2kSimpleTextInput behavior.
    if (!noSpaces && onSpace && /\s\s/.test(text)) {
      reportChange(text.replace(/\s{2,}/g, ' ').trim())
      handleSpace()
      return
    }
    reportChange(text)
  }, [reportChange, noSpaces, onSpace, handleSpace])

  // No hardware-Tab handler is wired in the logging panel yet, so reuse the
  // space navigation: Tab jumps to the next field.
  const handleTab = useCallback(() => {
    if (onTab) return onTab({ nativeEvent: { key: 'Tab' } })
    handleSpace()
  }, [onTab, handleSpace])

  const handleSubmit = useCallback((event) => {
    onSubmitEditing && onSubmitEditing(event)
  }, [onSubmitEditing])

  const handleFocus = useCallback((event) => {
    setIsFocused(true)
    onFocus && onFocus({ ...event, ref: nodeRef })
  }, [onFocus])

  const handleBlur = useCallback((event) => {
    setIsFocused(false)
    // Prefer the latest native-reported value over the (possibly one-keystroke-stale)
    // controlled prop, so blur consumers (e.g. RST expansion) see what was typed.
    const latest = lastValueRef.current ?? stringValue
    onBlur && onBlur({
      ...event,
      value: latest?.trim?.() ?? latest,
      fieldId,
      objectId,
      ref: nodeRef.current,
      nativeEvent: { ...event?.nativeEvent, text: latest }
    })
  }, [onBlur, stringValue, fieldId, objectId])

  // While focused, expose the virtual-number-key callback. Cleared on blur so a
  // tap on the NumberKeys row can't route a digit into a no-longer-focused field
  // (and so NumberKeys disables) — unless another field has already taken over.
  useEffect(() => {
    if (!focusedRef || !isFocused) return undefined
    const handler = {
      onNumberKey: (number) => nodeRef.current?.insertAtCursor?.(String(number))
    }
    focusedRef.current = handler
    return () => {
      if (focusedRef.current === handler) focusedRef.current = undefined
    }
  }, [focusedRef, isFocused])

  const keyboardProfile = KEYBOARD_PROFILES[keyboard] || 'default'
  const keyboardAppearance = (styles.isDarkMode && Platform.OS === 'ios' && !Platform.isPad) ? 'dark' : 'light'

  // Tapping the field focuses it; tapping an already-focused, empty field while the
  // soft keyboard is up dismisses it (legacy H2kSimpleTextInput behavior). With an
  // external keyboard attached the soft keyboard isn't visible, so this is a no-op.
  const handleOuterPress = useCallback(() => {
    const node = nodeRef.current
    if (node?.isFocused?.() && !stringValue && isKeyboardVisible) {
      node.blur?.()
    } else {
      node?.focus?.()
    }
  }, [stringValue, isKeyboardVisible])

  return (
    <Pressable style={isFocused ? styles.focusedRoot : styles.root} onPress={handleOuterPress}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputContainer}>
        {left || null}

        <H2kNativeTextInput
          innerRef={setRef}
          value={stringValue}
          placeholder={placeholder || ''}
          style={styles.input}
          editable={!disabled}
          uppercase={!!(uppercase || rst)}
          keyboardProfile={keyboardProfile}
          keyboardAppearance={keyboardAppearance}
          smartKeyboard={smartKeyboard !== false}
          spaceKeyMode={noSpaces ? 'navigate' : 'insert'}
          onValueFormatting={onValueFormatting}
          onChangeText={handleChangeText}
          onSpace={handleSpace}
          onTab={handleTab}
          onSubmit={handleSubmit}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessibilityLabel={accessibiltyLabel ?? label}
        />

        {right || null}
      </View>
    </Pressable>
  )
}
