import React, { useCallback, useEffect, useState } from 'react'

import ThemedTextInput from './ThemedTextInput'

const REMOVE_NON_DIGITS_REGEX = /[^0-9.]/g

export default function FrequencyInput (params) {
  const { value, styles, textStyle, onChange, onChangeText, fieldId } = params

  const [innerValue, setInnerValue] = useState(value)
  useEffect(() => {
    setInnerValue(`${value}`)
  }, [value])

  const handleChange = useCallback((event) => {
    let { text } = event.nativeEvent
    text = text.replace(REMOVE_NON_DIGITS_REGEX, '')
    setInnerValue(text)
  }, [])

  const handleBlur = useCallback((event) => {
    const newEvent = { nativeEvent: { text: innerValue, target: event.nativeEvent.target } }

    onChangeText && onChangeText(innerValue)
    onChange && onChange({ ...newEvent, fieldId })
  }, [fieldId, innerValue, onChange, onChangeText])

  return (
    <ThemedTextInput
      {...params}
      value={innerValue ?? ' '}
      keyboard="numbers"
      decimal={true}
      textStyle={[textStyle, styles?.text?.callsign]}
      onChange={handleChange}
      // onBlur={handleBlur}
      onEndEditing={handleBlur}
    />
  )
}
