/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable no-shadow */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { TextInput } from 'react-native-paper'
import { TextInput as NativeTextInput } from 'react-native'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

const LEFT_TRIM_REGEX = /^\s+/
const SPACES_REGEX = /\s/g
const ONLY_SPACES_REGEX = /^\s+$/g
const NUMBER_WITH_SIGNS_REGEX = /[^0-9+-]/g
const NUMBER_WITH_SIGNS_AND_PERIODS_REGEX = /[^0-9+-,.]/g
const SIGN_AFTER_A_DIGIT_REGEX = /([\d,.])[+-]/g

export default function ThemedTextInput (props) {
  const {
    style, themeColor, textStyle,
    label, placeholder, value, error,
    onChangeText, onChange, onSubmitEditing, onKeyPress, onFocus, onBlur,
    innerRef, focusedRef,
    fieldId,
    uppercase, trim, noSpaces, numeric, decimal,
    keyboard
  } = props
  const themeStyles = useThemedStyles()
  const [previousValue, setPreviousValue] = useState(value)

  const alternateInnerRef = useRef()
  const actualInnerRef = innerRef ?? alternateInnerRef

  const strValue = useMemo(() => {
    return `${value}`
  }, [value])

  useEffect(() => {
    setPreviousValue(strValue)
  }, [strValue])

  const handleChange = useCallback((event) => {
    let { text } = event.nativeEvent
    let spaceAdded = false

    // Lets check if what changed was the addition of a space
    if ((text !== previousValue) && (text.replace(SPACES_REGEX, '') === previousValue)) {
      spaceAdded = true
    } else if (text.match(ONLY_SPACES_REGEX) && previousValue !== '') { // or a space replacing the entire value
      spaceAdded = true
      text = previousValue
    }

    text = text.replace(LEFT_TRIM_REGEX, '')

    if (uppercase) {
      text = text.toUpperCase()
    }
    if (trim) {
      text = text.trim()
    }
    if (noSpaces) {
      text = text.replace(SPACES_REGEX, '')
    }
    if (numeric) {
      text = text.replace(NUMBER_WITH_SIGNS_REGEX, '').replace(SIGN_AFTER_A_DIGIT_REGEX, '$1')
    }
    if (decimal) {
      text = text.replace(NUMBER_WITH_SIGNS_AND_PERIODS_REGEX, '').replace(SIGN_AFTER_A_DIGIT_REGEX, '$1')
    }
    event.nativeEvent.text = text

    setPreviousValue(text)
    onChangeText && onChangeText(text)
    onChange && onChange({ ...event, fieldId, ref: actualInnerRef })
    if (spaceAdded) {
      onKeyPress && onKeyPress({ nativeEvent: { key: ' ', target: event?.nativeEvent?.target } })
    }
  }, [
    previousValue,
    fieldId, actualInnerRef,
    uppercase, noSpaces, numeric, decimal, trim,
    onChangeText, onChange, onKeyPress
  ])

  const [currentSelection, setCurrentSelection] = useState({})
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (focusedRef && isFocused) {
      focusedRef.current = {
        onNumberKey: (number) => {
          if (!isFocused) return

          let { start, end } = currentSelection

          if (!start && !end) {
            // If selection position is unknown, we assume the cursor is at the end of the string
            start = strValue.length
            end = strValue.length
          }

          const newValue = strValue.substring(0, start) + number + strValue.substring(end)

          handleChange && handleChange({ nativeEvent: { text: newValue, target: actualInnerRef.current._nativeTag } })

          if (strValue.length === start && strValue.length === end) {
            // Cursor was at the end of the original value
            // Since the handleChange method might modify the value, and does not cause
            // a call to onSelectionChange, we need to mark the current selection state as 'unknown'
            setCurrentSelection({})
          } else {
            setCurrentSelection({ start: start + 1, end: end + 1 })
          }
        }
      }
    }
  }, [currentSelection, fieldId, focusedRef, handleChange, isFocused, strValue, actualInnerRef])

  const handleSelectionChange = useCallback((event) => {
    const { nativeEvent: { selection: { start, end } } } = event

    setCurrentSelection({ start, end })
  }, [])

  const handleFocus = useCallback((event) => {
    setIsFocused(true)
    onFocus && onFocus({ ...event, ref: actualInnerRef })
  }, [onFocus, actualInnerRef])

  const handleBlur = useCallback((event) => {
    setIsFocused(false)
    onBlur && onBlur({ ...event, ref: actualInnerRef.current })
  }, [onBlur, actualInnerRef])

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
      cursorColor: themeColor ? themeStyles.theme.colors[`${themeColor}`] : themeStyles.theme.colors.primary
    }
  }, [themeStyles, themeColor])

  const keyboardOptions = useMemo(() => {
    if (keyboard === 'dumb') {
      return {
        autoCapitalize: 'none',
        autoComplete: 'off',
        autoCorrect: false,
        spellCheck: false,
        dataDetectorType: 'none',
        textContentType: 'none',
        inputMode: undefined,
        keyboardType: 'visible-password', // Need both this and secureTextEntry={false} to prevent autofill on Android
        secureTextEntry: false,
        importantForAutofill: 'no',
        returnKeyType: 'send'
      }
    } else if (keyboard === 'numbers') {
      return {
        autoCapitalize: 'none',
        autoComplete: 'off',
        autoCorrect: false,
        spellCheck: false,
        dataDetectorType: 'none',
        textContentType: 'none',
        inputMode: undefined,
        keyboardType: 'visible-password', // Need both this and secureTextEntry={false} to prevent autofill on Android
        secureTextEntry: false,
        // keyboardType: 'numbers-and-punctuation',
        // secureTextEntry: false,
        importantForAutofill: 'no',
        returnKeyType: 'send'
      }
    } else {
      return {}
    }
  }, [keyboard])

  const renderInput = useCallback((props) => {
    return (
      <NativeTextInput
        {...keyboardOptions}

        {...props}

        ref={actualInnerRef}

        value={strValue || ''}
        placeholder={placeholder || ''}
        style={[
          colorStyles.nativeInput,
          props.style,
          { fontFamily: themeStyles.fontFamily },
          textStyle
        ]}
        placeholderTextColor={themeStyles.theme.colors.onBackgroundLighter}
        cursorColor={colorStyles.cursorColor}
        selectionColor={colorStyles.sectionColor}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={false} // Prevent keyboard from hiding
        onKeyPress={onKeyPress}
        onChange={handleChange}
        onChangeText={undefined}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSelectionChange={handleSelectionChange}
      />
    )
  }, [
    keyboardOptions, actualInnerRef, strValue, placeholder, colorStyles, themeStyles, textStyle,
    onSubmitEditing, onKeyPress, handleFocus, handleBlur, handleChange, handleSelectionChange
  ])

  return (
    <TextInput
      {...props}
      style={[
        colorStyles.paperInput,
        {
          marginTop: 0,
          paddingTop: 0,
          paddingHorizontal: props.dense ? themeStyles.halfSpace : themeStyles.oneSpace,
          fontSize: themeStyles.normalFontSize,
          fontFamily: themeStyles.fontFamily
        },
        style
      ]}
      textColor={colorStyles.paperInput.color}
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
