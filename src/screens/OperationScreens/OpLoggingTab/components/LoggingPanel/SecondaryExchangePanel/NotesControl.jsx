import React, { useEffect, useRef } from 'react'
import { View } from 'react-native'

import ThemedTextInput from '../../../../../components/ThemedTextInput'

const NotesControlInputs = ({ qso, operation, settings, disabled, icon, style, styles, themeColor, handleFieldChange, handleSubmit, focusedRef }) => {
  const ref = useRef()

  useEffect(() => {
    setTimeout(() => {
      ref?.current?.focus()
    }, 0)
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
