import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { filterRefs, refsToString, replaceRefs, stringToRefs } from '../../tools/refTools'
import { WWFFData } from './WWFFDataFile'
import { INFO } from './WWFFInfo'
import WWFFInput from './WWFFInput'

export function WWFFLoggingControl (props) {
  const { qso, setQSO, style, styles } = props

  const ref = useRef()
  useEffect(() => {
    setTimeout(() => {
      ref?.current?.focus()
    }, 0)
  }, [ref])

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
      return WWFFData.prefixByDXCCCode[qso?.their.guess.dxccCode] ?? 'KFF'
    } else {
      return 'KFF'
    }
  }, [qso?.their?.guess?.dxccCode])

  return (
    <WWFFInput
      {...props}
      innerRef={ref}
      style={[style, { minWidth: 16 * styles.oneSpace }]}
      value={localValue}
      label="Their WWFF"
      defaultPrefix={defaultPrefix}
      onChangeText={localHandleChangeText}
    />
  )
}
