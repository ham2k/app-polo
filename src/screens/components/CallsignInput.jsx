import React, { useMemo } from 'react'

import { parseCallsign } from '@ham2k/lib-callsigns'

import ThemedTextInput from './ThemedTextInput'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export default function CallsignInput (props) {
  const { value, textStyle } = props
  const styles = useThemedStyles()

  const isValid = useMemo(() => {
    if (value === '3RR0R') {
      throw new Error('Test error')
    }
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
