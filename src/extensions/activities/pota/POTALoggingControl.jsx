/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

import { filterRefs, refsToString, replaceRefs, stringToRefs } from '../../../tools/refTools'
import { selectOperationCallInfo } from '../../../store/operations'

import { Info } from './POTAInfo'
import { potaPrefixForDXCCCode } from './POTAAllParksData'
import POTAInput from './POTAInput'

export function POTALoggingControl (props) {
  const { qso, operation, updateQSO, style, styles } = props

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

    updateQSO({ refs: replaceRefs(qso?.refs, Info.huntingType, refs) })
  }, [qso, updateQSO])

  const defaultPrefix = useMemo(() => {
    if (qso?.their?.guess?.dxccCode) {
      return potaPrefixForDXCCCode(qso?.their.guess.dxccCode) ?? '?'
    } else if (ourInfo?.dxccCode) {
      return potaPrefixForDXCCCode(ourInfo?.dxccCode) ?? '?'
    } else {
      return '?'
    }
  }, [qso?.their?.guess?.dxccCode, ourInfo?.dxccCode])

  return (
    <POTAInput
      {...props}
      innerRef={ref}
      style={[style, { maxWidth: '95%', minWidth: styles.oneSpace * 30, width: Math.max(16, localValue?.length || 0) * styles.oneSpace * 1.3 }]}
      contentStyle={[]}
      value={localValue}
      label="Their POTA"
      defaultPrefix={defaultPrefix}
      onChangeText={localHandleChangeText}
    />
  )
}
