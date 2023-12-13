import React, { useCallback, useState } from 'react'

import { parseCallsign } from '@ham2k/lib-callsigns'

import ThemedTextInput from './ThemedTextInput'

export default function CallsignInput (params) {
  const { onChange, onChangeText, fieldId, onChangeCall } = params

  const [isValid, setIsValid] = useState(false)

  const handleChange = useCallback((event) => {
    let { text } = event.nativeEvent

    text = text.toUpperCase().trim()

    event.nativeEvent.text = text

    const callInfo = parseCallsign(text)
    if (callInfo?.baseCall) {
      setIsValid(true)
      onChangeCall && onChangeCall(callInfo)
    } else {
      setIsValid(false)
      onChangeCall && onChangeCall({})
    }
    console.log(callInfo)

    onChangeText && onChangeText(text)
    onChange && onChange({ ...event, fieldId })
  }, [onChangeText, onChange, onChangeCall, fieldId])

  return (
    <ThemedTextInput {...params} onChange={handleChange} onChangeText={undefined} error={!isValid} />
  )
}
