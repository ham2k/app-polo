import React, { useEffect, useRef } from 'react'
import { View } from 'react-native'

import ThemedTextInput from '../../../../../components/ThemedTextInput'

const NotesControlInputs = ({ qso, operation, settings, disabled, icon, style, styles, themeColor, handleFieldChange, handleSubmit, focusedRef }) => {
  const ref = useRef()
  useEffect(() => {
    ref?.current?.focus()
  }, [])

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
        onSubmitEditing={handleSubmit}
        fieldId={'notes'}
        focusedRef={focusedRef}
      />
    </View>
  )
}
export const notesControl = {
  key: 'notes',
  icon: 'note-outline',
  order: 99,
  label: ({ qso, operation, settings }) => 'Notes',
  InputComponent: NotesControlInputs
}
