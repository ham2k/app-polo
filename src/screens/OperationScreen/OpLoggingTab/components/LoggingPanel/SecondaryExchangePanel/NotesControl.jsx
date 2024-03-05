import React from 'react'
import { View } from 'react-native'

import ThemedTextInput from '../../../../../components/ThemedTextInput'

export const notesControl = {
  key: 'notes',
  icon: 'note-outline',
  order: 99,
  label: ({ qso, operation, settings }) => 'Notes',
  inputComponent: ({ qso, operation, settings, disabled, icon, style, styles, themeColor, handleFieldChange, handleSubmit, focusedRef }) => (
    <View style={{ flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }}>
      <ThemedTextInput
        themeColor={themeColor}
        style={[styles.input, { minWidth: styles.oneSpace * 20 }]}
        value={qso?.notes ?? ''}
        disabled={disabled}
        label="Notes"
        placeholder=""
        onChange={handleFieldChange}
        onSubmitEditing={handleSubmit}
        fieldId={'notes'}
        focusedRef={focusedRef}
      />
    </View>
  )
}
