import React from 'react'
import { View } from 'react-native'

import TimeChip from '../../../../components/TimeChip'
import { TimeInput } from '../../../../../components/TimeInput'
import { DateInput } from '../../../../../components/DateInput'

export const timeControl = {
  key: 'time',
  icon: 'clock-outline',
  order: 0,
  labelComponent: ({ qso, operation, settings, icon, style, styles, themeColor, selected, onChange }) => (
    <TimeChip time={qso?.startOnMillis} icon={icon} style={style} styles={styles} themeColor={themeColor}
      selected={selected} onChange={onChange}
    />
  ),
  inputComponent: ({ qso, operation, settings, disabled, icon, style, styles, themeColor, handleFieldChange, handleSubmit, focusedRef }) => (
    <View style={{ flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }}>
      <TimeInput
        themeColor={themeColor}
        style={{ minWidth: styles.oneSpace * 11 }}
        valueInMillis={qso?.startOnMillis}
        disabled={disabled}
        label="Time"
        onChange={handleFieldChange}
        onSubmitEditing={handleSubmit}
        fieldId={'time'}
        focusedRef={focusedRef}
      />
      <DateInput
        themeColor={themeColor}
        style={{ minWidth: styles.oneSpace * 11 }}
        valueInMillis={qso?.startOnMillis}
        disabled={disabled}
        label="Date"
        onChange={handleFieldChange}
        onSubmitEditing={handleSubmit}
        fieldId={'date'}
        focusedRef={focusedRef}
      />
    </View>
  )
}
