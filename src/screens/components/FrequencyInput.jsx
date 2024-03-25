import React, { useCallback, useEffect, useRef, useState } from 'react'

import ThemedTextInput from './ThemedTextInput'

const REMOVE_NON_DIGITS_REGEX = /[^0-9.]/g

export default function FrequencyInput (props) {
  const { value, styles, textStyle, onChange, onChangeText, fieldId, onBlur, innerRef } = props

  const localRef = useRef()
  const actualInnerRef = innerRef ?? localRef

  const [localValue, setLocalValue] = useState()

  useEffect(() => {
    if (actualInnerRef?.current?.isFocused()) return

    setLocalValue(value ?? '')
  }, [value, actualInnerRef])

  const handleBlur = useCallback((event) => {
    setLocalValue(value)
    onBlur && onBlur(event)
  }, [value, onBlur])

  const handleChange = useCallback((event) => {
    let { text } = event.nativeEvent
    text = text.replace(REMOVE_NON_DIGITS_REGEX, '')
    setLocalValue(text)

    if (text !== value) {
      onChangeText && onChangeText(text)
      onChange && onChange({ nativeEvent: { text }, fieldId })
    }
  }, [fieldId, onChange, onChangeText, value])

  return (
    <ThemedTextInput
      {...props}
      value={localValue ?? ' '}
      keyboard="numbers"
      decimal={true}
      textStyle={[textStyle, styles?.text?.callsign]}
      onChange={handleChange}
      onBlur={handleBlur}
      onEndEditing={handleBlur}
    />
  )
}
