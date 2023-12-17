import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { parseCallsign } from '@ham2k/lib-callsigns'

import ThemedTextInput from './ThemedTextInput'

export default function CallsignInput (params) {
  const { value, styles, textStyle } = params

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
      {...params}
      uppercase={true}
      nospaces={true}
      error={!isValid}
      textStyle={[textStyle, styles?.text?.callsign]}
    />
  )
}
