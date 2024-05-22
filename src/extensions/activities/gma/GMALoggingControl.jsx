/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'

import { filterRefs, refsToString, replaceRefs, stringToRefs } from '../../../tools/refTools'
import { Info } from './GMAInfo'
import GMAInput from './GMAInput'

export function GMALoggingControl (props) {
  const { qso, updateQSO, style, styles } = props

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
    const refs = stringToRefs(Info.huntingType, value)

    updateQSO({ refs: replaceRefs(qso?.refs, Info.huntingType, refs) })
  }, [qso, updateQSO])

  return (
    <GMAInput
      {...props}
      innerRef={ref}
      style={[style, { minWidth: 16 * styles.oneSpace }]}
      value={localValue}
      label="Their GMA"
      onChangeText={localHandleChangeText}
    />
  )
}
