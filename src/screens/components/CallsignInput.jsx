import React, { useMemo } from 'react'

import { parseCallsign } from '@ham2k/lib-callsigns'

import ThemedTextInput from './ThemedTextInput'

export default function CallsignInput (props) {
  const { value, styles, textStyle } = props

  const isValid = useMemo(() => {
    const callInfo = parseCallsign(value)
    if (callInfo?.baseCall) {
      return true
    } else {
      return false
    }
  }, [value])

  return (
    <ThemedTextInput
      {...props}
      keyboard="dumb"
      uppercase={true}
      noSpaces={true}
      error={value && !isValid}
      textStyle={[textStyle, styles?.text?.callsign]}
    />
  )
}
