/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react'

import { filterRefs, refsToString, replaceRefs, stringToRefs } from '../../../tools/refTools'

import { Info } from './WWFFInfo'
import { WWFFData } from './WWFFDataFile'
import WWFFInput from './WWFFInput'

export function WWFFLoggingControl (props) {
  const { qso, updateQSO, style, styles } = props

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 200) }, [])

  const refsString = useMemo(() => {
    const refs = filterRefs(qso, Info.huntingType)
    return refsToString(refs, Info.huntingType)
  }, [qso])

  const handleChangeText = useCallback((value) => {
    const refs = stringToRefs(Info.huntingType, value)

    updateQSO({ refs: replaceRefs(qso?.refs, Info.huntingType, refs) })
  }, [qso, updateQSO])

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
      value={refsString}
      label="Their WWFF"
      defaultPrefix={defaultPrefix}
      onChangeText={handleChangeText}
    />
  )
}
