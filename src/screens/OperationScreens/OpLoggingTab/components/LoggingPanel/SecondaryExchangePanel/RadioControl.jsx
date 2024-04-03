import React, { useEffect, useMemo, useRef } from 'react'
import { View } from 'react-native'

import ThemedDropDown from '../../../../../components/ThemedDropDown'
import FrequencyInput from '../../../../../components/FrequencyInput'
import { fmtFreqInMHz } from '../../../../../../tools/frequencyFormats'
import { ADIF_MODES_AND_SUBMODES, BANDS, POPULAR_BANDS, POPULAR_MODES } from '@ham2k/lib-operation-data'

const RadioControlInputs = ({ qso, operation, settings, disabled, icon, style, styles, themeColor, handleFieldChange, handleSubmit, focusedRef }) => {
  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 0) }, [])

  const bandOptions = useMemo(() => {
    const options = [...settings?.bands || POPULAR_BANDS]
    if (!options.includes(qso?.band)) options.push(qso?.band)
    if (!options.includes(operation?.band)) options.push(operation?.band)
    options.sort((a, b) => BANDS.indexOf(a) - BANDS.indexOf(b))
    if (!options.includes('other')) options.concat(['other'])

    return options.map(band => ({ value: band, label: band }))
  }, [operation?.band, qso?.band, settings?.bands])

  const modeOptions = useMemo(() => {
    const options = [...settings?.modes || POPULAR_MODES]
    if (!options.includes(qso?.mode)) options.push(qso?.mode)
    if (!options.includes(operation?.mode)) options.push(operation?.mode)
    options.sort((a, b) => (POPULAR_MODES.indexOf(a) ?? (ADIF_MODES_AND_SUBMODES.index(a) + 100)) - (POPULAR_MODES.indexOf(b) ?? (ADIF_MODES_AND_SUBMODES.index(b) + 100)))
    if (!options.includes('other')) options.concat(['other'])

    return options.map(mode => ({ value: mode, label: mode }))
  }, [operation?.mode, qso?.mode, settings?.modes])

  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }}>
      <ThemedDropDown
        label="Band"
        themeColor={themeColor}
        value={qso?._isNew ? (qso?.band ?? operation?.band ?? '') : (qso?.band ?? '') }
        onChange={handleFieldChange}
        disabled={disabled}
        dropDownContainerMaxHeight={styles.oneSpace * 19}
        fieldId={'band'}
        style={{ width: styles.oneSpace * (styles.size === 'xs' ? 13 : 15) }}
        list={bandOptions}
      />
      <FrequencyInput
        innerRef={ref}
        themeColor={themeColor}
        style={{ width: styles.oneSpace * (styles.size === 'xs' ? 10 : 11) }}
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
        style={{ width: styles.oneSpace * (styles.size === 'xs' ? 12 : 14) }}
        list={modeOptions}
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
