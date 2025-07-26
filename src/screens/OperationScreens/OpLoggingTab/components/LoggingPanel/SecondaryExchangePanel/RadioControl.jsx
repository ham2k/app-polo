/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useMemo, useRef } from 'react'
import { View } from 'react-native'

import { ADIF_MODES_AND_SUBMODES, BANDS, POPULAR_BANDS, POPULAR_MODES } from '@ham2k/lib-operation-data'

import { fmtFreqInMHz } from '../../../../../../tools/frequencyFormats'
import { H2kDropDown, H2kFrequencyInput } from '../../../../../../ui'

const RadioControlInputs = ({ qso, operation, vfo, settings, disabled, icon, style, styles, themeColor, handleFieldChange, onSubmitEditing, focusedRef }) => {
  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 200) }, [])

  const bandOptions = useMemo(() => {
    const options = [...settings?.bands || POPULAR_BANDS]
    if (!options.includes(qso?.band)) options.push(qso?.band)
    if (!options.includes(vfo?.band)) options.push(vfo?.band)
    options.sort((a, b) => BANDS.indexOf(a) - BANDS.indexOf(b))
    if (!options.includes('other')) options.concat(['other'])

    return options.filter(x => x).map(band => ({ value: band, label: band }))
  }, [vfo?.band, qso?.band, settings?.bands])

  const modeOptions = useMemo(() => {
    const options = [...settings?.modes || POPULAR_MODES]
    if (!options.includes(qso?.mode)) options.push(qso?.mode)
    if (!options.includes(vfo?.mode)) options.push(vfo?.mode)
    options.sort((a, b) => (POPULAR_MODES.indexOf(a) ?? (ADIF_MODES_AND_SUBMODES.index(a) + 100)) - (POPULAR_MODES.indexOf(b) ?? (ADIF_MODES_AND_SUBMODES.index(b) + 100)))
    if (!options.includes('other')) options.concat(['other'])

    return options.filter(x => x).map(mode => ({ value: mode, label: mode }))
  }, [vfo?.mode, qso?.mode, settings?.modes])

  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }}>
      <H2kDropDown
        label="Band"
        themeColor={themeColor}
        value={qso?._isNew ? (qso?.band ?? vfo?.band ?? '') : (qso?.band ?? '') }
        onChange={handleFieldChange}
        disabled={disabled}
        dropDownContainerMaxHeight={styles.oneSpace * 19}
        fieldId={'band'}
        style={{ width: styles.oneSpace * (styles.size === 'xs' ? 13 : 15) }}
        options={bandOptions}
      />
      <H2kFrequencyInput
        innerRef={ref}
        themeColor={themeColor}
        style={{ width: styles.oneSpace * (styles.size === 'xs' ? 10 : 11) }}
        value={qso?._isNew ? (qso?.freq ?? vfo?.freq ?? '') : (qso?.freq ?? '') }
        disabled={disabled}
        label="Frequency"
        placeholder=""
        onChange={handleFieldChange}
        onSubmitEditing={onSubmitEditing}
        fieldId={'freq'}
        focusedRef={focusedRef}
      />
      <H2kDropDown
        label="Mode"
        value={qso?._isNew ? (qso?.mode ?? vfo?.mode ?? '') : (qso?.mode ?? '') }
        onChange={handleFieldChange}
        disabled={disabled}
        dropDownContainerMaxHeight={styles.oneSpace * 19}
        fieldId={'mode'}
        style={{ width: styles.oneSpace * (styles.size === 'xs' ? 12 : 14) }}
        options={modeOptions}
      />
    </View>
  )
}

export const radioControl = {
  key: 'radio',
  icon: 'radio',
  order: 1,
  label: ({ qso, operation, vfo, settings }) => {
    const parts = []
    if (qso?.freq ?? vfo?.freq) {
      parts.push(`${fmtFreqInMHz(qso?.freq ?? vfo?.freq)} MHz`)
    } else if (qso?.band ?? operation?.local?.band) {
      parts.push(`${qso?.band ?? operation?.local?.band}`)
    } else {
      parts.push('Band???')
    }

    parts.push(`${qso?.mode ?? vfo?.mode ?? 'SSB'}`)
    return parts.join(' • ')
  },
  accessibilityLabel: ({ qso, operation, vfo, settings }) => {
    const parts = []
    if (qso?.freq ?? vfo?.freq) {
      parts.push(`${fmtFreqInMHz(qso?.freq ?? vfo?.freq)} MHz`)
    } else if (qso?.band ?? operation?.local?.band) {
      parts.push(`${qso?.band ?? operation?.local?.band}`)
    } else {
      parts.push('Band???')
    }

    parts.push(`${qso?.mode ?? vfo?.mode ?? 'SSB'}`)
    return `Radio Controls, ${parts.join(', ')}`
  },
  InputComponent: RadioControlInputs,
  inputWidthMultiplier: 43,
  optionType: 'mandatory'
}
