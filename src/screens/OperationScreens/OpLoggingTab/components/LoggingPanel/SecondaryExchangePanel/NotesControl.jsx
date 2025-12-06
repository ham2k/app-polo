/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useRef } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { H2kTextInput } from '../../../../../../ui'

const NotesControlInputs = ({ qso, operation, settings, disabled, icon, style, styles, themeColor, handleFieldChange, onSubmitEditing, focusedRef }) => {
  const { t } = useTranslation()

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 200) }, [])

  return (
    <View style={[style, { flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }]}>
      <H2kTextInput
        innerRef={ref}
        themeColor={themeColor}
        style={[styles.input, { minWidth: styles.oneSpace * 20, width: '100%' }]}
        value={qso?.notes ?? ''}
        disabled={disabled}
        label={t('screens.opLoggingTab.notesLabel', 'Notes')}
        placeholder=""
        onChange={handleFieldChange}
        onSubmitEditing={onSubmitEditing}
        fieldId={'notes'}
        focusedRef={focusedRef}
        keyboard="normal"
      />
    </View>
  )
}
export const notesControl = {
  key: 'notes',
  icon: 'note-outline',
  order: 99,
  label: ({ t, qso, operation, settings }) => {
    const parts = [t('screens.opLoggingTab.notesLabel', 'Notes')]
    if (qso?.notes) parts.unshift('✓')
    return parts.join(' ')
  },
  accessibilityLabel: ({ t }) => t('screens.opLoggingTab.notesLabel-ally', 'Notes'),
  InputComponent: NotesControlInputs,
  inputWidthMultiplier: 40,
  optionType: 'optional'
}
