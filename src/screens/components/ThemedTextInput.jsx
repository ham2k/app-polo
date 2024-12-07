/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable no-shadow */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { TextInput } from 'react-native-paper'
import { TextInput as NativeTextInput, Platform } from 'react-native'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

const LEFT_TRIM_REGEX = /^\s+/
const SPACES_REGEX = /\s/g
const ONLY_SPACES_REGEX = /^\s+$/g
const NOT_NUMBER_WITH_SIGNS_REGEX = /[^0-9+-]/g
const NOT_NUMBER_WITH_SIGNS_AND_PERIODS_REGEX = /[^0-9+-,.]/g
const SIGN_AFTER_A_DIGIT_REGEX = /([\d,.])[+-]/g

export default function ThemedTextInput (props) {
  const {
    style, themeColor, textStyle,
    label, placeholder, value, error,
    onChangeText, onChange, onSubmitEditing, onSpace, onFocus, onBlur,
    innerRef, focusedRef,
    fieldId,
    multiline,
    uppercase, trim, noSpaces, periodToSlash, numeric, decimal, rst, textTransformer,
    keyboard
  } = props
  const themeStyles = useThemedStyles()

  const alternateInnerRef = useRef()
  const actualInnerRef = innerRef ?? alternateInnerRef

  const stringValue = useMemo(() => {
    if (typeof value === 'string') return value
    else return `${value}`
  }, [value])

  const trackSelection = useMemo(() => !!focusedRef, [focusedRef])

  const [currentSelection, setCurrentSelection] = useState({})
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (trackSelection && currentSelection.start > stringValue.length) {
      setCurrentSelection({ start: stringValue.length, end: stringValue.length })
    }
  }, [trackSelection, stringValue, currentSelection])

  const handleChange = useCallback((event) => {
    let { text } = event.nativeEvent
    let spaceAdded = false

    if (multiline || text.length < stringValue.length) {
      // We should not do any transformations:
      //  - on multiline inputs
      //  - or when deleting
    } else {
      // Lets check if what changed was the addition of a space
      if ((text !== stringValue) && (text.replace(SPACES_REGEX, '') === stringValue)) {
        spaceAdded = true
      } else if (text.match(ONLY_SPACES_REGEX) && stringValue !== '') { // or a space replacing the entire value
        spaceAdded = true
        text = stringValue
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
      if (periodToSlash) {
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

      if (trackSelection && text.length !== stringValue.length) {
        const selectionFromVirtualNumericKeys = event.selectionFromVirtualNumericKeys ?? {}
        const start = selectionFromVirtualNumericKeys.start ?? currentSelection.start ?? stringValue.length
        const end = selectionFromVirtualNumericKeys.end ?? currentSelection.end ?? stringValue.length
        // Sometimes, updating the value causes the native text field to also update the selection
        // to a value that is not the one we want. So we have to delay our update in order to overwrite it.
        setCurrentSelection({
          start: start + (text.length - stringValue.length),
          end: end + (text.length - stringValue.length)
        })
        setTimeout(() => {
          setCurrentSelection({
            start: start + (text.length - stringValue.length),
            end: end + (text.length - stringValue.length)
          })
        }, 20)
      }

      event.nativeEvent.text = text
    }

    const changeEvent = { ...event }
    changeEvent.fieldId = fieldId
    changeEvent.ref = actualInnerRef
    changeEvent.nativeEvent.text = text
    const spaceEvent = { nativeEvent: { key: ' ', target: event.nativeEvent.target } }
    // if (Platform.OS === 'android') {
    //   // This delay minimizes issues when using external keyboards on Android
    //   // setTimeout(() => {
    //   onChangeText && onChangeText(text)
    //   onChange && onChange(changeEvent)
    //   if (spaceAdded) onSpace && onSpace(spaceEvent)
    //   // }, 50)
    // } else {
    actualInnerRef.current.setNativeProps({ text })
    onChangeText && onChangeText(text)
    onChange && onChange(changeEvent)
    if (spaceAdded) onSpace && onSpace(spaceEvent)
    // }
  }, [
    multiline, fieldId, actualInnerRef, stringValue,
    uppercase, trim, noSpaces, periodToSlash, numeric, decimal, rst,
    textTransformer, currentSelection, onChangeText, onChange, onSpace, trackSelection
  ])

  useEffect(() => {
    if (focusedRef && isFocused && !multiline) {
      focusedRef.current = {
        onNumberKey: (number) => {
          if (!isFocused) return

          let { start, end } = currentSelection
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
  }, [currentSelection, fieldId, focusedRef, handleChange, isFocused, stringValue, actualInnerRef, multiline, setCurrentSelection])

  const handleSelectionChange = useCallback((event) => {
    if (trackSelection) {
      const { nativeEvent: { selection: { start, end } } } = event
      setCurrentSelection({ start, end })
    }
  }, [setCurrentSelection, trackSelection])

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
    const dumbDownKeyboardProps = {
      autoComplete: 'off',
      autoCorrect: false,
      disableFullScreenUI: false,
      enterKeyHint: 'send',
      importantForAutofill: 'no',
      inputMode: undefined,
      spellCheck: false,
      // textContentType: 'none',

      // Try to match the keyboard appearance to the theme, but not on iPad because there seems to be a bug there.
      keyboardAppearance: (themeStyles.isDarkMode && Platform.OS === 'ios' && !Platform.isPad) ? 'dark' : 'light',

      // On Android, "visible-password" would enable numbers in the keyboard, and disable autofill
      // but it has serious lag issues https://github.com/facebook/react-native/issues/35735
      keyboardType: 'visible-password',
      // secureTextEntry: Platform.OS === 'android'
      textContentType: Platform.OS === 'android' ? 'password' : 'none'
    }

    if (multiline) dumbDownKeyboardProps.autoCapitalize = 'sentences'
    else if (uppercase) dumbDownKeyboardProps.autoCapitalize = 'characters'

    if (keyboard === 'numbers') dumbDownKeyboardProps.keyboardType = 'numbers-and-punctuation'

    dumbDownKeyboardProps.keyboardAppearance = (themeStyles.isDarkMode && Platform.OS === 'ios' && !Platform.isPad) ? 'dark' : 'light'

    return dumbDownKeyboardProps
  }, [keyboard, themeStyles.isDarkMode, uppercase, multiline])

  const renderInput = useCallback((props) => {
    return (
      <NativeTextInput
        {...keyboardOptions}

        {...props}

        ref={actualInnerRef}

        value={stringValue}
        placeholder={placeholder || ''}
        style={[
          colorStyles.nativeInput,
          props.style,
          {
            fontFamily: themeStyles.fontFamily
            // fontSize: themeStyles.normalFontSize * 4,
            // lineHeight: themeStyles.normalFontSize * 5
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
        selection={trackSelection ? currentSelection : undefined}
      />
    )
  }, [
    stringValue, keyboardOptions, actualInnerRef, placeholder, colorStyles, themeStyles, textStyle,
    onSubmitEditing, handleFocus, handleBlur, handleChange, handleSelectionChange, currentSelection, trackSelection
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
