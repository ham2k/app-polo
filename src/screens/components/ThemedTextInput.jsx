import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { TextInput } from 'react-native-paper'
import { TextInput as NativeTextInput, StyleSheet } from 'react-native'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

const LEFT_TRIM_REGEX = /^\s+/

export default function ThemedTextInput ({ style, textStyle, themeColor, label, placeholder, value, onChangeText, onChange, onSubmitEditing, innerRef, fieldId, uppercase, error }) {
  const themeStyles = useThemedStyles()

  const [localValue, setLocalValue] = useState()

  themeColor = themeColor ?? 'primary'

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = useCallback((event) => {
    let { text } = event.nativeEvent

    if (uppercase) {
      text = text.toUpperCase()
    }
    text = text.replace(LEFT_TRIM_REGEX, '')

    event.nativeEvent.text = text
    setLocalValue(text)

    onChangeText && onChangeText(text)
    onChange && onChange({ ...event, fieldId })
  }, [setLocalValue, onChangeText, onChange, fieldId, uppercase])

  // const handleFocus = useCallback(() => {
  //   if (value === ' ') { setLocalValue('') }
  // }, [setLocalValue, value])

  // const handleBlur = useCallback(() => {
  //   if (!value) { setLocalValue('') }
  // }, [setLocalValue, value])

  const colorStyles = useMemo(() => {
    return {
      paperInput: {
        color: themeStyles.theme.colors[themeColor],
        backgroundColor: themeStyles.theme.colors[`${themeColor}Container`]
      },
      nativeInput: {
        color: themeStyles.theme.colors[themeColor],
        backgroundColor: themeStyles.theme.colors[`${themeColor}Container`]
      }
    }
  }, [themeStyles, themeColor])

  const renderInput = useCallback((props) => {
    return (
      <NativeTextInput
        {...props}
        ref={innerRef}
        autoCapitalize={'none'}
        autoComplete={'off'}
        autoCorrect={false}
        spellCheck={false}
        textContentType={'none'}
        returnKeyType={'send'}
        inputMode={'text'}
        style={[...props.style, textStyle]}
        placeholderTextColor={themeStyles.theme.colors.outline}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={false} // Prevent keyboard from hiding
      />
    )
  }, [themeStyles, onSubmitEditing, innerRef, textStyle])

  return (
    <TextInput
      style={[colorStyles.paperInput, style, { paddingVertical: 0 }]}
      textColor={themeStyles.theme.colors[themeColor]}
      selectionColor={themeStyles.theme.colors[themeColor]}
      underlineColor={themeStyles.theme.colors[themeColor]}
      activeUnderlineColor={themeStyles.theme.colors[themeColor]}
      mode={'flat'}
      dense={true}
      underlineStyle={extraStyles.underline}
      value={localValue ?? ' '}
      label={label}
      placeholder={placeholder}
      onChange={handleChange}
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
