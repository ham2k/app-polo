import React, { useCallback, useMemo } from 'react'

import { parseCallsign } from '@ham2k/lib-callsigns'

import ThemedTextInput from './ThemedTextInput'

const ADD_DASHES_REGEX = /([A-Z]+)(\d+)/g
const ADD_COMMAS_REGEX = /(\d+)\s*[,]*\s*([A-Z]+)/g
const REPEAT_COUNTRY_REGEX = /(\w+)-(\d+)(\s+,\s*|,\s*|\s+)(\d+)/g

export default function POTAInput (params) {
  const { value, styles, textStyle, onChange, onChangeText, fieldId } = params

  const isValid = useMemo(() => {
    const callInfo = parseCallsign(value)
    if (callInfo?.baseCall) {
      return true
    } else {
      return false
    }
  }, [value])

  const handleChange = useCallback((event) => {
    let { text } = event.nativeEvent
    text = text.replace(ADD_DASHES_REGEX, (match, p1, p2) => `${p1}-${p2}`)
    text = text.replace(ADD_COMMAS_REGEX, (match, p1, p2) => `${p1}, ${p2}`)
    text = text.replace(REPEAT_COUNTRY_REGEX, (match, p1, p2, p3, p4) => `${p1}-${p2}, ${p1}-${p4}`)

    event.nativeEvent.text = text

    onChangeText && onChangeText(text)
    onChange && onChange({ ...event, fieldId })
  }, [onChange, onChangeText, fieldId])

  return (
    <ThemedTextInput
      {...params}
      keyboard="dumb"
      uppercase={true}
      nospaces={true}
      error={!isValid}
      textStyle={[textStyle, styles?.text?.callsign]}
      onChange={handleChange}
    />
  )
}
