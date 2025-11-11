/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable no-shadow */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TextInput as NativeTextInput, Platform } from 'react-native'
import { useSelector } from 'react-redux'
import { TextInput } from 'react-native-paper'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { selectSettings } from '../../store/settings'

const LEFT_TRIM_REGEX = /^\s+/
const SPACE_REGEX = /\s/g
const DOUBLE_SPACE_REGEX = /\s\s/g
const ONLY_SPACES_REGEX = /^\s+$/g
const NOT_NUMBER_WITH_SIGNS_REGEX = /[^0-9+-]/g
const NOT_NUMBER_WITH_SIGNS_AND_PERIODS_REGEX = /[^0-9+-,.]/g
const SIGN_AFTER_A_DIGIT_REGEX = /([\d,.])[+-]/g

const DEBUG = false

export function H2kTextInput (props) {
  const {
    style, themeColor, textStyle,
    label, placeholder, value, error,
    onChangeText, onChange, onSubmitEditing, onSpace, onFocus, onBlur,
    innerRef, focusedRef,
    fieldId, objectId,
    multiline,
    uppercase, trim, noSpaces, periodToSlash, numeric, decimal, rst, textTransformer,
    keyboard
  } = props
  const themeStyles = useThemedStyles()
  const settings = useSelector(selectSettings)

  const alternateInnerRef = useRef()
  const actualInnerRef = innerRef ?? alternateInnerRef

  // We need to keep a "global" value reference because on Android, the value is not updated immediately
  // when the user types, so we need to keep track of previous onChange values
  const lastChangeRef = useRef()

  const [extraSpace, setExtraSpace] = useState(false)

  let stringValue
  if (extraSpace) stringValue = `${value} `
  else if (typeof value === 'string') stringValue = value
  else stringValue = `${value}`

  // BEGIN VIRTUAL NUMERIC KEY FUNCTIONALITY, PART 1
  // In order to provide virtual numeric keys, we need to keep track of where the cursor is.
  // `selectionRef` is where we store this cursor position.
  // This involves several moving parts, to keep track of the cursor position,
  // and to provide a callback to the virtual numeric keys to insert numbers.
  // We use `focusedRef` to provide the callback, which is updated in a `useEffect` on "PART 2" below.
  const selectionRef = useRef({})
  const trackSelection = useMemo(() => !!focusedRef, [focusedRef])

  useEffect(() => {
    if (DEBUG && fieldId === 'theirCall') console.log(`H2KTextInput(${fieldId}) useEffect check end of string?`, { stringValue, start: selectionRef?.current?.start, end: selectionRef?.current?.end, lastChange: lastChangeRef.current, trackSelection })
    if (!trackSelection) return

    if (!stringValue) {
      // If value is empty or null, reset the selection to an empty object,
      selectionRef.current = {}
    } else if ((selectionRef.current?.start || 0) >= stringValue.length) {
      // If value changes to anything shorter than the previous cursor position, reset the selection to an empty object.
      selectionRef.current = {}
      if (DEBUG && fieldId === 'theirCall') console.log(`H2KTextInput(${fieldId}) useEffect end of string set to`, { stringValue, start: selectionRef?.current?.start, end: selectionRef?.current?.end, lastChange: lastChangeRef.current, trackSelection })
    } else if (lastChangeRef.current !== stringValue) {
      // If the value has changed, reset the selection to an empty object.
      selectionRef.current = {}
      if (DEBUG && fieldId === 'theirCall') console.log(`H2KTextInput(${fieldId}) useEffect value changed set to`, { stringValue, start: selectionRef?.current?.start, end: selectionRef?.current?.end, lastChange: lastChangeRef.current, trackSelection })
    }
  }, [trackSelection, stringValue, lastChangeRef, fieldId])

  const handleSelectionChange = useCallback((event) => {
    if (trackSelection) {
      const { nativeEvent: { selection: { start, end } } } = event
      if (DEBUG && fieldId === 'theirCall') console.log(`H2KTextInput(${fieldId}) handleSelectionChange`, { start, end })
      if (start === end && start > stringValue.length) {
        // If the selection is at the end of the string, reset current selection
        selectionRef.current.start = undefined
        selectionRef.current.end = undefined
      } else {
        selectionRef.current.start = start
        selectionRef.current.end = end
      }
    }
  }, [fieldId, trackSelection, stringValue])
  // END VIRTUAL NUMERIC KEY FUNCTIONALITY, PART 1

  // The general `handleChange` function takes care of several things:
  // - track if a space was added, for fields where this jumps to the next field
  // - formatting and cleanup, with lower or uppercasing, trimming, converting periods to slashes, etc.
  // - invoking any `textTransformer` function pased as a prop
  // - update cursor position based on what changed
  const handleChange = useCallback((event) => {
    let { text } = event.nativeEvent

    if (text === undefined || text === null) return

    let spaceAdded = false

    if (lastChangeRef.current === undefined) lastChangeRef.current = stringValue

    if (DEBUG) console.log(`H2KTextInput(${fieldId}) handleChange`, selectionRef?.current?.start, selectionRef?.current?.end, text, stringValue, { lastChange: lastChangeRef.current, trackSelection })
    if (multiline || text.length < lastChangeRef.length) {
      lastChangeRef.current = text
      if (selectionRef.current?.start > 0) {
        selectionRef.current.start = selectionRef.current?.start + (text.length - lastChangeRef.current?.length)
        selectionRef.current.end = selectionRef.current?.end + (text.length - lastChangeRef.current?.length)
      }
      if (DEBUG) console.log(`H2KTextInput(${fieldId}) handleChange multiline or deleting`, selectionRef?.current?.start, selectionRef?.current?.end, text, { lastChange: lastChangeRef.current, trackSelection })
      // We should not do any transformations:
      // - on multiline inputs
      // - or when deleting
    } else {
      lastChangeRef.current = text

      // if (DEBUG) console.log(`H2KTextInput(${fieldId}) handleChange else`, { text })
      // Lets check if what changed was the addition of a space
      if (noSpaces && (text !== stringValue) && (text.replace(SPACE_REGEX, '') === stringValue)) {
        spaceAdded = true
        text = stringValue
      } else if (noSpaces === false && (text !== stringValue) && (text.replace(DOUBLE_SPACE_REGEX, ' ') === stringValue)) {
        spaceAdded = true
        text = stringValue.trim()
      } else if (text.match(ONLY_SPACES_REGEX) && stringValue !== '') { // or a space replacing the entire value
        spaceAdded = true
        text = stringValue
      }

      if (noSpaces && spaceAdded) {
        const spaceEvent = { nativeEvent: { key: ' ', target: event.nativeEvent.target } }
        onSpace && onSpace(spaceEvent)

        // When we detect a space was added, we need don't send any new values upstream
        // but this means the native component now believes it has a value with a space at the end.
        // So we need to update what we pass as `children` (via `stringValue`) to include that space
        // so that the native component syncs up, and then we remove the space and render it again.
        setExtraSpace(true)
        setTimeout(() => setExtraSpace(false), 50)
        return
      } else {
        text = text.replace(LEFT_TRIM_REGEX, '')

        if (uppercase) {
          text = text.toUpperCase()
        }
        if (trim) {
          text = text.trim()
        }
        if (noSpaces) {
          text = text.replace(SPACE_REGEX, '')
        }
        if (periodToSlash) {
          // if (DEBUG) console.log(`H2KTextInput(${fieldId}) handleChange periodToSlash`, text)
          text = text.replaceAll('.', '/')
        }
        if (numeric) {
          text = text.replace(NOT_NUMBER_WITH_SIGNS_REGEX, '').replace(SIGN_AFTER_A_DIGIT_REGEX, '$1')
        }
        if (decimal) {
          text = text.replace(NOT_NUMBER_WITH_SIGNS_AND_PERIODS_REGEX, '').replace(SIGN_AFTER_A_DIGIT_REGEX, '$1')
        }
        if (rst) {
          text = text.replace(NOT_NUMBER_WITH_SIGNS_REGEX, '')
        }

        if (textTransformer) {
          text = textTransformer(text)
        }

        if (DEBUG) console.log(`H2KTextInput(${fieldId}) handleChange after transformations`, text)
        if (trackSelection && text.length !== stringValue.length) {
          if (DEBUG && fieldId === 'theirCall') console.log(`H2KTextInput(${fieldId}) handleChange length changed?`, selectionRef?.current?.start, selectionRef?.current?.end, text, stringValue, { lastChange: lastChangeRef.current })
          const selectionFromVirtualNumericKeys = event.selectionFromVirtualNumericKeys ?? {}
          const start = selectionFromVirtualNumericKeys.start ?? selectionRef.current?.start ?? stringValue.length
          const end = selectionFromVirtualNumericKeys.end ?? selectionRef.current?.end ?? stringValue.length

          let newCursor

          if (start !== end) {
            // If there was a selection, and not just a cursor…
            if (stringValue.length - text.length === end - start) {
              // if the selection got deleted, we leave the cursor at the start of the selection
              newCursor = start
            } else {
              // Otherwise we move the cursor to the end of the inserted text
              newCursor = Math.max(0, end + (text.length - stringValue.length))
            }
          } else {
            // Otherwise we move the cursor by as many characters got added (or deleted)
            newCursor = Math.max(0, start + (text.length - stringValue.length))
          }

          if (newCursor >= text.length) {
            // If we're at the end of the text, just leave selection empty
            newCursor = undefined
          }

          selectionRef.current.start = newCursor
          selectionRef.current.end = newCursor

          if (DEBUG && fieldId === 'theirCall') console.log(`H2KTextInput(${fieldId}) handleChange length changed`, selectionRef.current?.start, selectionRef.current?.end, text, stringValue)
          setTimeout(() => {
            // Sometimes, updating the value causes the native text field to also update the selection
            // to a value that is not the one we want. So we have to repeat our update in order to overwrite it.
            selectionRef.current.start = newCursor
            selectionRef.current.end = newCursor

            if (DEBUG && fieldId === 'theirCall') console.log(`H2KTextInput(${fieldId}) handleChange length changed timeout`, selectionRef.current?.start, selectionRef.current?.end, text, stringValue)
          }, 5)
        }

        event.nativeEvent.text = text
      }
    }
    const changeEvent = { ...event }
    changeEvent.fieldId = fieldId
    changeEvent.objectId = objectId
    changeEvent.ref = actualInnerRef
    changeEvent.nativeEvent.text = text
    if (DEBUG) console.log(`H2KTextInput(${fieldId}) handleChange final`, { text })
    onChangeText && onChangeText(text)
    onChange && onChange(changeEvent)
  }, [
    multiline, fieldId, objectId, actualInnerRef, stringValue,
    uppercase, trim, noSpaces, periodToSlash, numeric, decimal, rst,
    textTransformer, onChangeText, onChange, onSpace, trackSelection
  ])

  // BEGIN VIRTUAL NUMERIC KEY FUNCTIONALITY, PART 2
  // If this input is focused, we update `focusedRef` to provide a callback that can be used
  // by virtual numeric keys to insert a number at the current cursor position.
  // This has to be done in a second "PART" because it depends on the `handleChange` function,

  // So we track focus changes and when this field becomes focused, we update `focusedRef` with
  // a function pointing at this field's `handleChange` function.
  // And when a different field becomes focused, their `useEffect` will overwrite the callback in
  // the shared `focusedRef`.
  const [isFocused, setIsFocused] = useState(false)
  const handleFocus = useCallback((event) => {
    setIsFocused(true)
    onFocus && onFocus({ ...event, ref: actualInnerRef })
  }, [onFocus, actualInnerRef])
  const handleBlur = useCallback((event) => {
    setIsFocused(false)
    onBlur && onBlur({ ...event, value: stringValue?.trim() || '', fieldId, objectId, ref: actualInnerRef.current })
  }, [onBlur, stringValue, fieldId, objectId, actualInnerRef])

  useEffect(() => {
    if (focusedRef && isFocused && !multiline) {
      focusedRef.current = {
        onNumberKey: (number) => {
          if (!isFocused) return

          let { start, end } = selectionRef.current
          // If selection position is unknown, we assume the cursor is at the end of the string
          start = start ?? stringValue.length ?? 0
          end = end ?? stringValue.length ?? 0

          const newValue = stringValue.substring(0, start) + number + stringValue.substring(end)

          handleChange && handleChange({
            nativeEvent: { text: newValue, target: actualInnerRef.current?._nativeTag },
            fromVirtualNumericKeys: true,
            selectionFromVirtualNumericKeys: { start, end }
          })
        }
      }
    }
  }, [focusedRef, handleChange, isFocused, stringValue, actualInnerRef, multiline])
  // END VIRTUAL NUMERIC KEY FUNCTIONALITY, PART 2

  const colorStyles = useMemo(() => {
    return {
      paperInput: {
        color: themeColor ? themeStyles.theme.colors[themeColor] : themeStyles.theme.colors.onBackground,
        backgroundColor: themeStyles.theme.colors.background
      },
      nativeInput: {
        color: themeColor ? themeStyles.theme.colors[themeColor] : themeStyles.theme.colors.onBackground
      },
      selectionColor: themeColor ? themeStyles.theme.colors[`${themeColor}Light`] : themeStyles.theme.colors.primaryLight,
      cursorColor: themeColor ? themeStyles.theme.colors[`${themeColor}`] : themeStyles.theme.colors.primary,
      errorColor: themeStyles.theme.colors.error
    }
  }, [themeStyles, themeColor])

  const keyboardOptions = useMemo(() => {
    let keyboardOpts = {}

    if (multiline || keyboard === 'normal' || !keyboard) {
      keyboardOpts = {
        autoCapitalize: 'sentences',
        inputMode: 'text'
      }
    } else if (keyboard === 'code') {
      keyboardOpts = {
        autoCapitalize: 'none',
        keyboardType: 'ascii-capable'
      }
    } else if (keyboard === 'dumb' || keyboard === 'numbers') {
      keyboardOpts = {
        autoComplete: 'off',
        autoCorrect: false,
        disableFullScreenUI: false, // Android only
        importantForAutofill: 'no', // Android only
        textContentType: 'none', // iOS only
        spellCheck: false,
        keyboardType: Platform.OS === 'android' ? 'visible-password' : 'default'
      }
      if (keyboard === 'numbers') {
        keyboardOpts.keyboardType = Platform.OS === 'android' ? 'visible-password' : 'numbers-and-punctuation'
        keyboardOpts.autoCapitalize = Platform.OS === 'android' ? 'none' : 'characters' // Android does not support autoCapitalize on visible-password
      }
    } else if (keyboard === 'email') {
      keyboardOpts = {
        autoCompleteType: 'email',
        keyboardType: 'email-address',
        autoCapitalize: 'none'
      }
    }

    // if (uppercase) keyboardOpts.autoCapitalize = Platform.OS === 'android' ? 'none' : 'characters' // Android does not support autoCapitalize on visible-password
    if (uppercase) keyboardOpts.autoCapitalize = 'characters'

    keyboardOpts.autoFocus = false
    keyboardOpts.importantForAutofill = 'no' // Android only
    keyboardOpts.disableFullScreenUI = true // Android only

    keyboardOpts.enterKeyHint = 'send'

    // Try to match the keyboard appearance to the theme, but not on iPad because there seems to be a bug there.
    keyboardOpts.keyboardAppearance = (themeStyles.isDarkMode && Platform.OS === 'ios' && !Platform.isPad) ? 'dark' : 'light'

    if (settings.smartKeyboard === false) {
      if (keyboardOpts.keyboardType === 'visible-password') {
        keyboardOpts.keyboardType = 'default'
        keyboardOpts.autoCapitalize = 'characters'
      }
    }

    return keyboardOpts
  }, [keyboard, themeStyles.isDarkMode, uppercase, multiline, settings.smartKeyboard])

  if (DEBUG && fieldId === 'theirCall') console.log(`H2KTextInput(${fieldId}) renderInput`, { stringValue, start: selectionRef?.current?.start, end: selectionRef?.current?.end, lastChange: lastChangeRef.current, trackSelection })

  const renderInput = useCallback((props) => {
    const valueAsChild = !(numeric || decimal || rst)

    return (
      <NativeTextInput
        {...keyboardOptions}

        {...props}

        ref={actualInnerRef}
        value={valueAsChild ? undefined : stringValue}
        placeholder={placeholder || ''}
        style={[
          colorStyles.nativeInput,
          props.style,
          {
            fontFamily: themeStyles.monospacedFontFamily,
            fontVariant: ['tabular-nums'],
            fontWeight: 'regular'
          },
          textStyle
        ]}
        allowFontScaling={false}
        placeholderTextColor={themeStyles.theme.colors.onBackgroundLighter}
        cursorColor={colorStyles.cursorColor}
        selectionColor={colorStyles.sectionColor}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={false} // Prevent keyboard from hiding
        onChange={handleChange}
        onChangeText={undefined}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSelectionChange={trackSelection ? handleSelectionChange : undefined}
      >{valueAsChild ? stringValue : null}</NativeTextInput>
      // >{stringValue.slice(0, 1)}<Text style={{ fontWeight: 'bold', color: 'red' }}>{stringValue.slice(1, 5)}</Text>{stringValue.slice(5)}</NativeTextInput>
    )
  }, [
    stringValue, keyboardOptions, actualInnerRef, placeholder, colorStyles, themeStyles, textStyle,
    numeric, decimal, rst,
    onSubmitEditing, handleFocus, handleBlur, handleChange, handleSelectionChange, trackSelection
  ])

  return (
    <TextInput
      {...props}
      accessibilityLabel={props.accessibilityLabel ?? props.label}
      style={[
        colorStyles.paperInput,
        {
          paddingHorizontal: props.dense ? themeStyles.halfSpace : themeStyles.oneSpace,
          fontSize: themeStyles.normalFontSize * themeStyles.fontScale, // For some reason, this component does take into consideration `fontScale` so we have to multiply it ourselves
          lineHeight: themeStyles.normalFontSize * themeStyles.fontScale * 1.2, // For some reason, this component does take into consideration `fontScale` so we have to multiply it ourselves
          fontFamily: themeStyles.fontFamily
        },
        style
      ]}
      maxFontSizeMultiplier={1} // This affects the size of the label
      textColor={error ? colorStyles.errorColor : colorStyles.paperInput.color}
      selectionColor={colorStyles.paperInput.color}
      underlineColor={colorStyles.paperInput.color}
      activeUnderlineColor={colorStyles.paperInput.color}
      mode={'flat'}
      underlineStyle={{
        borderRadius: 30
      }}
      value={value || ' '}
      label={label}
      placeholder={placeholder || ''}
      render={renderInput}
      error={error}
    />
  )
}
