// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { filterRefs, refsToString, replaceRefs, stringToRefs } from '@ham2k/lib-qson-tools'

import { Info } from './TOTAInfo'
import TOTAInput from './TOTAInput'

export function TOTALoggingControl (props) {
  const { qso, updateQSO, style, styles } = props

  const { t } = useTranslation()

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
    <TOTAInput
      {...props}
      innerRef={ref}
      style={[style, { minWidth: 16 * styles.oneSpace }]}
      value={refsString}
      label={t('extensions.tota.loggingControl.theirRefLabel', 'Their TOTA')}
      onChangeText={handleChangeText}
    />
  )
}
