/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { filterRefs, refsToString, replaceRefs, stringToRefs } from '../../../tools/refTools'

import { Info } from './SiOTAInfo'
import SiOTAInput from './SiOTAInput'

export function SiOTALoggingControl (props) {
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
    <SiOTAInput
      {...props}
      innerRef={ref}
      style={[style, { minWidth: 16 * styles.oneSpace }]}
      value={refsString}
      label={t('extensions.siota.loggingControl.theirRefLabel', 'Their Silo')}
      onChangeText={handleChangeText}
    />
  )
}
