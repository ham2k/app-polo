import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { filterRefs, refsToString, replaceRefs, stringToRefs } from '../../tools/refTools'
import { POTAAllParks } from './POTAAllParksData'
import { INFO } from './POTAInfo'
import POTAInput from './POTAInput'

export function POTALoggingControl (props) {
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

  const defaultPrefix = useMemo(() => {
    if (qso?.their?.guess?.dxccCode) {
      return POTAAllParks.prefixByDXCCCode[qso?.their.guess.dxccCode] ?? 'K'
    } else {
      return 'K'
    }
  }, [qso?.their?.guess?.dxccCode])

  return (
    <POTAInput
      {...props}
      innerRef={ref}
      style={[style, { minWidth: 16 * styles.oneSpace }]}
      value={localValue}
      label="Their POTA"
      defaultPrefix={defaultPrefix}
      onChangeText={localHandleChangeText}
    />
  )
}
