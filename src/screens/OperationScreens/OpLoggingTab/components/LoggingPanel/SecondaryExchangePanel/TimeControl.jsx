import React, { useEffect, useRef } from 'react'
import { View } from 'react-native'
import { useDispatch } from 'react-redux'

import TimeChip from '../../../../components/TimeChip'
import { TimeInput } from '../../../../../components/TimeInput'
import { DateInput } from '../../../../../components/DateInput'
import { setOperationData } from '../../../../../../store/operations'
import ThemedButton from '../../../../../components/ThemedButton'

const TimeControlInputs = ({ qso, operation, settings, disabled, icon, style, styles, themeColor, handleFieldChange, onSubmitEditing, focusedRef }) => {
  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 0) }, [])

  const dispatch = useDispatch()

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
        onSubmitEditing={onSubmitEditing}
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
        onSubmitEditing={onSubmitEditing}
        fieldId={'date'}
        focusedRef={focusedRef}
      />
      {qso?._isNew && operation._nextManualTime && (
        <View flexDirection="column" alignItems={'center'} justifyContent={'center'}>
          <ThemedButton
            themeColor="tertiaryLighter"
            mode="contained"
            icon={'play'}
            onPress={(value) => {
              handleFieldChange({ fieldId: 'time', value: undefined })
              dispatch(setOperationData({ uuid: operation.uuid, _nextManualTime: undefined }))
              ref.current?.blur()
            }}
          >
            Back to now
          </ThemedButton>
        </View>
      )}
    </View>
  )
}

export const timeControl = {
  key: 'time',
  icon: 'clock-outline',
  order: 0,
  LabelComponent: (props) => {
    if (props.operation?._nextManualTime) {
      return (
        <TimeChip {...props} icon={'pause'} time={props?.qso?.startOnMillis} />
      )
    } else {
      return (
        <TimeChip {...props} time={props?.qso?.startOnMillis} />
      )
    }
  },
  InputComponent: TimeControlInputs,
  optionType: 'mandatory'
}
