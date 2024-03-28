import React, { useCallback, useEffect, useRef, useState } from 'react'

import { filterRefs, refsToString, replaceRefs, stringToRefs } from '../../tools/refTools'
import { Info } from './SOTAInfo'
import SOTAInput from './SOTAInput'

export function SOTALoggingControl (props) {
  const { qso, setQSO, style, styles } = props

  const ref = useRef()
  useEffect(() => {
    setTimeout(() => {
      ref?.current?.focus()
    }, 0)
  }, [])

  const [localValue, setLocalValue] = useState('')

  // Only initialize localValue once
  useEffect(() => {
    const refs = filterRefs(qso, Info.huntingType)
    if (!localValue) {
      setLocalValue(refsToString(refs, Info.huntingType))
    }
  }, [qso, localValue])

  const localHandleChangeText = useCallback((value) => {
    setLocalValue(value)
    const refs = stringToRefs(Info.huntingType, value, { regex: Info.referenceRegex })

    setQSO({ ...qso, refs: replaceRefs(qso?.refs, Info.huntingType, refs) })
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
