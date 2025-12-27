/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { filterRefs, refsToString, replaceRefs, stringToRefs } from '../../../tools/refTools'
import { selectOperationCallInfo } from '../../../store/operations'

import { Info } from './POTAInfo'
import { potaPrefixForDXCCCode } from './POTAAllParksData'
import POTAInput from './POTAInput'

const MATCH_SYMBOLS_REGEX = /[ ,.]+$/

export function POTALoggingControl (props) {
  const { qso, operation, updateQSO, style, styles } = props

  const { t } = useTranslation()

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 200) }, [])

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const refsString = useMemo(() => {
    const refs = filterRefs(qso, Info.huntingType)
    return refsToString(refs, Info.huntingType).replaceAll(' ', '')
  }, [qso])

  const [innerValue, setInnerValue] = useState(refsString)
  useEffect(() => {
    if (refsString.replace(MATCH_SYMBOLS_REGEX, '') !== innerValue.replace(MATCH_SYMBOLS_REGEX, '')) {
      setInnerValue(refsString)
    }
  }, [refsString, innerValue])

  const handleChangeText = useCallback((value) => {
    let refs = stringToRefs(Info.huntingType, value)
    refs = refs.map(r => ({ ...r, label: `${Info.shortName} ${r.ref}` }))

    setInnerValue(value)
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
      style={[style, { maxWidth: '95%', minWidth: styles.oneSpace * 30, width: Math.max(16, refsString?.length || 0) * styles.oneSpace * 1.3 }]}
      contentStyle={[]}
      value={innerValue}
      fieldId="potaReference"
      label={t('extensions.pota.loggingControl.theirRefLabel', 'Their POTA')}
      defaultPrefix={defaultPrefix}
      onChangeText={handleChangeText}
    />
  )
}
