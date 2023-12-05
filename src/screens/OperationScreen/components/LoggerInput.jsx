import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { TextInput } from 'react-native-paper'
import { TextInput as NativeTextInput, StyleSheet } from 'react-native'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'

const LEFT_TRIM_REGEX = /^\s+/

export default function LoggerInput ({ style, baseColor, label, placeholder, value, onChangeText, uppercase }) {
  const themeStyles = useThemedStyles()

  const [localValue, setLocalValue] = useState(value)

  baseColor = baseColor ?? 'primary'

  useEffect(() => {
    if (!value) setLocalValue(' ')
  }, [value])

  const handleChange = useCallback((text) => {
    if (uppercase) text = text.toUpperCase()
    text = text.replace(LEFT_TRIM_REGEX, '')
    setLocalValue(text)
    onChangeText && onChangeText(text)
  }, [setLocalValue, onChangeText, uppercase])

  const handleFocus = useCallback(() => {
    if (!value) { setLocalValue('') }
  }, [setLocalValue, value])

  const handleBlur = useCallback(() => {
    if (!value) { setLocalValue(' ') }
  }, [setLocalValue, value])

  const colorStyles = useMemo(() => {
    return {
      paperInput: {
        color: themeStyles.theme.colors[baseColor],
        backgroundColor: themeStyles.theme.colors[`${baseColor}Container`]
      },
      nativeInput: {
        color: themeStyles.theme.colors[baseColor],
        backgroundColor: themeStyles.theme.colors[`${baseColor}Container`]
      }
    }
  }, [themeStyles, baseColor])

  const renderInput = useCallback((props) => {
    return (
      <NativeTextInput
        {...props}
        autoCapitalize={'none'}
        autoComplete={'off'}
        autoCorrect={false}
        spellCheck={false}
        textContentType={'none'}
        returnKeyType={'send'}
        inputMode={'text'}
        placeholderTextColor={themeStyles.theme.colors.outline}
        // keyboardType={'default'}
      />
    )
  }, [themeStyles])

  return (
    <TextInput
      style={[colorStyles.paperInput, style, { paddingVertical: 0 }]}
      textColor={themeStyles.theme.colors[baseColor]}
      selectionColor={themeStyles.theme.colors[baseColor]}
      underlineColor={themeStyles.theme.colors[baseColor]}
      activeUnderlineColor={themeStyles.theme.colors[baseColor]}
      mode={'flat'}
      dense={true}
      underlineStyle={extraStyles.underline}
      value={localValue ?? ' '}
      label={label}
      placeholder={placeholder}
      onChangeText={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      render={renderInput}
    />
  )
}

const extraStyles = StyleSheet.create({
  underline: {
    marginTop: 0,
    borderRadius: 30
  }
})
