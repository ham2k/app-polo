import React, { useEffect, useRef } from 'react'
import { View } from 'react-native'

import TimeChip from '../../../../components/TimeChip'
import { TimeInput } from '../../../../../components/TimeInput'
import { DateInput } from '../../../../../components/DateInput'

const TimeControlInputs = ({ qso, operation, settings, disabled, icon, style, styles, themeColor, handleFieldChange, handleSubmit, focusedRef }) => {
  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 0) }, [])

  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }}>
      <TimeInput
        innerRef={ref}
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

export const timeControl = {
  key: 'time',
  icon: 'clock-outline',
  order: 0,
  LabelComponent: (props) => (
    <TimeChip {...props} time={props?.qso?.startOnMillis} />
  ),
  InputComponent: TimeControlInputs,
  optionType: 'mandatory'
}
