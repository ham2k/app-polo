/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useRef } from 'react'
import { View } from 'react-native'

import ThemedTextInput from '../../../../../components/ThemedTextInput'

const NotesControlInputs = ({ qso, operation, settings, disabled, icon, style, styles, themeColor, handleFieldChange, onSubmitEditing, focusedRef }) => {
  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 0) }, [])

  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }}>
      <ThemedTextInput
        innerRef={ref}
        themeColor={themeColor}
        style={[styles.input, { minWidth: styles.oneSpace * 20 }]}
        value={qso?.notes ?? ''}
        disabled={disabled}
        label="Notes"
        placeholder=""
        onChange={handleFieldChange}
        onSubmitEditing={onSubmitEditing}
        fieldId={'notes'}
        focusedRef={focusedRef}
        keyboard="dumb"
      />
    </View>
  )
}
export const notesControl = {
  key: 'notes',
  icon: 'note-outline',
  order: 99,
  label: ({ qso, operation, settings }) => {
    const parts = ['Notes']
    if (qso?.notes) parts.unshift('✓')
    return parts.join(' ')
  },
  InputComponent: NotesControlInputs,
  inputWidthMultiplier: 20,
  optionType: 'optional'
}
