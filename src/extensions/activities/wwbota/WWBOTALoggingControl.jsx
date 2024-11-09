/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useSelector } from 'react-redux'

import { filterRefs, refsToString, replaceRefs, stringToRefs } from '../../../tools/refTools'
import { selectOperationCallInfo } from '../../../store/operations'

import { Info } from './WWBOTAInfo'
import WWBOTAInput from './WWBOTAInput'

export function WWBOTALoggingControl (props) {
  const { qso, operation, updateQSO, style, styles } = props

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 0) }, [])

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const refsString = useMemo(() => {
    const refs = filterRefs(qso, Info.huntingType)
    return refsToString(refs, Info.huntingType)
  }, [qso])

  const handleChangeText = useCallback((value) => {
    const refs = stringToRefs(Info.huntingType, value)

    updateQSO({ refs: replaceRefs(qso?.refs, Info.huntingType, refs) })
  }, [qso, updateQSO])

  const defaultPrefix = useMemo(() => {
    if (qso?.their?.guess?.entityPrefix) {
      const prefix = qso?.their?.guess?.entityPrefix
      return `B/${prefix === 'I' ? 'IT' : prefix}`
    } else if (ourInfo?.entityPrefix) {
      return `B/${ourInfo?.entityPrefix}`
    } else {
      return 'B/?'
    }
  }, [qso?.their?.guess?.entityPrefix, ourInfo?.entityPrefix])

  return (
    <WWBOTAInput
      {...props}
      innerRef={ref}
      style={[style, { maxWidth: '95%', minWidth: styles.oneSpace * 30, width: Math.max(16, refsString?.length || 0) * styles.oneSpace * 1.3 }]}
      value={refsString}
      label="Their Bunker"
      defaultPrefix={defaultPrefix}
      onChangeText={handleChangeText}
    />
  )
}
