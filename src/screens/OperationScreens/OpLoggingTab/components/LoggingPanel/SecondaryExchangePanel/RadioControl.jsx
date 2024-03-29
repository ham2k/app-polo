import React, { useEffect, useRef } from 'react'
import { View } from 'react-native'

import ThemedDropDown from '../../../../../components/ThemedDropDown'
import FrequencyInput from '../../../../../components/FrequencyInput'
import { fmtFreqInMHz } from '../../../../../../tools/frequencyFormats'

const RadioControlInputs = ({ qso, operation, settings, disabled, icon, style, styles, themeColor, handleFieldChange, handleSubmit, focusedRef }) => {
  const ref = useRef()

  useEffect(() => {
    setTimeout(() => {
      ref?.current?.focus()
    }, 0)
  }, [])

  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace, maxWidth: styles.oneSpace * 44 }}>
      <ThemedDropDown
        label="Band"
        themeColor={themeColor}
        value={qso?._isNew ? (qso?.band ?? operation?.band ?? '') : (qso?.band ?? '') }
        onChange={handleFieldChange}
        disabled={disabled}
        dropDownContainerMaxHeight={styles.oneSpace * 19}
        fieldId={'band'}
        style={{ flex: 3 }}
        list={[
          { value: '160m', label: '160m' },
          { value: '80m', label: '80m' },
          { value: '60m', label: '60m' },
          { value: '40m', label: '40m' },
          { value: '30m', label: '30m' },
          { value: '20m', label: '20m' },
          { value: '17m', label: '17m' },
          { value: '15m', label: '15m' },
          { value: '12m', label: '12m' },
          { value: '10m', label: '10m' },
          { value: '6m', label: '6m' },
          { value: '4m', label: '4m' },
          { value: '2m', label: '2m' },
          { value: '1.25m', label: '1.25m' },
          { value: '70cm', label: '70cm' },
          { value: 'other', label: 'Other' }
        ]}
      />
      <FrequencyInput
        innerRef={ref}
        themeColor={themeColor}
        style={{ flex: 8 }}
        value={qso?._isNew ? (qso?.freq ?? operation?.freq ?? '') : (qso?.freq ?? '') }
        disabled={disabled}
        label="Frequency"
        placeholder=""
        onChange={handleFieldChange}
        onSubmitEditing={handleSubmit}
        fieldId={'freq'}
        focusedRef={focusedRef}
      />
      <ThemedDropDown
        label="Mode"
        value={qso?._isNew ? (qso?.mode ?? operation?.mode ?? '') : (qso?.mode ?? '') }
        onChange={handleFieldChange}
        disabled={disabled}
        dropDownContainerMaxHeight={styles.oneSpace * 19}
        fieldId={'mode'}
        style={{ flex: 3 }}
        list={[
          { value: 'SSB', label: 'SSB' },
          { value: 'CW', label: 'CW' },
          { value: 'FM', label: 'FM' },
          { value: 'AM', label: 'AM' },
          { value: 'FT8', label: 'FT8' },
          { value: 'FT4', label: 'FT4' },
          { value: 'RTTY', label: 'RTTY' }
        ]}
      />
    </View>
  )
}

export const radioControl = {
  key: 'radio',
  icon: 'radio',
  order: 1,
  label: ({ qso, operation, settings }) => {
    const parts = []
    if (qso?.freq ?? operation.freq) {
      parts.push(`${fmtFreqInMHz(qso?.freq ?? operation.freq)} MHz`)
    } else if (qso?.band ?? operation.band) {
      parts.push(`${qso?.band ?? operation.band}`)
    } else {
      parts.push('Band???')
    }

    parts.push(`${qso?.mode ?? operation.mode ?? 'SSB'}`)
    return parts.join(' • ')
  },
  InputComponent: RadioControlInputs,
  inputWidthMultiplier: 43,
  optionType: 'mandatory'
}
