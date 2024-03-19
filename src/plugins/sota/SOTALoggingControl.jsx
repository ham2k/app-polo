import React, { useCallback, useEffect, useRef, useState } from 'react'

import { filterRefs, refsToString, replaceRefs, stringToRefs } from '../../tools/refTools'
import { INFO } from './SOTAInfo'
import SOTAInput from './SOTAInput'

export function SOTALoggingControl (props) {
  const { qso, setQSO, style, styles } = props

  const ref = useRef()
  useEffect(() => {
    ref?.current?.focus()
  }, [])

  const [localValue, setLocalValue] = useState('')

  // Only initialize localValue once
  useEffect(() => {
    const refs = filterRefs(qso, INFO.huntingType)
    if (!localValue) {
      setLocalValue(refsToString(refs, INFO.huntingType))
    }
  }, [qso, localValue])

  const localHandleChangeText = useCallback((value) => {
    setLocalValue(value)
    const refs = stringToRefs(INFO.huntingType, value, { regex: INFO.referenceRegex })

    setQSO({ ...qso, refs: replaceRefs(qso?.refs, INFO.huntingType, refs) })
  }, [qso, setQSO])

  return (
    <SOTAInput
      {...props}
      innerRef={ref}
      style={[style, { minWidth: 16 * styles.oneSpace }]}
      value={localValue}
      label="Their SOTA"
      onChangeText={localHandleChangeText}
    />
  )
}
