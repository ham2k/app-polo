import React, { useCallback, useEffect, useState } from 'react'

import ThemedTextInput from './ThemedTextInput'

import debounce from 'debounce'

const REMOVE_NON_DIGITS_REGEX = /[^0-9.]/g

function reportChange ({ text, onChange, onChangeText, fieldId }) {
  onChangeText && onChangeText(text)
  onChange && onChange({ nativeEvent: { text }, fieldId })
}

const debouncedReportChange = debounce(reportChange, 1500)

export default function FrequencyInput (props) {
  const { value, styles, textStyle, onChange, onChangeText, fieldId } = props

  const [innerValue, setInnerValue] = useState(value)
  useEffect(() => {
    setInnerValue(`${value}`)
  }, [value])

  const handleChange = useCallback((event) => {
    let { text } = event.nativeEvent
    text = text.replace(REMOVE_NON_DIGITS_REGEX, '')
    setInnerValue(text)
    debouncedReportChange({ text, onChange, onChangeText, fieldId })
  }, [fieldId, onChange, onChangeText])

  const handleBlur = useCallback((event) => {
    const newEvent = { nativeEvent: { text: innerValue, target: event?.nativeEvent?.target } }

    onChangeText && onChangeText(innerValue)
    onChange && onChange({ ...newEvent, fieldId })
  }, [fieldId, innerValue, onChange, onChangeText])

  return (
    <ThemedTextInput
      {...props}
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
