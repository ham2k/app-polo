/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useRef } from 'react'
import { View } from 'react-native'

import ThemedTextInput from '../../../../../components/ThemedTextInput'

const TxPowerInputs = ({ qso, operation, settings, disabled, icon, style, styles, themeColor, handleFieldChange, onSubmitEditing, focusedRef }) => {
  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 0) }, [])

  const handleOnChange = (event) => {
    const value = event?.value || event?.nativeEvent?.text
    const digits = [...value].filter(c => c >= '0' && c <= '9').join('')

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
        style={[styles.input, { minWidth: styles.oneSpace * 20, width: '100%' }]}
        value={qso?.txPwr ?? ''}
        disabled={disabled}
        label="Power"
        placeholder=""
        onChange={handleOnChange}
        onSubmitEditing={onSubmitEditing}
        fieldId={'txPwr'}
        focusedRef={focusedRef}
        keyboard="dumb"
      />
    </View>
  )
}
export const powerControl = {
  key: 'txpwr',
  icon: 'lightning-bolt-outline',
  order: 100,
  label: ({ qso, operation, settings }) => {
    const parts = ['Power']
    if (qso?.twpwer) parts.unshift('✓')
    return parts.join(' ')
  },
  InputComponent: TxPowerInputs,
  inputWidthMultiplier: 40,
  optionType: 'optional'
}
