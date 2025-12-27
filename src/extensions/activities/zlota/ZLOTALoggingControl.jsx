/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { filterRefs, refsToString, replaceRefs, stringToRefs } from '../../../tools/refTools'

import { Info } from './ZLOTAInfo'
import ZLOTAInput from './ZLOTAInput'

const MATCH_SYMBOLS_REGEX = /[ ,.]+$/

export function ZLOTALoggingControl (props) {
  const { qso, updateQSO, style, styles } = props

  const { t } = useTranslation()

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 200) }, [])

  const refsString = useMemo(() => {
    const refs = filterRefs(qso, Info.huntingType)
    return refsToString(refs, Info.huntingType).replaceAll(' ', '')
  }, [qso])

  const [innerValue, setInnerValue] = useState(refsString)
  useEffect(() => {
    if (refsString?.replace(MATCH_SYMBOLS_REGEX, '') !== innerValue?.replace(MATCH_SYMBOLS_REGEX, '')) {
      setInnerValue(refsString)
    }
  }, [refsString, innerValue])

  const handleChangeText = useCallback((value) => {
    let refs = stringToRefs(Info.huntingType, value)
    refs = refs.map(r => ({ ...r, label: `${Info.shortName} ${r.ref}` }))

    setInnerValue(value)
    updateQSO({ refs: replaceRefs(qso?.refs, Info.huntingType, refs) })
  }, [qso, updateQSO])

  return (
    <ZLOTAInput
      {...props}
      innerRef={ref}
      style={[style, { maxWidth: '95%', minWidth: styles.oneSpace * 30, width: Math.max(16, refsString?.length || 0) * styles.oneSpace * 1.3 }]}
      value={innerValue}
      label={t('extensions.zlota.loggingControl.theirRefLabel', 'Their Reference')}
      onChangeText={handleChangeText}
    />
  )
}
