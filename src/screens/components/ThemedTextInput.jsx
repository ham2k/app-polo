import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { TextInput } from 'react-native-paper'
import { TextInput as NativeTextInput, StyleSheet } from 'react-native'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

const LEFT_TRIM_REGEX = /^\s+/
const SPACES_REGEX = /\s/g
const NUMBER_WITH_SIGNS_REGEX = /[^0-9+-]/g
const NUMBER_WITH_SIGNS_AND_PERIODS_REGEX = /[^0-9+-,.]/g
const SIGN_AFTER_A_DIGIT_REGEX = /([\d,.])[+-]/g

export default function ThemedTextInput ({
  style, textStyle, themeColor,
  label, placeholder, value, error,
  onChangeText, onChange, onSubmitEditing, onKeyPress,
  innerRef, fieldId,
  uppercase, trim, noSpaces, numeric, decimal,
  keyboard
}) {
  const themeStyles = useThemedStyles()
  const [previousValue, setPreviousValue] = useState(value)

  const [innerValue, setInnerValue] = useState()
  useEffect(() => {
    setInnerValue(`${value}`) // ensure value is a string
  }, [value])

  useEffect(() => {
    setPreviousValue(innerValue)
  }, [innerValue])

  const handleChange = useCallback((event) => {
    let { text } = event.nativeEvent
    let spaceAdded = false

    // Lets check if what changed was the addition of a space
    if (text !== previousValue && text.replace(SPACES_REGEX, '') === previousValue) {
      spaceAdded = true
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
    onChange && onChange({ ...event, fieldId })
    if (spaceAdded) {
      onKeyPress && onKeyPress({ nativeEvent: { key: ' ', target: event.nativeEvent.target } })
    }
  }, [onChangeText, onChange, fieldId, uppercase, noSpaces, numeric, trim, previousValue, onKeyPress])

  const colorStyles = useMemo(() => {
    return {
      paperInput: {
        color: themeColor ? themeStyles.theme.colors[themeColor] : themeStyles.theme.colors.onBackground,
        backgroundColor: themeColor ? themeStyles.theme.colors[`${themeColor}Container`] : themeStyles.theme.colors.background
      },
      nativeInput: {
        color: themeColor ? themeStyles.theme.colors[themeColor] : themeStyles.theme.colors.onBackground,
        backgroundColor: themeColor ? themeStyles.theme.colors[`${themeColor}Container`] : themeStyles.theme.colors.background
      }
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
        inputMode: 'decimal',
        keyboardType: 'decimal-pad',
        secureTextEntry: false,
        importantForAutofill: 'no',
        returnKeyType: 'send'
      }
    } else {
      return {}
    }
  }, [keyboard])
  const renderInput = useCallback((props) => {
    console.log('renderInput', fieldId, keyboard, keyboardOptions?.inputMode)
    return (
      <NativeTextInput
        {...keyboardOptions}

        {...props}

        ref={innerRef}

        value={innerValue || ' '}

        style={[colorStyles.nativeInput, ...props.style, textStyle, { backgroundColor: undefined }]}
        placeholderTextColor={themeStyles.theme.colors.outline}

        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={false} // Prevent keyboard from hiding
        onKeyPress={onKeyPress}
        onChange={handleChange}
      />
    )
  }, [innerRef, textStyle, themeStyles, onSubmitEditing, onKeyPress, handleChange, innerValue, keyboardOptions, colorStyles])

  return (
    <TextInput
      style={[colorStyles.paperInput, style, { paddingVertical: 0 }]}
      textColor={colorStyles.paperInput.color}
      selectionColor={colorStyles.paperInput.color}
      underlineColor={colorStyles.paperInput.color}
      activeUnderlineColor={colorStyles.paperInput.color}
      mode={'flat'}
      dense={true}
      underlineStyle={extraStyles.underline}
      value={innerValue || ' '}
      label={label}
      placeholder={placeholder}
      // onFocus={handleFocus}
      // onBlur={handleBlur}
      render={renderInput}
      error={error}
    />
  )
}

const extraStyles = StyleSheet.create({
  underline: {
    marginTop: 0,
    borderRadius: 30
  }
})
