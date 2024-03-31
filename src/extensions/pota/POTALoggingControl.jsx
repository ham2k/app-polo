import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { filterRefs, refsToString, replaceRefs, stringToRefs } from '../../tools/refTools'
import { POTAAllParks } from './POTAAllParksData'
import { Info } from './POTAInfo'
import POTAInput from './POTAInput'
import { useSelector } from 'react-redux'
import { selectOperationCallInfo } from '../../store/operations'

export function POTALoggingControl (props) {
  const { qso, operation, setQSO, style, styles } = props

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 0) }, [])

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

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
      return POTAAllParks.prefixByDXCCCode[qso?.their.guess.dxccCode] ?? '?'
    } else if (ourInfo?.dxccCode) {
      return POTAAllParks.prefixByDXCCCode[ourInfo?.dxccCode] ?? '?'
    } else {
      return '?'
    }
  }, [qso?.their?.guess?.dxccCode, ourInfo?.dxccCode])

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
