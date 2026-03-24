/*
 * Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useRef } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'

import GLOBAL from '../../../../../../GLOBAL'

import { H2kTextInput } from '../../../../../../ui'

const RigControl = ({ qso, operation, settings, disabled, icon, style, styles, themeColor, handleFieldChange, onSubmitEditing, focusedRef }) => {
  const { t } = useTranslation()

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 200) }, [])

  return (
    <View style={[style, { flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }]}>
      <H2kTextInput
        innerRef={ref}
        themeColor={themeColor}
        style={[styles.input, { minWidth: styles.oneSpace * 10, width: '100%' }]}
        value={qso?.rig ?? ''}
        disabled={disabled}
        label={t('screens.opLoggingTab.rigLabel', 'Rig')}
        placeholder=""
        onChange={handleFieldChange}
        onSubmitEditing={onSubmitEditing}
        fieldId={'rig'}
        focusedRef={focusedRef}
        keyboard="dumb"
      />
    </View>
  )
}

export const rigControl = {
  key: 'rig',
  icon: 'radio',
  order: 4,
  label: ({ qso, operation, settings }) => {
    if (qso?.rig) {
      return qso.rig
    } else {
      return GLOBAL?.t?.('screens.opLoggingTab.rigLabel', 'Rig') || 'Rig'
    }
  },
  accessibilityLabel: GLOBAL?.t?.('screens.opLoggingTab.rigControls-a11y', 'Rig Controls') || 'Rig Controls',
  InputComponent: RigControl,
  inputWidthMultiplier: 30,
  optionType: 'optional'
}
