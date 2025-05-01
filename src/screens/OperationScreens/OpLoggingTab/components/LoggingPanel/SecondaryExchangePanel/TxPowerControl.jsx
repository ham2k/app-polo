/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useRef } from 'react'
import { View } from 'react-native'

import ThemedTextInput from '../../../../../components/ThemedTextInput'
import { fmtNumber } from '@ham2k/lib-format-tools'

const TxPowerControl = ({ qso, operation, settings, disabled, icon, style, styles, themeColor, handleFieldChange, onSubmitEditing, focusedRef }) => {
  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 200) }, [])

  const handleOnChange = (event) => {
    const value = event?.value || event?.nativeEvent?.text
    const digits = Number.parseFloat(value)

    handleFieldChange({
      ...event,
      value: digits
    })
  }

  return (
    <View style={[style, { flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }]}>
      <ThemedTextInput
        innerRef={ref}
        themeColor={themeColor}
        style={[styles.input, { minWidth: styles.oneSpace * 10, width: '100%' }]}
        value={qso?.power ?? ''}
        disabled={disabled}
        label="Power"
        placeholder=""
        onChange={handleOnChange}
        onSubmitEditing={onSubmitEditing}
        fieldId={'power'}
        focusedRef={focusedRef}
        keyboard="dumb"
      />
    </View>
  )
}
export const powerControl = {
  key: 'power',
  icon: 'lightning-bolt',
  order: 2,
  label: ({ qso, operation, settings }) => {
    if (qso?.power) {
      return fmtNumber(qso.power, 0) + 'W'
    } else {
      return 'Power'
    }
  },
  accessibilityLabel: 'Power Controls',
  InputComponent: TxPowerControl,
  inputWidthMultiplier: 10,
  optionType: 'optional'
}
