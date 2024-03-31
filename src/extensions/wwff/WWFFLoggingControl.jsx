import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { filterRefs, refsToString, replaceRefs, stringToRefs } from '../../tools/refTools'
import { WWFFData } from './WWFFDataFile'
import { Info } from './WWFFInfo'
import WWFFInput from './WWFFInput'

export function WWFFLoggingControl (props) {
  const { qso, setQSO, style, styles } = props

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 0) }, [])

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
