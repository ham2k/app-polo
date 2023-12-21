/* eslint-disable no-shadow */
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { TextInput } from 'react-native-paper'
import { TextInput as NativeTextInput, StyleSheet } from 'react-native'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

const LEFT_TRIM_REGEX = /^\s+/
const SPACES_REGEX = /\s/g
const ONLY_SPACES_REGEX = /^\s+$/g
const NUMBER_WITH_SIGNS_REGEX = /[^0-9+-]/g
const NUMBER_WITH_SIGNS_AND_PERIODS_REGEX = /[^0-9+-,.]/g
const SIGN_AFTER_A_DIGIT_REGEX = /([\d,.])[+-]/g

export default function ThemedTextInput (props) {
  const {
    style, textStyle, themeColor,
    label, placeholder, value, error,
    onChangeText, onChange, onSubmitEditing, onKeyPress,
    innerRef, fieldId,
    uppercase, trim, noSpaces, numeric, decimal,
    keyboard
  } = props
  const themeStyles = useThemedStyles()
  const [previousValue, setPreviousValue] = useState(value)

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
    onChange && onChange({ ...event, fieldId })
    if (spaceAdded) {
      onKeyPress && onKeyPress({ nativeEvent: { key: ' ', target: event.nativeEvent.target } })
    }
  }, [onChangeText, onChange, fieldId, uppercase, noSpaces, numeric, decimal, trim, previousValue, onKeyPress])

  const colorStyles = useMemo(() => {
    return {
      paperInput: {
        color: themeColor ? themeStyles.theme.colors[themeColor] : themeStyles.theme.colors.onBackground,
        backgroundColor: themeColor ? themeStyles.theme.colors[`${themeColor}Container`] : themeStyles.theme.colors.background
      },
      nativeInput: {
        color: themeColor ? themeStyles.theme.colors[themeColor] : themeStyles.theme.colors.onBackground,
        backgroundColor: themeColor ? themeStyles.theme.colors[`${themeColor}Container`] : themeStyles.theme.colors.background
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

        ref={innerRef}

        value={strValue || ''}
        placeholder={placeholder}
        style={[colorStyles.nativeInput, ...props.style, textStyle, { backgroundColor: undefined }]}
        placeholderTextColor={themeStyles.theme.colors.onBackgroundLighter}
        cursorColor={colorStyles.cursorColor}
        selectionColor={colorStyles.sectionColor}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={false} // Prevent keyboard from hiding
        onKeyPress={onKeyPress}
        onChange={handleChange}
        onChangeText={undefined}
      />
    )
  }, [keyboardOptions, innerRef, strValue, colorStyles, textStyle, themeStyles, onSubmitEditing, onKeyPress, handleChange, placeholder])

  return (
    <TextInput
      {...props}
      style={[colorStyles.paperInput, style, { paddingVertical: 0 }]}
      textColor={colorStyles.paperInput.color}
      selectionColor={colorStyles.paperInput.color}
      underlineColor={colorStyles.paperInput.color}
      activeUnderlineColor={colorStyles.paperInput.color}
      mode={'flat'}
      dense={true}
      underlineStyle={extraStyles.underline}
      value={value || ' '}
      label={label}
      placeholder={placeholder}
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
