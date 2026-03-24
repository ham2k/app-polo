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

const AntennaControl = ({ qso, operation, settings, disabled, icon, style, styles, themeColor, handleFieldChange, onSubmitEditing, focusedRef }) => {
  const { t } = useTranslation()

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 200) }, [])

  return (
    <View style={[style, { flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }]}>
      <H2kTextInput
        innerRef={ref}
        themeColor={themeColor}
        style={[styles.input, { minWidth: styles.oneSpace * 10, width: '100%' }]}
        value={qso?.antenna ?? ''}
        disabled={disabled}
        label={t('screens.opLoggingTab.antennaLabel', 'Antenna')}
        placeholder=""
        onChange={handleFieldChange}
        onSubmitEditing={onSubmitEditing}
        fieldId={'antenna'}
        focusedRef={focusedRef}
        keyboard="dumb"
      />
    </View>
  )
}

export const antennaControl = {
  key: 'antenna',
  icon: 'antenna',
  order: 5,
  label: ({ qso, operation, settings }) => {
    if (qso?.antenna) {
      return qso.antenna
    } else {
      return GLOBAL?.t?.('screens.opLoggingTab.antennaLabel', 'Antenna') || 'Antenna'
    }
  },
  accessibilityLabel: GLOBAL?.t?.('screens.opLoggingTab.antennaControls-a11y', 'Antenna Controls') || 'Antenna Controls',
  InputComponent: AntennaControl,
  inputWidthMultiplier: 30,
  optionType: 'optional'
}
