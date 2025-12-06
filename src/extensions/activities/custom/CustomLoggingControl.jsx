/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { filterRefs, findRef, refsToString, replaceRefs, stringToRefs } from '../../../tools/refTools'
import { Info } from './CustomInfo'
import CustomInput from './CustomInput'

export function CustomLoggingControl (props) {
  const { qso, operation, updateQSO, style, styles } = props

  const { t } = useTranslation()

  const ref = useRef()
  useEffect(() => {
    setTimeout(() => {
      ref?.current?.focus()
    }, 200)
  }, [ref])

  const refsString = useMemo(() => {
    const activationRef = findRef(operation, Info.activationType)
    let refs = filterRefs(qso, Info.huntingType)
    refs = refs.map(r => ({ ...r, label: `${activationRef.mySig} ${r.ref}` }))

    return refsToString(refs, Info.huntingType)
  }, [qso, operation])

  const handleChangeText = useCallback((value) => {
    let refs = stringToRefs(Info.huntingType, value, { regex: Info.referenceRegex })
    refs = refs.map(r => ({ ...r, label: `${Info.shortName} ${r.ref}` }))

    updateQSO({ refs: replaceRefs(qso?.refs, Info.huntingType, refs) })
  }, [qso, updateQSO])

  return (
    <CustomInput
      {...props}
      innerRef={ref}
      style={[style, { minWidth: 16 * styles.oneSpace }]}
      value={refsString}
      label={t('extensions.custom.theirRefLabel', 'Their Ref')}
      onChangeText={handleChangeText}
    />
  )
}
