/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
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

export default function ThemedTextInput (props) {
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

  const selectionRef = useRef({})

  const [extraSpace, setExtraSpace] = useState(false)

  const stringValue = useMemo(() => {
    if (extraSpace) return `${value} `
    else if (typeof value === 'string') return value
    else return `${value}`
  }, [value, extraSpace])

  const trackSelection = useMemo(() => !!focusedRef, [focusedRef])

  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (DEBUG && fieldId === 'theirCall') console.log('useEffect end of string', { stringValue, sel: selectionRef?.current })
    if (trackSelection && (selectionRef.current.start || 0) > stringValue.length) {
      selectionRef.current.start = stringValue.length
      selectionRef.current.end = stringValue.length
      if (DEBUG && fieldId === 'theirCall') console.log('useEffect end of string set to', { stringValue, sel: selectionRef?.current })
    }
  }, [trackSelection, stringValue, fieldId])

  const handleChange = useCallback((event) => {
    let { text } = event.nativeEvent

    if (text === undefined || text === null) return

    let spaceAdded = false
    if (DEBUG) console.log('handleChange', { text })
    if (multiline || text.length < stringValue.length) {
      // We should not do any transformations:
      //  - on multiline inputs
      //  - or when deleting
    } else {
      if (DEBUG) console.log('handleChange else', { text })
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

      if (spaceAdded) {
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
          if (DEBUG) console.log('handleChange periodToSlash', { text })
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
        if (DEBUG) console.log('handleChange after transformations', { text })
        if (trackSelection && text.length !== stringValue.length) {
          if (DEBUG && fieldId === 'theirCall') console.log('handleChange length changed?', { selectionRef: selectionRef.current, stringValue })
          const selectionFromVirtualNumericKeys = event.selectionFromVirtualNumericKeys ?? {}
          const start = selectionFromVirtualNumericKeys.start ?? selectionRef.current.start ?? stringValue.length
          const end = selectionFromVirtualNumericKeys.end ?? selectionRef.current.end ?? stringValue.length
          // Sometimes, updating the value causes the native text field to also update the selection
          // to a value that is not the one we want. So we have to delay our update in order to overwrite it.
          selectionRef.current.start = start + (text.length - stringValue.length)
          selectionRef.current.end = end + (text.length - stringValue.length)
          if (DEBUG && fieldId === 'theirCall') console.log('handleChange length changed', { start, end, text, stringValue })
          setTimeout(() => {
            selectionRef.current.start = start + (text.length - stringValue.length)
            selectionRef.current.end = end + (text.length - stringValue.length)
            if (DEBUG && fieldId === 'theirCall') console.log('handleChange length changed timeout', { start, end, text, stringValue })
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
    if (DEBUG) console.log('handleChange final', { text })
    onChangeText && onChangeText(text)
    onChange && onChange(changeEvent)
  }, [
    multiline, fieldId, objectId, actualInnerRef, stringValue,
    uppercase, trim, noSpaces, periodToSlash, numeric, decimal, rst,
    textTransformer, onChangeText, onChange, onSpace, trackSelection
  ])

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
            nativeEvent: { text: newValue, target: actualInnerRef.current._nativeTag },
            fromVirtualNumericKeys: true,
            selectionFromVirtualNumericKeys: { start, end }
          })
        }
      }
    }
  }, [focusedRef, handleChange, isFocused, stringValue, actualInnerRef, multiline])

  const handleSelectionChange = useCallback((event) => {
    if (trackSelection) {
      const { nativeEvent: { selection: { start, end } } } = event
      if (DEBUG && fieldId === 'theirCall') console.log('handleSelectionChange', { start, end })
      selectionRef.current.start = start
      selectionRef.current.end = end
    }
  }, [fieldId, trackSelection])

  const handleFocus = useCallback((event) => {
    setIsFocused(true)
    onFocus && onFocus({ ...event, ref: actualInnerRef })
  }, [onFocus, actualInnerRef])

  const handleBlur = useCallback((event) => {
    setIsFocused(false)
    onBlur && onBlur({ ...event, value: stringValue?.trim() || '', fieldId, objectId, ref: actualInnerRef.current })
  }, [onBlur, stringValue, fieldId, objectId, actualInnerRef])

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

    if (uppercase) keyboardOpts.autoCapitalize = Platform.OS === 'android' ? 'none' : 'characters' // Android does not support autoCapitalize on visible-password

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

  if (DEBUG && fieldId === 'theirCall') console.log('renderInput', { stringValue, sel: selectionRef?.current, trackSelection })
  const renderInput = useCallback((props) => {
    return (
      <NativeTextInput
        {...keyboardOptions}

        {...props}

        ref={actualInnerRef}
        value={undefined}
        // value={stringValue}
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

        // Using a ref for props is frowned upon, but this is the only way to update the selection without causing further updates
        // Also, iOS seems to work fine without controlled selection, while Android seems to need it
        // selection={Platform.OS === 'android' && trackSelection ? selectionRef.current : undefined}
      >{stringValue}</NativeTextInput>
      // >{stringValue.slice(0, 1)}<Text style={{ fontWeight: 'bold', color: 'red' }}>{stringValue.slice(1, 5)}</Text>{stringValue.slice(5)}</NativeTextInput>
    )
  }, [
    stringValue, keyboardOptions, actualInnerRef, placeholder, colorStyles, themeStyles, textStyle,
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
