// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback, useEffect, useMemo, useRef } from 'react'

import { filterRefs, refsToString, replaceRefs, stringToRefs } from '@ham2k/lib-qson-tools'

import { Info } from './GMAInfo'
import GMAInput from './GMAInput'

export function GMALoggingControl (props) {
  const { qso, updateQSO, style, styles } = props

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 200) }, [])

  const refsString = useMemo(() => {
    const refs = filterRefs(qso, Info.huntingType)
    return refsToString(refs, Info.huntingType)
  }, [qso])

  const handleChangeText = useCallback((value) => {
    let refs = stringToRefs(Info.huntingType, value)
    refs = refs.map(r => ({ ...r, label: `${Info.shortName} ${r.ref}` }))

    updateQSO({ refs: replaceRefs(qso?.refs, Info.huntingType, refs) })
  }, [qso, updateQSO])

  return (
    <GMAInput
      {...props}
      innerRef={ref}
      style={[style, { minWidth: 16 * styles.oneSpace }]}
      value={refsString}
      label="Their GMA"
      onChangeText={handleChangeText}
    />
  )
}
