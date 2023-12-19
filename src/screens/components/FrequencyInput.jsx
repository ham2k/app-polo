import React, { useCallback, useEffect, useState } from 'react'

import ThemedTextInput from './ThemedTextInput'
import { fmtFreqInMHz } from '../../tools/frequencyFormats'

const REMOVE_NON_DIGITS_REGEX = /[^0-9.,]/g

export default function FrequencyInput (params) {
  const { value, styles, textStyle, onChange, onChangeText, fieldId } = params

  const [innerValue, setInnerValue] = useState()
  useEffect(() => {
    setInnerValue(value)
    // const incomingValue = fmtFreqInMHz(value)
    // if (incomingValue !== innerValue) {
    //   setInnerValue(incomingValue)
    // }
  }, [value, innerValue])

  const handleChange = useCallback((event) => {
    let { text } = event.nativeEvent
    text = text.replace(REMOVE_NON_DIGITS_REGEX, '')

    event.nativeEvent.text = text
    setInnerValue(text)
    onChangeText && onChangeText(text)
    onChange && onChange({ ...event, fieldId })
  }, [onChange, onChangeText, fieldId])

  return (
    <ThemedTextInput
      {...params}
      value={innerValue}
      keyboard="numbers"
      decimal={true}
      textStyle={[textStyle, styles?.text?.callsign]}
      onChange={handleChange}
    />
  )
}
